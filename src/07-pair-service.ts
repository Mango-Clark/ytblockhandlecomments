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

	/* ----------------------------------------------------------
	 * 6. Pair resolution and policy
	 * ---------------------------------------------------------- */
	export class PairService {
		[key: string]: any;
		constructor(storage: StorageLike, pairStore: PairStoreLike, apiConfig: ApiConfigLike, settings: SettingsLike) {
			this.storage = storage;
			this.pairStore = pairStore;
			this.apiConfig = apiConfig;
			this.settings = settings;
			this._busy = false;
			this._handleLookupCache = new Map();
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
			return summary;
		}
		shouldNotify() {
			if (!this.pairStore.isUidDetectionEnabled()) return false;
			const summary = this.getSummary();
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
		async createPairsForHandles(handles: any[]) {
			const filtered = (handles || []).filter(handle => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(filtered);
		}
		_shouldRefreshHandle(handle: any, { includeMissing = true } = {}) {
			const existing = this.pairStore.getPair(handle);
			const intervalSeconds = this.settings?.getHandleLookupIntervalSeconds?.() ?? 600;
			if (existing?.verifiedAt && intervalSeconds > 0 && Date.now() - existing.verifiedAt < intervalSeconds * 1000) return false;
			const status = this.getHandleStatus(handle).code;
			if (status === 'paired') return false;
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
		async _processHandles(handles: any[], { update = false } = {}): Promise<PairRunStats> {
			if (this._busy) return {
				created: 0,
				refreshed: 0,
				mismatches: 0,
				failed: 0,
				addedIds: 0,
				skipped: handles.length,
				items: (handles || []).map(handle => ({
					handle: sanitizeHandle(handle) || String(handle || ''),
					outcome: 'skipped',
					message: 'busy'
				}))
			};
			this._busy = true;
			const stats: PairRunStats = {
				created: 0,
				refreshed: 0,
				mismatches: 0,
				failed: 0,
				addedIds: 0,
				skipped: 0,
				items: []
			};
			const uniqueHandles: string[] = [];
			const seen = new Set<string>();
			for (const handle of handles || []) {
				const key = getHandleCompareKey(handle, this.settings?.isHandleCaseSensitive?.() || false);
				const value = sanitizeHandle(handle);
				if (!key || !value || seen.has(key)) continue;
				seen.add(key);
				uniqueHandles.push(value);
			}
			try {
				for (const handle of uniqueHandles) {
					const existing = this.pairStore.getPair(handle);
					const checkStoredUid = update && !!existing?.uid && !!this.settings?.isPairUpdateUidCheckEnabled?.();
					const lookupHandle = !update || !existing?.uid || this.settings?.isPairUpdateHandleLookupEnabled?.() !== false;
					let uidVerified = false;
					let uidError = '';
					let handleError = '';
					let handleResolved = false;
					if (checkStoredUid) {
						try {
							await this.resolveUid(existing.uid);
							uidVerified = true;
						} catch (error) {
							uidError = error instanceof Error ? error.message : String(error);
						}
					}
					if (lookupHandle) {
						try {
						const resolved = await this.resolveHandle(handle, { force: update });
						if (existing?.uid && existing.uid !== resolved.uid) {
							this.pairStore.upsertPair({
								...existing,
								handle,
								uid: resolved.uid,
								verifiedAt: Date.now(),
								status: 'verified',
								lastResolvedUid: resolved.uid,
								lastError: null,
								source: resolved.source || existing.source || 'youtube-data-api-v3'
							});
							if (this.hasBlockedId(existing.uid) && !this._uidUsedByOtherPair(existing.uid)) {
								this.storage.remove({ type: 'id', value: existing.uid });
							}
							if (!this.hasBlockedId(resolved.uid) && this.storage.addId(resolved.uid)) stats.addedIds += 1;
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
						this.pairStore.upsertPair({
							handle,
							uid: resolved.uid,
							verifiedAt: Date.now(),
							status: 'verified',
							source: resolved.source,
							lastResolvedUid: resolved.uid,
							lastError: null
						});
						if (!this.hasBlockedId(resolved.uid) && this.storage.addId(resolved.uid)) {
							stats.addedIds += 1;
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
						this.pairStore.upsertPair({
							...existing,
							handle,
							verifiedAt: Date.now(),
							status: 'verified',
							source: existing.source || 'youtube-data-api-v3',
							lastResolvedUid: existing.uid,
							lastError: handleError || null
						});
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
					this.pairStore.upsertPair({
						...existing,
						handle,
						uid: existing?.uid || '',
						verifiedAt: existing?.verifiedAt || null,
						status: fallbackStatus,
						source: existing?.source || 'youtube-data-api-v3',
						lastResolvedUid: existing?.lastResolvedUid || null,
						lastError: message
					});
					stats.failed += 1;
					stats.items.push({
						handle,
						outcome: 'failed',
						uid: existing?.uid || undefined,
						resolvedUid: existing?.lastResolvedUid || undefined,
						message
					});
				}
			} finally {
				this._busy = false;
				this.pairStore.setLastPairCheckAt(Date.now());
				this.pairStore.refreshStatuses();
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
			if (!force && cached && intervalSeconds > 0 && Date.now() - cached.checkedAt < intervalSeconds * 1000) return cached.result;
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

