import {
	PAIR_NOTICE_COOLDOWN_MS,
	getHandleCompareKey,
	getLang,
	isChannelId,
	sanitizeHandle,
	t,
	type ApiConfigLike,
	type BlockItem,
	type PairRecord,
	type PairLookupStage,
	type PairLookupMethod,
	type PairRunItem,
	type PairRunStats,
	type PairStoreLike,
	type SettingsLike,
	type StorageLike
} from './02-utils-i18n.ts';

const PAIR_LOOKUP_CONCURRENCY = 8;
const PAIR_LOOKUP_CACHE_LIMIT = 256;
const PAIR_LOOKUP_TIMEOUT_MS = 15000;

	/* ----------------------------------------------------------
	 * 6. Pair resolution and policy
	 * ---------------------------------------------------------- */
	export class PairService {
		[key: string]: any;
		constructor(storage: StorageLike, pairStore: PairStoreLike, apiConfig: ApiConfigLike, settings: SettingsLike, logger: any = null) {
			this.storage = storage;
			this.pairStore = pairStore;
			this.apiConfig = apiConfig;
			this.settings = settings;
			this.logger = logger;
			this._busy = false;
			this._idlePromise = null;
			this._lookupCache = new Map();
			this._activeLookups = 0;
			this._lookupWaiters = [];
			this._lookupTimeoutMs = PAIR_LOOKUP_TIMEOUT_MS;
		}
		getBlockedHandles() {
			return this.storage.all().filter((item: BlockItem) => item.type === 'handle').map((item: BlockItem) => item.value);
		}
		getBlockedIdSet(items: BlockItem[] = this.storage.all()): Set<string> {
			return new Set((items || []).filter((item: BlockItem) => item.type === 'id').map((item: BlockItem) => item.value));
		}
		hasBlockedId(ucid: any, blockedIds: Set<string> | null = null): boolean {
			return blockedIds ? blockedIds.has(ucid) : this.storage.all().some((item: BlockItem) => item.type === 'id' && item.value === ucid);
		}
		_ucidUsedByOtherPair(ucid: any, excludedHandles: any[] = []): boolean {
			if (!isChannelId(ucid)) return false;
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			const excluded = new Set((excludedHandles || [])
				.map(handle => getHandleCompareKey(handle, caseSensitive))
				.filter(Boolean));
			return this.pairStore.allPairs().some((pair: PairRecord) =>
				pair.ucid === ucid && !excluded.has(getHandleCompareKey(pair.handle, caseSensitive))
			);
		}
		getHandleStatus(handle: any, blockedIds: Set<string> | null = null) {
			const pair = this.pairStore.getPair(handle);
			if (!pair) return { code: 'handle-only', pair: null };
			if (pair.status === 'mismatch') return { code: 'mismatch', pair };
			if (pair.status === 'unverified' || !pair.ucid) return { code: 'unverified', pair };
			if (!this.hasBlockedId(pair.ucid, blockedIds)) return { code: 'handle-only', pair };
			if (pair.status === 'stale') return { code: 'stale', pair };
			return { code: 'paired', pair };
		}
		getSummary() {
			this.pairStore.refreshStatuses();
			const revision = `${this.storage._revision}:${this.pairStore._revision}:${this.settings?.isHandleCaseSensitive?.()}`;
			const cacheable = this.storage._revision !== undefined && this.pairStore._revision !== undefined;
			if (cacheable && this._summaryRevision === revision) return { ...this._summaryCache };
			const allItems = this.storage.all();
			const blockedIds = this.getBlockedIdSet(allItems);
			const summary = {
				handles: 0,
				paired: 0,
				handleOnly: 0,
				stale: 0,
				mismatch: 0,
				unverified: 0,
				pairNeeded: 0
			};
			for (const handle of allItems.filter((item: BlockItem) => item.type === 'handle').map((item: BlockItem) => item.value)) {
				summary.handles += 1;
				const status = this.getHandleStatus(handle, blockedIds).code;
				if (status === 'paired') summary.paired += 1;
				else if (status === 'stale') summary.stale += 1;
				else if (status === 'mismatch') summary.mismatch += 1;
				else if (status === 'unverified') summary.unverified += 1;
				else summary.handleOnly += 1;
			}
			summary.pairNeeded = summary.handleOnly + summary.unverified;
			if (cacheable) {
				this._summaryRevision = revision;
				this._summaryCache = summary;
			}
			return summary;
		}
		shouldNotify(summary = this.getSummary()) {
			if (!this.pairStore.isUcidDetectionEnabled()) return false;
			if (!summary.stale && !summary.mismatch) return false;
			const lastCheckAt = this.pairStore.getLastPairCheckAt();
			if (lastCheckAt && (Date.now() - lastCheckAt) < PAIR_NOTICE_COOLDOWN_MS) return false;
			const dismissedAt = this.pairStore.getNotificationDismissedAt();
			return !dismissedAt || (Date.now() - dismissedAt) >= PAIR_NOTICE_COOLDOWN_MS;
		}
		dismissNotification() {
			this.pairStore.dismissNotification();
		}
		removeHandleArtifacts(handle: any) {
			const pair = this.pairStore.getPair(handle);
			if (pair?.ucid && !this._ucidUsedByOtherPair(pair.ucid, [handle])) {
				this.storage.remove({ type: 'id', value: pair.ucid });
			}
			this.pairStore.removePair(handle);
		}
		collectHandleArtifactIds(handles: any[]): Set<string> {
			const ids = new Set<string>();
			const excludedHandles = handles || [];
			for (const handle of handles || []) {
				const pair = this.pairStore.getPair(handle);
				if (pair?.ucid && !this._ucidUsedByOtherPair(pair.ucid, excludedHandles)) ids.add(pair.ucid);
			}
			return ids;
		}
		removeHandlePairs(handles: any[]) {
			this.pairStore.removePairs(handles || []);
		}
		clearPairArtifacts() {
			this.pairStore.clearPairs();
		}
		async createMissingPairs(options: any = {}) {
			const handles = this.getBlockedHandles().filter((handle: string) => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(handles, options);
		}
		async createPairsForHandles(handles: any[], { automatic = false, stage = 'create', signal = null }: { automatic?: boolean; stage?: 'create' | 'onBlock'; signal?: AbortSignal | null } = {}) {
			const filtered = (handles || []).filter(handle => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(filtered, { automatic, stage, signal });
		}
		_shouldRefreshHandle(handle: any, { includeMissing = true } = {}) {
			const existing = this.pairStore.getPair(handle);
			const intervalSeconds = this.settings?.getPairRefreshIntervalSeconds?.() ?? 600;
			if (existing?.verifiedAt && intervalSeconds > 0 && Date.now() - existing.verifiedAt < intervalSeconds * 1000) return false;
			const status = this.getHandleStatus(handle).code;
			if (status === 'paired') return true;
			if (status === 'handle-only') return includeMissing;
			return status === 'stale' || status === 'mismatch' || status === 'unverified';
		}
		async updatePairs({ includeMissing = true, signal = null }: { includeMissing?: boolean; signal?: AbortSignal | null } = {}): Promise<PairRunStats> {
			const handles: string[] = [];
			const skipped: PairRunItem[] = [];
			for (const handle of this.getBlockedHandles()) {
				const hasPair = !!this.pairStore.getPair(handle);
				if (!includeMissing && !hasPair) continue;
				if (this._shouldRefreshHandle(handle, { includeMissing })) handles.push(handle);
				else skipped.push({
					handle,
					outcome: 'skipped',
					message: t('pairSkippedFresh')
				});
			}
			if (!handles.length) {
				return {
					created: 0,
					refreshed: 0,
					mismatches: 0,
					failed: 0,
					addedIds: 0,
					skipped: skipped.length,
					items: skipped
				};
			}
			const stats = await this._processHandles(handles, { update: true, signal });
			stats.skipped += skipped.length;
			stats.items.push(...skipped);
			return stats;
		}
		async updatePairsForHandles(handles: any[], { signal = null }: { signal?: AbortSignal | null } = {}) {
			return this._processHandles(handles || [], { update: true, signal });
		}
		_lookupError(code: 'timeout' | 'cancelled', cause?: unknown) {
			const error = new Error(code === 'timeout' ? t('pairLookupTimeout') : t('pairLookupCancelled'), { cause });
			(error as any).code = code;
			return error;
		}
		async _fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, signal: AbortSignal | null = null) {
			if (signal?.aborted) throw this._lookupError('cancelled');
			let timer: ReturnType<typeof setTimeout> | null = null;
			let timedOut = false;
			let controller: AbortController | null = null;
			let removeAbortListener = () => {};
			let requestSignal = signal || undefined;
			if (typeof AbortController !== 'undefined') {
				controller = new AbortController();
				requestSignal = controller.signal;
				const abort = () => controller?.abort();
				if (signal) {
					signal.addEventListener('abort', abort, { once: true });
					removeAbortListener = () => signal.removeEventListener('abort', abort);
				}
			}
			const request = fetch(input, { ...init, ...(requestSignal ? { signal: requestSignal } : {}) });
			const timeout = new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					timedOut = true;
					controller?.abort();
					reject(this._lookupError('timeout'));
				}, this._lookupTimeoutMs);
			});
			try {
				return await Promise.race([request, timeout]);
			} catch (error) {
				if ((error as any)?.code) throw error;
				if (timedOut) throw this._lookupError('timeout', error);
				if (signal?.aborted) throw this._lookupError('cancelled', error);
				throw error;
			} finally {
				if (timer) clearTimeout(timer);
				removeAbortListener();
			}
		}
		async _readResponseBody(response: Response, method: 'text' | 'json', signal: AbortSignal | null = null) {
			if (signal?.aborted) throw this._lookupError('cancelled');
			let timer: ReturnType<typeof setTimeout> | null = null;
			let timedOut = false;
			let removeAbortListener = () => {};
			let rejectCancelled: ((reason: unknown) => void) | null = null;
			const cancelled = new Promise<never>((_, reject) => { rejectCancelled = reject; });
			if (signal) {
				const abort = () => {
					void response.body?.cancel?.();
					rejectCancelled?.(this._lookupError('cancelled'));
				};
				signal.addEventListener('abort', abort, { once: true });
				removeAbortListener = () => signal.removeEventListener('abort', abort);
			}
			const body = response[method]();
			const timeout = new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					timedOut = true;
					void response.body?.cancel?.();
					reject(this._lookupError('timeout'));
				}, this._lookupTimeoutMs);
			});
			try {
				return await Promise.race([body, timeout, cancelled]);
			} catch (error) {
				if ((error as any)?.code) throw error;
				if (timedOut) throw this._lookupError('timeout', error);
				if (signal?.aborted) throw this._lookupError('cancelled', error);
				throw error;
			} finally {
				if (timer) clearTimeout(timer);
				removeAbortListener();
			}
		}
		async _withLookupSlot<T>(lookup: () => Promise<T>, signal: AbortSignal | null = null): Promise<T> {
			while (this._activeLookups >= (this.settings?.isLowPerformanceMode?.() ? 1 : PAIR_LOOKUP_CONCURRENCY)) {
				if (signal?.aborted) throw this._lookupError('cancelled');
				await new Promise<void>((resolve, reject) => {
					let removeAbortListener = () => {};
					const resume = () => { removeAbortListener(); resolve(); };
					if (signal) {
						const abort = () => { removeAbortListener(); reject(this._lookupError('cancelled')); };
						signal.addEventListener('abort', abort, { once: true });
						removeAbortListener = () => signal.removeEventListener('abort', abort);
					}
					this._lookupWaiters.push(resume);
				});
			}
			if (signal?.aborted) throw this._lookupError('cancelled');
			this._activeLookups++;
			try { return await lookup(); }
			finally {
				this._activeLookups--;
				for (const resume of this._lookupWaiters.splice(0)) resume();
			}
		}
		_recordPersistenceFailure(stats: PairRunStats, handle: string | null, error: unknown) {
			stats.persistenceFailures = (stats.persistenceFailures || 0) + 1;
			stats.failed += 1;
			if (handle) stats.items.push({ handle, outcome: 'failed', message: error instanceof Error ? error.message : String(error) });
		}
		_recordRollbackFailure(stats: PairRunStats, error: unknown) {
			stats.persistenceFailures = (stats.persistenceFailures || 0) + 1;
			this.logger?.warn?.('Pair rollback failed', { error: error instanceof Error ? error.message : String(error) });
		}
		_saveResolvedPair(stats: PairRunStats, handle: string, existing: PairRecord | null, next: PairRecord, pairRevision: string | undefined, ruleRevision: string | undefined) {
			if (!this.storage.refreshFromStorage() || !this.pairStore.refreshFromStorage()) {
				this._recordPersistenceFailure(stats, handle, 'Unable to refresh pairing storage.');
				return false;
			}
			const key = getHandleCompareKey(handle, this.settings.isHandleCaseSensitive()) || '';
			const current = this.pairStore.getPair(handle);
			if (!this.getBlockedHandles().some((value: string) => getHandleCompareKey(value, this.settings.isHandleCaseSensitive()) === key)
				|| JSON.stringify(this.pairStore._pairEntries[key]) !== pairRevision
				|| JSON.stringify(this.storage._entries['h:' + key]) !== ruleRevision
				|| JSON.stringify(current) !== JSON.stringify(existing)) {
				stats.skipped += 1;
				stats.items.push({ handle, outcome: 'skipped', message: t('pairChangedDuringLookup') });
				return false;
			}
			const nextKey = getHandleCompareKey(next.handle, this.settings.isHandleCaseSensitive()) || '';
			const destination = this.pairStore.getPair(next.handle);
			if (nextKey !== key && destination && destination.ucid !== next.ucid) throw new Error(t('pairHandleConflict'));
			const previousItems = this.storage.all();
			const nextItems = previousItems.map((item: BlockItem): BlockItem => item.type === 'handle' && getHandleCompareKey(item.value, this.settings.isHandleCaseSensitive()) === key ? { type: 'handle', value: next.handle } : item);
			const addedId = !this.hasBlockedId(next.ucid);
			if (addedId) nextItems.push({ type: 'id', value: next.ucid });
			const blockWrite = this.storage.setAllResult(nextItems);
			if (!blockWrite.ok) {
				this._recordPersistenceFailure(stats, handle, blockWrite.error || 'Block list could not be saved.');
				return false;
			}
			const touched = new Set(['h:' + key, 'h:' + nextKey, ...(addedId ? ['i:' + next.ucid] : [])]);
			const expected = new Map(Array.from(touched, (value: string) => [value, JSON.stringify(this.storage._entries[value])]));
			const pairWrite = this.pairStore.replacePair(handle, next);
			if (!pairWrite.ok) {
				const rollback = this.storage.restoreTouchedItems(previousItems, expected);
				if (!rollback.ok) this._recordRollbackFailure(stats, rollback.error);
				this._recordPersistenceFailure(stats, handle, pairWrite.error || 'Pair metadata could not be saved.');
				return false;
			}
			if (addedId) stats.addedIds += 1;
			return true;
		}
		async _processHandles(handles: any[], { update = false, automatic = false, stage = 'create', signal = null }: { update?: boolean; automatic?: boolean; stage?: 'create' | 'onBlock'; signal?: AbortSignal | null } = {}): Promise<PairRunStats> {
			while (this._busy) {
				if (signal?.aborted) throw this._lookupError('cancelled');
				if (!signal) await this._idlePromise;
				else await new Promise<void>((resolve, reject) => {
					const abort = () => { signal.removeEventListener('abort', abort); reject(this._lookupError('cancelled')); };
					signal.addEventListener('abort', abort, { once: true });
					this._idlePromise.then(() => { signal.removeEventListener('abort', abort); resolve(); });
				});
			}
			if (signal?.aborted) throw this._lookupError('cancelled');
			this._busy = true;
			let resolveIdle: () => void = () => {};
			this._idlePromise = new Promise<void>(resolve => { resolveIdle = resolve; });
			const stats: PairRunStats = { created: 0, refreshed: 0, mismatches: 0, failed: 0, addedIds: 0, skipped: 0, items: [], persistenceFailures: 0 };
			const uniqueHandles: string[] = [];
			const seen = new Set<string>();
			const caseSensitive = this.settings.isHandleCaseSensitive();
			for (const handle of handles || []) {
				const value = sanitizeHandle(handle);
				const key = getHandleCompareKey(value, caseSensitive);
				if (!value || !key || seen.has(key)) continue;
				seen.add(key);
				uniqueHandles.push(value);
			}
			try {
				let nextIndex = 0;
				const processNext = async (worker: number) => {
					while (nextIndex < uniqueHandles.length) {
						if (signal?.aborted || ((worker > 0 || automatic) && this.settings.isLowPerformanceMode())) return;
						const handle = uniqueHandles[nextIndex++];
						if (!this.storage.refreshFromStorage() || !this.pairStore.refreshFromStorage()) {
							this._recordPersistenceFailure(stats, handle, 'Unable to refresh pairing storage.');
							continue;
						}
						const existing = this.pairStore.getPair(handle);
						const key = getHandleCompareKey(handle, this.settings.isHandleCaseSensitive()) || '';
						if (!this.getBlockedHandles().some((value: string) => getHandleCompareKey(value, this.settings.isHandleCaseSensitive()) === key)
							|| (!update && ['paired', 'stale', 'mismatch'].includes(this.getHandleStatus(handle).code))) {
							stats.skipped += 1;
							stats.items.push({ handle, outcome: 'skipped', message: t('pairChangedDuringLookup') });
							continue;
						}
						const pairRevision = JSON.stringify(this.pairStore._pairEntries[key]);
						const ruleRevision = JSON.stringify(this.storage._entries['h:' + key]);
						try {
							const refresh = !!existing?.ucid;
							const resolved = await this._withLookupSlot(() => refresh
								? this.resolveUcidToHandle(existing.ucid, { force: true, signal })
								: this.resolveHandleToUcid(handle, { force: update, stage: update ? 'create' : stage, signal }), signal);
							if (signal?.aborted) throw this._lookupError('cancelled');
							const next: PairRecord = { handle: refresh ? resolved.handle : handle, ucid: refresh ? existing.ucid : resolved.ucid, verifiedAt: Date.now(), status: 'verified', source: resolved.source, lastResolvedUcid: resolved.ucid, lastError: null };
							if (!isChannelId(next.ucid) || !sanitizeHandle(next.handle) || (refresh && resolved.ucid !== existing.ucid)) throw new Error(t('pairLookupFailed'));
							if (!this._saveResolvedPair(stats, handle, existing, next, pairRevision, ruleRevision)) continue;
							if (existing?.ucid) stats.refreshed += 1;
							else stats.created += 1;
							stats.items.push({ handle, outcome: existing?.ucid ? 'updated' : 'created', ucid: next.ucid });
						} catch (error) {
							const code = (error as any)?.code;
							stats.failed += 1;
							stats.items.push({ handle, outcome: 'failed', ucid: existing?.ucid || undefined, message: error instanceof Error ? error.message : String(error), reason: code === 'timeout' || code === 'cancelled' ? code : 'network' });
							if (code === 'cancelled') return;
						}
					}
				};
				await Promise.all(Array.from({ length: Math.min(this.settings.isLowPerformanceMode() ? 1 : PAIR_LOOKUP_CONCURRENCY, uniqueHandles.length) }, (_: unknown, worker: number) => processNext(worker)));
				const order = new Map(uniqueHandles.map((handle, index) => [handle, index]));
				stats.items.sort((left, right) => (order.get(left.handle) ?? 0) - (order.get(right.handle) ?? 0));
			} finally {
				this._busy = false;
				this._idlePromise = null;
				resolveIdle();
				if (!automatic || stats.items.length) {
					const result = this.pairStore.setLastPairCheckAt(Date.now());
					if (!result.ok) this._recordPersistenceFailure(stats, null, result.error);
					const statuses = this.pairStore.refreshStatuses();
					if (!statuses.ok) this._recordPersistenceFailure(stats, null, statuses.error);
				}
			}
			return stats;
		}
		async testApiKey({ signal = null }: { signal?: AbortSignal | null } = {}) {
			const apiKey = this.apiConfig.getApiKey();
			if (!apiKey) {
				return {
					checkedAt: Date.now(),
					ok: false,
					category: 'invalid',
					httpStatus: null,
					message: t('apiKeyRequired')
				};
			}
			try {
				const url = new URL('https://www.googleapis.com/youtube/v3/channels');
				url.searchParams.set('part', 'id');
				url.searchParams.set('id', 'UC_x5XG1OV2P6uZZ5FSM9Ttw');
				url.searchParams.set('key', apiKey);
				url.searchParams.set('hl', getLang() === 'ko-kr' ? 'ko' : 'en');
				const response = await this._fetchWithTimeout(url.toString(), { cache: 'no-store', referrerPolicy: 'no-referrer' }, signal);
				let payload = null;
				try { payload = await this._readResponseBody(response, 'json', signal); } catch (error) { if ((error as any)?.code) throw error; }
				const reason = payload?.error?.errors?.[0]?.reason || '';
				const message = payload?.error?.message || (response.ok ? 'OK' : `${response.status}`);
				if (response.ok) {
					return {
						checkedAt: Date.now(),
						ok: true,
						category: 'ok',
						httpStatus: response.status,
						message: 'OK'
					};
				}
				const category = reason.includes('quota') || reason.includes('dailyLimit')
					? 'quota'
					: response.status === 400
						? 'invalid'
						: response.status === 403
							? 'forbidden'
							: 'unknown';
				return {
					checkedAt: Date.now(),
					ok: false,
					category,
					httpStatus: response.status,
					message
				};
			} catch (error) {
				return {
					checkedAt: Date.now(),
					ok: false,
					category: (error as any)?.code === 'timeout' || (error as any)?.code === 'cancelled' ? (error as any).code : 'network',
					httpStatus: null,
					message: error instanceof Error ? error.message : String(error)
				};
			}
		}
		async _resolveChannel(identifier: string, stage: PairLookupStage, force: boolean, signal: AbortSignal | null): Promise<{ ucid: string; handle: string; source: string }> {
			if (signal?.aborted) throw this._lookupError('cancelled');
			const method: PairLookupMethod = this.settings.getPairLookupMethod(stage);
			const signature = JSON.stringify([this.settings.getState().pairLookup, this.settings.getPairRefreshIntervalSeconds(), this.settings.isHandleCaseSensitive()]);
			const apiKey = this.apiConfig.getApiKey();
			if (signature !== this._lookupSignature || apiKey !== this._cachedApiKey) {
				this._lookupCache.clear(); this._lookupSignature = signature; this._cachedApiKey = apiKey;
			}
			const key = JSON.stringify([stage, method, stage === 'update' ? identifier : getHandleCompareKey(identifier, this.settings.isHandleCaseSensitive())]);
			const cached = this._lookupCache.get(key);
			const interval = this.settings.getPairRefreshIntervalSeconds();
			if (!force && cached && interval > 0 && Date.now() - cached.checkedAt < interval * 1000) return cached.result;
			let result;
			if (method !== 'api') {
				try { result = await this._resolveChannelFromPage(identifier, stage === 'update', signal); }
				catch (error) {
					if ((error as any)?.code === 'cancelled' || signal?.aborted) throw this._lookupError('cancelled', error);
					if (method !== 'page-api' || !apiKey) {
						const wrapped = new Error((error instanceof Error ? error.message : String(error)) + ' ' + t('handleLookupRetryWithApi'), { cause: error });
						if ((error as any)?.code) (wrapped as any).code = (error as any).code;
						throw wrapped;
					}
				}
			}
			if (!result) result = await this._resolveChannelFromApi(identifier, stage === 'update', signal);
			if (signal?.aborted) throw this._lookupError('cancelled');
			this._lookupCache.delete(key);
			this._lookupCache.set(key, { checkedAt: Date.now(), result });
			while (this._lookupCache.size > PAIR_LOOKUP_CACHE_LIMIT) this._lookupCache.delete(this._lookupCache.keys().next().value);
			return result;
		}
		async resolveHandleToUcid(handle: string, { force = false, stage = 'create', signal = null }: { force?: boolean; stage?: 'create' | 'onBlock'; signal?: AbortSignal | null } = {}) {
			const normalized = sanitizeHandle(handle);
			if (!normalized) throw new Error(t('pairLookupNoUcid'));
			return this._resolveChannel(normalized, stage, force, signal);
		}
		async resolveUcidToHandle(ucid: string, { force = false, signal = null }: { force?: boolean; signal?: AbortSignal | null } = {}) {
			if (!isChannelId(ucid)) throw new Error(t('pairLookupNoUcid'));
			return this._resolveChannel(ucid, 'update', force, signal);
		}
		_readChannelMetadata(html: string) {
			const assignment = /(?:var\s+)?ytInitialData\s*=\s*|window\["ytInitialData"\]\s*=\s*/g;
			const match = assignment.exec(html);
			if (!match) throw new Error(t('pairLookupFailed'));
			const start = html.indexOf('{', assignment.lastIndex);
			let depth = 0, quoted = false, escaped = false;
			for (let index = start; index >= 0 && index < html.length; index++) {
				const character = html[index];
				if (quoted) {
					if (escaped) escaped = false;
					else if (character === '\\') escaped = true;
					else if (character === '"') quoted = false;
				} else if (character === '"') quoted = true;
				else if (character === '{') depth++;
				else if (character === '}' && --depth === 0) {
					return JSON.parse(html.slice(start, index + 1))?.metadata?.channelMetadataRenderer;
				}
			}
			throw new Error(t('pairLookupFailed'));
		}
		async _resolveChannelFromPage(identifier: string, reverse: boolean, signal: AbortSignal | null = null) {
			const path = reverse ? '/channel/' + encodeURIComponent(identifier) : '/@' + encodeURIComponent(identifier.slice(1));
			const response = await this._fetchWithTimeout('https://www.youtube.com' + path, { cache: 'no-store', referrerPolicy: 'no-referrer' }, signal);
			if (!response.ok) throw new Error(t('pairLookupFailed') + ' (' + response.status + ')');
			const metadata = this._readChannelMetadata(await this._readResponseBody(response, 'text', signal));
			const ucid = metadata?.externalId;
			const urls = [metadata?.vanityChannelUrl, ...(Array.isArray(metadata?.ownerUrls) ? metadata.ownerUrls : [])];
			const handles = urls.flatMap((value: any) => {
				try {
					const url = new URL(value, 'https://www.youtube.com');
					if (url.hostname !== 'www.youtube.com' && url.hostname !== 'youtube.com') return [];
					const match = /^\/@([^/?#]+)\/?$/.exec(url.pathname);
					return match ? ['@' + decodeURIComponent(match[1])] : [];
				} catch { return []; }
			});
			const handle = handles[0];
			if (!isChannelId(ucid) || (reverse && (ucid !== identifier || !sanitizeHandle(handle))) || (!reverse && (!handle || getHandleCompareKey(handle, false) !== getHandleCompareKey(identifier, false)))) throw new Error(t('pairLookupFailed'));
			return { ucid, handle, source: 'youtube-channel-page' };
		}
		async _resolveChannelFromApi(identifier: string, reverse: boolean, signal: AbortSignal | null = null) {
			const apiKey = this.apiConfig.getApiKey();
			if (!apiKey) throw new Error(t('apiKeyRequired'));
			const url = new URL('https://www.googleapis.com/youtube/v3/channels');
			url.searchParams.set('part', reverse ? 'id,snippet' : 'id');
			url.searchParams.set(reverse ? 'id' : 'forHandle', identifier);
			url.searchParams.set('key', apiKey);
			url.searchParams.set('hl', getLang() === 'ko-kr' ? 'ko' : 'en');
			const response = await this._fetchWithTimeout(url.toString(), { cache: 'no-store', referrerPolicy: 'no-referrer' }, signal);
			const payload = await this._readResponseBody(response, 'json', signal);
			if (!response.ok) throw new Error(payload?.error?.message || t('pairLookupFailed') + ' (' + response.status + ')');
			const channel = payload?.items?.[0];
			const ucid = channel?.id;
			const handle = reverse ? sanitizeHandle(channel?.snippet?.customUrl) : identifier;
			if (!isChannelId(ucid) || !handle || (reverse && ucid !== identifier)) throw new Error(t('pairLookupFailed'));
			return { ucid, handle, source: 'youtube-data-api-v3' };
		}
	}
