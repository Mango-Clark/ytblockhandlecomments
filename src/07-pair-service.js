	/* ----------------------------------------------------------
	 * 6. Pair resolution and policy
	 * ---------------------------------------------------------- */
	class PairService {
		constructor(storage, pairStore, apiConfig, settings) {
			this.storage = storage;
			this.pairStore = pairStore;
			this.apiConfig = apiConfig;
			this.settings = settings;
			this._busy = false;
		}
		getBlockedHandles() {
			return this.storage.all().filter(item => item.type === 'handle').map(item => item.value);
		}
		getBlockedIdSet(items = this.storage.all()) {
			return new Set((items || []).filter(item => item.type === 'id').map(item => item.value));
		}
		hasBlockedId(uid, blockedIds = null) {
			return blockedIds ? blockedIds.has(uid) : this.storage.all().some(item => item.type === 'id' && item.value === uid);
		}
		getHandleStatus(handle, blockedIds = null) {
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
			for (const handle of allItems.filter(item => item.type === 'handle').map(item => item.value)) {
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
			const dismissedAt = this.pairStore.getNotificationDismissedAt();
			return !dismissedAt || (Date.now() - dismissedAt) >= PAIR_NOTICE_COOLDOWN_MS;
		}
		dismissNotification() {
			this.pairStore.dismissNotification();
		}
		removeHandleArtifacts(handle) {
			const pair = this.pairStore.getPair(handle);
			if (pair?.uid) this.storage.remove({ type: 'id', value: pair.uid });
			this.pairStore.removePair(handle);
		}
		collectHandleArtifactIds(handles) {
			const ids = new Set();
			for (const handle of handles || []) {
				const pair = this.pairStore.getPair(handle);
				if (pair?.uid) ids.add(pair.uid);
			}
			return ids;
		}
		removeHandlePairs(handles) {
			this.pairStore.removePairs(handles || []);
		}
		clearPairArtifacts() {
			this.pairStore.clearPairs();
		}
		async createMissingPairs() {
			const handles = this.getBlockedHandles().filter(handle => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(handles);
		}
		async createPairsForHandles(handles) {
			const filtered = (handles || []).filter(handle => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(filtered);
		}
		_shouldRefreshHandle(handle, { includeMissing = true } = {}) {
			const status = this.getHandleStatus(handle).code;
			if (status === 'paired') return false;
			if (status === 'handle-only') return includeMissing;
			return status === 'stale' || status === 'mismatch' || status === 'unverified';
		}
		async updatePairs({ includeMissing = true } = {}) {
			const handles = [];
			const skipped = [];
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
			const stats = await this._processHandles(handles);
			stats.skipped += skipped.length;
			stats.items.push(...skipped);
			return stats;
		}
		async updatePairsForHandles(handles) {
			return this._processHandles(handles || []);
		}
		async _processHandles(handles) {
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
			const stats = {
				created: 0,
				refreshed: 0,
				mismatches: 0,
				failed: 0,
				addedIds: 0,
				skipped: 0,
				items: []
			};
			const uniqueHandles = [];
			const seen = new Set();
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
					try {
						const resolved = await this.resolveHandle(handle);
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
							if (this.hasBlockedId(existing.uid)) this.storage.remove({ type: 'id', value: existing.uid });
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
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
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
				const response = await fetch(url.toString(), { cache: 'no-store' });
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
		async resolveHandle(handle) {
			const apiKey = this.apiConfig.getApiKey();
			if (!apiKey) throw new Error(t('apiKeyRequired'));

			const url = new URL('https://www.googleapis.com/youtube/v3/channels');
			url.searchParams.set('part', 'id');
			url.searchParams.set('forHandle', handle);
			url.searchParams.set('key', apiKey);
			url.searchParams.set('hl', getLang() === 'ko' ? 'ko' : 'en');

			const response = await fetch(url.toString(), { cache: 'no-store' });
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
	}

