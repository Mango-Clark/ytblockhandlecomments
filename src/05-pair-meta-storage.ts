import {
	PAIR_STALE_MS,
	getHandleCompareKey,
	isChannelId,
	sanitizeHandle,
	type LooseObject,
	type PairRecord,
	type PairStatus,
	type SettingsLike
} from './02-utils-i18n.ts';

	/* ----------------------------------------------------------
	 * 4. Pair metadata storage
	 * ---------------------------------------------------------- */
	export class PairMetaStorage {
		[key: string]: any;
		constructor(settings: SettingsLike) {
			this.settings = settings;
			this.KEY = 'pair_meta_v1';
			this._lastSaveError = null;
			this._state = this._init();
		}
		_getGM(key: string, def: any) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key: string, val: any) {
			try { GM_setValue(key, val); this._lastSaveError = null; return true; }
			catch (error) { this._lastSaveError = error; return false; }
		}
		getLastSaveError() { return this._lastSaveError; }
		_defaultState(): LooseObject {
			return {
				version: 1,
				enableUidDetection: false,
				lastPairCheckAt: null,
				pairNotificationDismissedAt: null,
				pairs: []
			};
		}
		_normalizeStatus(pair: Partial<PairRecord>, now = Date.now()): PairStatus {
			if (pair.status === 'mismatch') return 'mismatch';
			if (pair.status === 'unverified') return 'unverified';
			if (!pair.uid) return 'unverified';
			const verifiedAt = pair.verifiedAt;
			if (!Number.isFinite(verifiedAt) || !verifiedAt || verifiedAt <= 0) return 'unverified';
			return now - verifiedAt >= PAIR_STALE_MS ? 'stale' : 'verified';
		}
		_normalizePair(raw: any, now = Date.now()): PairRecord | null {
			const handle = sanitizeHandle(raw?.handle);
			if (!handle) return null;
			const uid = isChannelId(raw?.uid) ? String(raw.uid).trim() : '';
			const verifiedAt = Number.isFinite(raw?.verifiedAt) && raw.verifiedAt > 0 ? raw.verifiedAt : null;
			const source = typeof raw?.source === 'string' && raw.source.trim() ? raw.source.trim() : 'unknown';
			const lastResolvedUid = isChannelId(raw?.lastResolvedUid) ? String(raw.lastResolvedUid).trim() : null;
			const lastError = typeof raw?.lastError === 'string' && raw.lastError.trim() ? raw.lastError.trim() : null;
			const normalized: PairRecord = {
				handle,
				uid,
				verifiedAt,
				status: raw?.status || (uid ? 'verified' : 'unverified'),
				source,
				lastResolvedUid,
				lastError
			};
			normalized.status = this._normalizeStatus(normalized, now);
			return normalized;
		}
		_normalizeState(raw: any) {
			const src = raw && typeof raw === 'object' ? raw : {};
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			const next = {
				version: 1,
				enableUidDetection: !!src.enableUidDetection,
				lastPairCheckAt: Number.isFinite(src.lastPairCheckAt) ? src.lastPairCheckAt : null,
				pairNotificationDismissedAt: Number.isFinite(src.pairNotificationDismissedAt)
					? src.pairNotificationDismissedAt
					: null,
				pairs: [] as PairRecord[]
			};
			const dedup = new Map();
			for (const pair of Array.isArray(src.pairs) ? src.pairs : []) {
				const normalized = this._normalizePair(pair);
				if (normalized) dedup.set(getHandleCompareKey(normalized.handle, caseSensitive), normalized);
			}
			next.pairs = Array.from(dedup.values());
			return next;
		}
		_init() {
			return this._normalizeState(this._getGM(this.KEY, null));
		}
		_statesEqual(a: any, b: any) {
			if (a === b) return true;
			if (!a || !b) return false;
			if (a.enableUidDetection !== b.enableUidDetection) return false;
			if ((a.lastPairCheckAt || null) !== (b.lastPairCheckAt || null)) return false;
			if ((a.pairNotificationDismissedAt || null) !== (b.pairNotificationDismissedAt || null)) return false;
			if (!Array.isArray(a.pairs) || !Array.isArray(b.pairs) || a.pairs.length !== b.pairs.length) return false;
			for (let i = 0; i < a.pairs.length; i++) {
				const A = a.pairs[i];
				const B = b.pairs[i];
				if (!A || !B) return false;
				if (
					A.handle !== B.handle ||
					A.uid !== B.uid ||
					(A.verifiedAt || null) !== (B.verifiedAt || null) ||
					A.status !== B.status ||
					A.source !== B.source ||
					(A.lastResolvedUid || null) !== (B.lastResolvedUid || null) ||
					(A.lastError || null) !== (B.lastError || null)
				) return false;
			}
			return true;
		}
		_saveState(nextState: any) {
			const normalized = this._normalizeState(nextState);
			if (this._statesEqual(this._state, normalized)) {
				this._state = normalized;
				return this.getState();
			}
			if (!this._setGM(this.KEY, normalized)) return this.getState();
			this._state = normalized;
			return this.getState();
		}
		getState() {
			return { ...this._state, pairs: this._state.pairs.map((pair: PairRecord) => ({ ...pair })) };
		}
		setAllLocal(state: any) {
			this._state = this._normalizeState(state);
			return this.getState();
		}
		refreshStatuses() {
			return this._saveState(this._state);
		}
		isUidDetectionEnabled() {
			return !!this._state.enableUidDetection;
		}
		setUidDetectionEnabled(enabled: any) {
			return this._saveState({ ...this._state, enableUidDetection: !!enabled });
		}
		getLastPairCheckAt() {
			return this._state.lastPairCheckAt;
		}
		setLastPairCheckAt(ts: any) {
			return this._saveState({ ...this._state, lastPairCheckAt: Number.isFinite(ts) ? ts : null });
		}
		getNotificationDismissedAt() {
			return this._state.pairNotificationDismissedAt;
		}
		dismissNotification(ts = Date.now()) {
			return this._saveState({
				...this._state,
				pairNotificationDismissedAt: Number.isFinite(ts) ? ts : Date.now()
			});
		}
		allPairs() {
			return this._state.pairs.map((pair: PairRecord) => ({ ...pair }));
		}
		getPair(handle: any): PairRecord | null {
			const normalized = getHandleCompareKey(handle, this.settings?.isHandleCaseSensitive?.() || false);
			if (!normalized) return null;
			return this._state.pairs.find((pair: PairRecord) =>
				getHandleCompareKey(pair.handle, this.settings?.isHandleCaseSensitive?.() || false) === normalized
			) || null;
		}
		upsertPair(pair: any) {
			const normalized = this._normalizePair(pair);
			if (!normalized) return this.getState();
			const compareKey = getHandleCompareKey(normalized.handle, this.settings?.isHandleCaseSensitive?.() || false);
			const nextPairs = this._state.pairs.filter((item: PairRecord) =>
				getHandleCompareKey(item.handle, this.settings?.isHandleCaseSensitive?.() || false) !== compareKey
			);
			nextPairs.push(normalized);
			return this._saveState({ ...this._state, pairs: nextPairs });
		}
		removePair(handle: any) {
			const normalized = getHandleCompareKey(handle, this.settings?.isHandleCaseSensitive?.() || false);
			if (!normalized) return this.getState();
			return this._saveState({
				...this._state,
				pairs: this._state.pairs.filter((pair: PairRecord) =>
					getHandleCompareKey(pair.handle, this.settings?.isHandleCaseSensitive?.() || false) !== normalized
				)
			});
		}
		removePairs(handles: any[]) {
			const keys = new Set((handles || [])
				.map(handle => getHandleCompareKey(handle, this.settings?.isHandleCaseSensitive?.() || false))
				.filter(Boolean));
			if (!keys.size) return this.getState();
			return this._saveState({
				...this._state,
				pairs: this._state.pairs.filter((pair: PairRecord) =>
					!keys.has(getHandleCompareKey(pair.handle, this.settings?.isHandleCaseSensitive?.() || false))
				)
			});
		}
		clearPairs() {
			return this._saveState({ ...this._state, pairs: [] });
		}
	}

