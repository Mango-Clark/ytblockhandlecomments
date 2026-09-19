import {
	PAIR_NOTICE_COOLDOWN_MS,
	PAIR_STALE_MS,
	getHandleCompareKey,
	getLang,
	isChannelId,
	sanitizeHandle,
	t,
	type ApiConfigLike,
	type BlockItem,
	type PairRecord,
	type PairRunItem,
	type PairRunStats,
	type PairStoreLike,
	type SettingsLike,
	type StorageLike
} from './02-utils-i18n.ts';

const PAIR_LOOKUP_CONCURRENCY = 8;
const PAIR_LOOKUP_CACHE_LIMIT = 256;

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
			this._handleLookupCache = new Map();
			this._activeLookups = 0;
			this._lookupWaiters = [];
		}
		getBlockedHandles() {
			return this.storage.all().filter((item: BlockItem) => item.type === 'handle').map((item: BlockItem) => item.value);
		}
		getBlockedIdSet(items: BlockItem[] = this.storage.all()): Set<string> {
			return new Set((items || []).filter((item: BlockItem) => item.type === 'id').map((item: BlockItem) => item.value));
		}
		hasBlockedId(uid: any, blockedIds: Set<string> | null = null): boolean {
			return blockedIds ? blockedIds.has(uid) : this.storage.all().some((item: BlockItem) => item.type === 'id' && item.value === uid);
		}
		_uidUsedByOtherPair(uid: any, excludedHandles: any[] = []): boolean {
			if (!isChannelId(uid)) return false;
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			const excluded = new Set((excludedHandles || [])
				.map(handle => getHandleCompareKey(handle, caseSensitive))
				.filter(Boolean));
			return this.pairStore.allPairs().some((pair: PairRecord) =>
				pair.uid === uid && !excluded.has(getHandleCompareKey(pair.handle, caseSensitive))
			);
		}
		getHandleStatus(handle: any, blockedIds: Set<string> | null = null) {
			const pair = this.pairStore.getPair(handle);
			if (!pair) return { code: 'handle-only', pair: null };
			if (pair.status === 'mismatch') return { code: 'mismatch', pair };
			if (pair.status === 'unverified' || !pair.uid) return { code: 'unverified', pair };
			if (!this.hasBlockedId(pair.uid, blockedIds)) return { code: 'handle-only', pair };
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
			if (!this.pairStore.isUidDetectionEnabled()) return false;
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
			if (pair?.uid && !this._uidUsedByOtherPair(pair.uid, [handle])) {
				this.storage.remove({ type: 'id', value: pair.uid });
			}
			this.pairStore.removePair(handle);
		}
		collectHandleArtifactIds(handles: any[]): Set<string> {
			const ids = new Set<string>();
			const excludedHandles = handles || [];
			for (const handle of handles || []) {
				const pair = this.pairStore.getPair(handle);
				if (pair?.uid && !this._uidUsedByOtherPair(pair.uid, excludedHandles)) ids.add(pair.uid);
			}
			return ids;
		}
		removeHandlePairs(handles: any[]) {
			this.pairStore.removePairs(handles || []);
		}
		clearPairArtifacts() {
			this.pairStore.clearPairs();
		}
		async createMissingPairs() {
			const handles = this.getBlockedHandles().filter((handle: string) => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(handles);
		}
		async createPairsForHandles(handles: any[], { automatic = false } = {}) {
			const filtered = (handles || []).filter(handle => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(filtered, { automatic });
		}
		_shouldRefreshHandle(handle: any, { includeMissing = true } = {}) {
			const existing = this.pairStore.getPair(handle);
			const intervalSeconds = this.settings?.getHandleLookupIntervalSeconds?.() ?? 600;
			if (existing?.verifiedAt && intervalSeconds > 0 && Date.now() - existing.verifiedAt < intervalSeconds * 1000) return false;
			const status = this.getHandleStatus(handle).code;
			if (status === 'paired') return true;
			if (status === 'handle-only') return includeMissing;
			return status === 'stale' || status === 'mismatch' || status === 'unverified';
		}
		async updatePairs({ includeMissing = true } = {}): Promise<PairRunStats> {
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
			const stats = await this._processHandles(handles, { update: true });
			stats.skipped += skipped.length;
			stats.items.push(...skipped);
			return stats;
		}
		async updatePairsForHandles(handles: any[]) {
			return this._processHandles(handles || [], { update: true });
		}
		async _withLookupSlot<T>(lookup: () => Promise<T>): Promise<T> {
			while (this._activeLookups >= (this.settings?.isLowPerformanceMode?.() ? 1 : PAIR_LOOKUP_CONCURRENCY)) {
				await new Promise<void>(resolve => this._lookupWaiters.push(resolve));
			}
			this._activeLookups++;
			try { return await lookup(); }
			finally {
				this._activeLookups--;
				for (const resume of this._lookupWaiters.splice(0)) resume();
			}
		}
		_asPersistenceResult(result: any) {
			return result && typeof result.ok === 'boolean' ? result : { ok: true, value: result };
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
		_rollbackPair(stats: PairRunStats, existing: PairRecord | null, handle: string) {
			const result = this._asPersistenceResult(existing
				? this.pairStore.upsertPair(existing)
				: this.pairStore.removePair(handle));
			if (!result.ok) this._recordRollbackFailure(stats, result.error || 'Pair rollback failed.');
		}
		_rollbackStorage(stats: PairRunStats, items: BlockItem[]) {
			const result = this.storage.setAllResult
				? this.storage.setAllResult(items)
				: this._asPersistenceResult(this.storage.setAll(items));
			if (!result.ok) this._recordRollbackFailure(stats, result.error || 'Block list rollback failed.');
		}
		async _processHandles(handles: any[], { update = false, automatic = false } = {}): Promise<PairRunStats> {
			while (this._busy) await this._idlePromise;
			this._busy = true;
			let resolveIdle: () => void = () => {};
			this._idlePromise = new Promise<void>(resolve => { resolveIdle = resolve; });
			const stats: PairRunStats = {
				created: 0,
				refreshed: 0,
				mismatches: 0,
				failed: 0,
				addedIds: 0,
				skipped: 0,
				items: [],
				persistenceFailures: 0
			};
			const uniqueHandles: string[] = [];
			const seen = new Set<string>();
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			for (const handle of handles || []) {
				const key = getHandleCompareKey(handle, caseSensitive);
				const value = sanitizeHandle(handle);
				if (!key || !value || seen.has(key)) continue;
				seen.add(key);
				uniqueHandles.push(value);
			}
			try {
				let nextHandleIndex = 0;
				const itemOrder = new Map(uniqueHandles.map((handle, index) => [
					getHandleCompareKey(handle, caseSensitive),
					index
				]));
				const processNextHandle = async (worker: number) => {
					while (nextHandleIndex < uniqueHandles.length) {
						// Running requests finish, but only worker zero may start another in low mode.
						if ((worker > 0 || automatic) && this.settings?.isLowPerformanceMode?.()) return;
						const handle = uniqueHandles[nextHandleIndex++];
					const existing = this.pairStore.getPair(handle);
					const checkStoredUid = update && !!existing?.uid && !!this.settings?.isPairUpdateUidCheckEnabled?.();
					const lookupHandle = !update || !existing?.uid || this.settings?.isPairUpdateHandleLookupEnabled?.() !== false;
					let uidVerified = false;
					let uidError = '';
					let handleError = '';
					let handleResolved = false;
					if (checkStoredUid) {
						try {
							await this._withLookupSlot(() => this.resolveUid(existing.uid));
							uidVerified = true;
						} catch (error) {
							uidError = error instanceof Error ? error.message : String(error);
						}
					}
					if (lookupHandle) {
						try {
						const resolved = await this._withLookupSlot<any>(() => this.resolveHandle(handle, { force: update }));
						if (existing?.uid && existing.uid !== resolved.uid) {
							const previousItems = this.storage.all();
							const pairWrite = this._asPersistenceResult(this.pairStore.upsertPair({
								...existing,
								handle,
								uid: resolved.uid,
								verifiedAt: Date.now(),
								status: 'verified',
								lastResolvedUid: resolved.uid,
								lastError: null,
								source: resolved.source || existing.source || 'youtube-data-api-v3'
							}));
							if (!pairWrite.ok) {
								this._recordPersistenceFailure(stats, handle, pairWrite.error || 'Pair metadata could not be saved.');
								continue;
							}
							if (this.hasBlockedId(existing.uid) && !this._uidUsedByOtherPair(existing.uid)) {
								const removeResult = this.storage.removeResult
									? this.storage.removeResult({ type: 'id', value: existing.uid })
									: { ok: this.storage.remove({ type: 'id', value: existing.uid }), value: { removed: true } };
								if (!removeResult.ok) {
									this._rollbackPair(stats, existing, handle);
									this._recordPersistenceFailure(stats, handle, removeResult.error || 'Block list could not be saved.');
									continue;
								}
							}
							if (!this.hasBlockedId(resolved.uid)) {
								const addResult = this.storage.addIdResult
									? this.storage.addIdResult(resolved.uid)
									: { ok: this.storage.addId(resolved.uid), value: { added: true } };
								if (!addResult.ok) {
									this._rollbackStorage(stats, previousItems);
									this._rollbackPair(stats, existing, handle);
									this._recordPersistenceFailure(stats, handle, addResult.error || 'Block list could not be saved.');
									continue;
								}
								if (addResult.value.added) stats.addedIds += 1;
							}
							stats.mismatches += 1;
							stats.items.push({
								handle,
								outcome: 'mismatch',
								uid: existing.uid,
								resolvedUid: resolved.uid,
								message: t('pairUidReplaced')
							});
							continue;
						}
						const pairWrite = this._asPersistenceResult(this.pairStore.upsertPair({
							handle,
							uid: resolved.uid,
							verifiedAt: Date.now(),
							status: 'verified',
							source: resolved.source,
							lastResolvedUid: resolved.uid,
							lastError: null
						}));
						if (!pairWrite.ok) {
							this._recordPersistenceFailure(stats, handle, pairWrite.error || 'Pair metadata could not be saved.');
							continue;
						}
						if (!this.hasBlockedId(resolved.uid)) {
							const addResult = this.storage.addIdResult
								? this.storage.addIdResult(resolved.uid)
								: { ok: this.storage.addId(resolved.uid), value: { added: true } };
							if (!addResult.ok) {
								this._rollbackPair(stats, existing, handle);
								this._recordPersistenceFailure(stats, handle, addResult.error || 'Block list could not be saved.');
								continue;
							}
							if (addResult.value.added) stats.addedIds += 1;
						}
						if (existing?.uid) {
							stats.refreshed += 1;
							stats.items.push({ handle, outcome: 'updated', uid: resolved.uid });
						}
							else {
								stats.created += 1;
								stats.items.push({ handle, outcome: 'created', uid: resolved.uid });
							}
							handleResolved = true;
						} catch (error) {
							handleError = error instanceof Error ? error.message : String(error);
						}
					}
					if (handleResolved) continue;
					if (uidVerified && existing?.uid) {
						const pairWrite = this._asPersistenceResult(this.pairStore.upsertPair({
							...existing,
							handle,
							verifiedAt: Date.now(),
							status: 'verified',
							source: existing.source || 'youtube-data-api-v3',
							lastResolvedUid: existing.uid,
							lastError: handleError || null
						}));
						if (!pairWrite.ok) {
							this._recordPersistenceFailure(stats, handle, pairWrite.error || 'Pair metadata could not be saved.');
							continue;
						}
						stats.refreshed += 1;
						stats.items.push({ handle, outcome: 'updated', uid: existing.uid, message: handleError || undefined });
						continue;
					}
					if (!lookupHandle) continue;
					const message = handleError || uidError;
					const fallbackStatus = existing?.uid
						? (existing.status === 'mismatch'
							? 'mismatch'
							: (existing.verifiedAt && (Date.now() - existing.verifiedAt) >= PAIR_STALE_MS
								? 'stale'
								: 'unverified'))
						: 'unverified';
					const pairWrite = this._asPersistenceResult(this.pairStore.upsertPair({
						...existing,
						handle,
						uid: existing?.uid || '',
						verifiedAt: existing?.verifiedAt || null,
						status: fallbackStatus,
						source: existing?.source || 'youtube-data-api-v3',
						lastResolvedUid: existing?.lastResolvedUid || null,
						lastError: message
					}));
					if (!pairWrite.ok) {
						this._recordPersistenceFailure(stats, handle, pairWrite.error || 'Pair metadata could not be saved.');
						continue;
					}
					stats.failed += 1;
					stats.items.push({
						handle,
						outcome: 'failed',
						uid: existing?.uid || undefined,
						resolvedUid: existing?.lastResolvedUid || undefined,
						message
					});
					}
				};
				await Promise.all(Array.from(
					{ length: Math.min(this.settings?.isLowPerformanceMode?.() ? 1 : PAIR_LOOKUP_CONCURRENCY, uniqueHandles.length) },
					(_: unknown, worker: number) => processNextHandle(worker)
				));
				stats.items.sort((a, b) => {
					return (itemOrder.get(getHandleCompareKey(a.handle, caseSensitive)) ?? Number.MAX_SAFE_INTEGER)
						- (itemOrder.get(getHandleCompareKey(b.handle, caseSensitive)) ?? Number.MAX_SAFE_INTEGER);
				});
			} finally {
				this._busy = false;
				this._idlePromise = null;
				resolveIdle();
				if (!automatic || stats.items.length) {
					const checkResult = this._asPersistenceResult(this.pairStore.setLastPairCheckAt(Date.now()));
					if (!checkResult.ok) this._recordPersistenceFailure(stats, null, checkResult.error || 'Pair check time could not be saved.');
					const refreshResult = this._asPersistenceResult(this.pairStore.refreshStatuses());
					if (!refreshResult.ok) this._recordPersistenceFailure(stats, null, refreshResult.error || 'Pair status could not be saved.');
				}
			}
			return stats;
		}
		async testApiKey() {
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
				url.searchParams.set('hl', getLang() === 'ko' ? 'ko' : 'en');
				const response = await fetch(url.toString(), { cache: 'no-store', referrerPolicy: 'no-referrer' });
				let payload = null;
				try { payload = await response.json(); } catch { }
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
					category: 'network',
					httpStatus: null,
					message: error instanceof Error ? error.message : String(error)
				};
			}
		}
		async resolveHandle(handle: string, { force = false } = {}) {
			const normalized = sanitizeHandle(handle);
			if (!normalized) throw new Error(t('pairLookupNoUid'));
			const key = getHandleCompareKey(normalized, this.settings?.isHandleCaseSensitive?.() || false);
			const cached = this._handleLookupCache.get(key);
			const intervalSeconds = this.settings?.getHandleLookupIntervalSeconds?.() ?? 600;
			if (!force && cached && intervalSeconds > 0 && Date.now() - cached.checkedAt < intervalSeconds * 1000) {
				this._handleLookupCache.delete(key);
				this._handleLookupCache.set(key, cached);
				return cached.result;
			}
			if (cached) this._handleLookupCache.delete(key);
			let result;
			if (this.settings?.getHandleLookupMethod?.() !== 'api') {
				try { result = await this._resolveHandleFromPage(normalized); }
				catch (error) {
					if (!this.settings?.isHandleLookupFallbackApiEnabled?.() || !this.apiConfig.hasApiKey()) {
						const message = error instanceof Error ? error.message : String(error);
						const guidance = getLang() === 'ko'
							? '다시 시도하거나, 테스트한 API 키로 API fallback을 켜세요.'
							: 'Retry, or enable API fallback with a tested API key.';
						throw new Error(`${message} ${guidance}`, { cause: error });
					}
				}
			}
			if (!result) result = await this._resolveHandleFromApi(normalized);
			this._handleLookupCache.set(key, { checkedAt: Date.now(), result });
			while (this._handleLookupCache.size > PAIR_LOOKUP_CACHE_LIMIT) {
				const oldestKey = this._handleLookupCache.keys().next().value;
				if (oldestKey == null) break;
				this._handleLookupCache.delete(oldestKey);
			}
			return result;
		}
		async _resolveHandleFromPage(handle: string) {
			const response = await fetch(`https://www.youtube.com/@${encodeURIComponent(handle.slice(1))}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
			if (!response.ok) throw new Error(`${t('pairLookupFailed')} (${response.status})`);
			const html = await response.text();
			const patterns = [/"externalId":"(UC[0-9A-Za-z_-]{10,})"/, /"channelId":"(UC[0-9A-Za-z_-]{10,})"/, /itemprop="channelId"\s+content="(UC[0-9A-Za-z_-]{10,})"/];
			const uid = patterns.map(pattern => pattern.exec(html)?.[1]).find(isChannelId);
			if (!uid) throw new Error(t('pairLookupNoUid'));
			return { uid, source: 'youtube-channel-page' };
		}
		async _resolveHandleFromApi(handle: string) {
			const apiKey = this.apiConfig.getApiKey();
			if (!apiKey) throw new Error(t('apiKeyRequired'));

			const url = new URL('https://www.googleapis.com/youtube/v3/channels');
			url.searchParams.set('part', 'id');
			url.searchParams.set('forHandle', handle);
			url.searchParams.set('key', apiKey);
			url.searchParams.set('hl', getLang() === 'ko' ? 'ko' : 'en');

			const response = await fetch(url.toString(), { cache: 'no-store', referrerPolicy: 'no-referrer' });
			let payload = null;
			try { payload = await response.json(); } catch { }

			if (!response.ok) {
				const message = payload?.error?.message || `${t('pairLookupFailed')} (${response.status})`;
				throw new Error(message);
			}

			const uid = payload?.items?.[0]?.id;
			if (!isChannelId(uid)) throw new Error(t('pairLookupNoUid'));
			return { uid, source: 'youtube-data-api-v3' };
		}
		async resolveUid(uid: string) {
			const apiKey = this.apiConfig.getApiKey();
			if (!apiKey) throw new Error(t('apiKeyRequired'));

			const url = new URL('https://www.googleapis.com/youtube/v3/channels');
			url.searchParams.set('part', 'id');
			url.searchParams.set('id', uid);
			url.searchParams.set('key', apiKey);
			url.searchParams.set('hl', getLang() === 'ko' ? 'ko' : 'en');

			const response = await fetch(url.toString(), { cache: 'no-store', referrerPolicy: 'no-referrer' });
			let payload = null;
			try { payload = await response.json(); } catch { }

			if (!response.ok) {
				const message = payload?.error?.message || `${t('pairLookupFailed')} (${response.status})`;
				throw new Error(message);
			}
			const resolvedUid = payload?.items?.[0]?.id;
			if (!isChannelId(resolvedUid)) throw new Error(t('pairLookupNoUid'));
			return { uid: resolvedUid, source: 'youtube-data-api-v3' };
		}
	}

