import { GMBackedStore } from './03a-gm-backed-store.ts';
import {
	PAIR_STALE_MS,
	getHandleCompareKey,
	isChannelId,
	sanitizeHandle,
	type LooseObject,
	type PairRecord,
	type PairStatus,
	type PersistenceResult,
	type SettingsLike
} from './02-utils-i18n.ts';

	/* ----------------------------------------------------------
	 * 4. Pair metadata storage
	 * ---------------------------------------------------------- */
	export class PairMetaStorage extends GMBackedStore {
		declare settings: SettingsLike;
		declare KEY: string;
		declare _revision: number;
		declare _pairIndex: Map<string | null, PairRecord>;
		declare _pairIndexCaseSensitive: boolean | null;
		declare _state: any;
		declare _nextStatusAt: number;
		declare _writerId: string;
		declare _clock: number;
		declare _clearRevision: any;
		declare _pairEntries: Record<string, any>;
		declare _scalarEntries: Record<string, any>;
		constructor(settings: SettingsLike) {
			super();
			this.settings = settings;
			this.KEY = 'pair_meta_v1';
			this._lastSaveError = null;
			this._revision = 0;
			this._writerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
			this._clock = 0;
			this._clearRevision = null;
			this._pairEntries = {};
			this._scalarEntries = {};
			this._pairIndex = new Map();
			this._pairIndexCaseSensitive = null;
			this._state = this._init();
			this._rebuildPairIndex();
		}
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
			const result = this._readGM(this.KEY, null);
			const raw = result.value;
			if (result.status === 'present' && (!raw || typeof raw !== 'object' || Array.isArray(raw))) this._markGMReadInvalid(this.KEY, raw);
			const state = this._normalizeState(raw);
			this._hydrateSync(raw, state);
			return state;
		}
		_compareRevision(a: any, b: any) {
			if (!a) return -1;
			if (!b) return 1;
			if (a.clock !== b.clock) return a.clock > b.clock ? 1 : -1;
			return String(a.writer || '').localeCompare(String(b.writer || ''));
		}
		_nextRevision() {
			this._clock = Math.max(this._clock, Date.now()) + 1;
			return { clock: this._clock, writer: this._writerId };
		}
		_normalizeRevision(value: any, fallback = 0) {
			return value && Number.isFinite(value.clock)
				? { clock: Number(value.clock), writer: String(value.writer || '') }
			: { clock: fallback, writer: '' };
		}
		_pairKey(handle: any) {
			return getHandleCompareKey(handle, this.settings?.isHandleCaseSensitive?.() || false) || '';
		}
		_hydrateSync(raw: any, state: any) {
			const sync = raw?.sync && typeof raw.sync === 'object' ? raw.sync : {};
			const fallback = Number(raw?.updatedAt) || 0;
			this._clock = Math.max(this._clock, Number(sync.clock) || 0, fallback);
			this._clearRevision = sync.clear ? this._normalizeRevision(sync.clear) : null;
			this._pairEntries = {};
			for (const [key, value] of Object.entries(sync.pairs || {})) {
				const entry: any = value;
				this._pairEntries[key] = {
					revision: this._normalizeRevision(entry?.revision, fallback),
					deleted: !!entry?.deleted,
					item: entry?.item
				};
			}
			for (const pair of state.pairs as PairRecord[]) {
				const key = this._pairKey(pair.handle);
				if (!this._pairEntries[key]) this._pairEntries[key] = { revision: this._normalizeRevision(null, fallback), deleted: false, item: pair };
				else if (!this._pairEntries[key].item) this._pairEntries[key].item = pair;
			}
			this._scalarEntries = {};
			for (const name of ['enableUidDetection', 'lastPairCheckAt', 'pairNotificationDismissedAt']) {
				const entry: any = sync.scalars?.[name];
				this._scalarEntries[name] = {
					revision: this._normalizeRevision(entry?.revision, fallback),
					value: entry && Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : state[name]
				};
			}
		}
		_orderedEntries(entries: Record<string, any>) {
			return Object.fromEntries(Object.keys(entries).sort().map(key => [key, entries[key]]));
		}
		_snapshot() {
			return {
				version: 1,
				enableUidDetection: !!this._state.enableUidDetection,
				lastPairCheckAt: this._state.lastPairCheckAt,
				pairNotificationDismissedAt: this._state.pairNotificationDismissedAt,
				pairs: this._state.pairs,
				sync: {
					clock: this._clock,
					clear: this._clearRevision,
					pairs: this._orderedEntries(this._pairEntries),
					scalars: this._orderedEntries(this._scalarEntries)
				}
			};
		}
		_rebuildPairIndex() {
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			this._pairIndex = new Map(this._state.pairs.map((pair: PairRecord) => [
				getHandleCompareKey(pair.handle, caseSensitive),
				pair
			]));
			this._pairIndexCaseSensitive = caseSensitive;
			this._nextStatusAt = Infinity;
			for (const pair of this._state.pairs as PairRecord[]) {
				if (pair.status === 'verified' && pair.verifiedAt) this._nextStatusAt = Math.min(this._nextStatusAt, pair.verifiedAt + PAIR_STALE_MS);
			}
		}
		_setLocalState(state: any) {
			if (this._statesEqual(this._state, state)) return;
			this._state = state;
			this._revision += 1;
			this._rebuildPairIndex();
		}
		_rebuildFromSync() {
			const pairs: PairRecord[] = [];
			for (const entry of Object.values(this._pairEntries) as any[]) {
				if (entry.deleted || !entry.item || this._compareRevision(entry.revision, this._clearRevision) <= 0) continue;
				const normalized = this._normalizePair(entry.item);
				if (normalized) pairs.push(normalized);
			}
			const dedup = new Map<string, PairRecord>();
			for (const pair of pairs) dedup.set(this._pairKey(pair.handle), pair);
			const state = {
				version: 1,
				enableUidDetection: !!this._scalarEntries.enableUidDetection?.value,
				lastPairCheckAt: Number.isFinite(this._scalarEntries.lastPairCheckAt?.value) ? this._scalarEntries.lastPairCheckAt.value : null,
				pairNotificationDismissedAt: Number.isFinite(this._scalarEntries.pairNotificationDismissedAt?.value)
					? this._scalarEntries.pairNotificationDismissedAt.value
					: null,
				pairs: Array.from(dedup.values()).sort((left, right) => this._pairKey(left.handle).localeCompare(this._pairKey(right.handle)))
			};
			this._setLocalState(state);
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
		_saveState(nextState: any, options: { pairChanges?: Array<{ key: string; item?: PairRecord; deleted?: boolean }>; clearPairs?: boolean; scalars?: string[] } = {}): PersistenceResult<any> {
			const normalized = this._normalizeState(nextState);
			const metadataChange = !!options.clearPairs || !!options.pairChanges?.length;
			if (this._statesEqual(this._state, normalized) && !metadataChange) {
				this._setLocalState(normalized);
				return { ok: true, value: this.getState() };
			}
			const previousState = this._state;
			const previousClock = this._clock;
			const previousClear = this._clearRevision;
			const previousPairs = this._pairEntries;
			const previousScalars = this._scalarEntries;
			const revision = this._nextRevision();
			this._state = normalized;
			this._pairEntries = { ...this._pairEntries };
			this._scalarEntries = { ...this._scalarEntries };
			for (const name of options.scalars || []) this._scalarEntries[name] = { revision, value: (normalized as any)[name] };
			for (const change of options.pairChanges || []) {
				this._pairEntries[change.key] = { revision, deleted: !!change.deleted, item: change.item };
			}
			if (options.clearPairs) this._clearRevision = revision;
			if (!this._setGM(this.KEY, this._snapshot())) {
				this._state = previousState;
				this._clock = previousClock;
				this._clearRevision = previousClear;
				this._pairEntries = previousPairs;
				this._scalarEntries = previousScalars;
				this._rebuildPairIndex();
				return { ok: false, value: this.getState(), error: this.getLastSaveError() };
			}
			this._revision += 1;
			this._rebuildPairIndex();
			return { ok: true, value: this.getState() };
		}
		getState() {
			return { ...this._state, pairs: this._state.pairs.map((pair: PairRecord) => ({ ...pair })) };
		}
		setAllLocal(state: any) {
			const normalized = this._normalizeState(state);
			this._hydrateSync(state, normalized);
			this._setLocalState(normalized);
			return this.getState();
		}
		_compareSyncEntry(left: any, right: any) {
			const revision = this._compareRevision(left?.revision, right?.revision);
			if (revision) return revision;
			return JSON.stringify(left || null).localeCompare(JSON.stringify(right || null));
		}
		mergeRemote(raw: any) {
			if (!this.getReadStatus().ok) return false;
			if (!raw || (raw.version != null && raw.version !== 1) || !Array.isArray(raw.pairs)) return false;
			const localSnapshot = JSON.stringify(this._snapshot());
			const localState = this._state;
			const localRevision = this._revision;
			const localClock = this._clock;
			const localClear = this._clearRevision;
			const localPairs = this._pairEntries;
			const localScalars = this._scalarEntries;
			const remoteState = this._normalizeState(raw);
			this._hydrateSync(raw, remoteState);
			const remoteClock = this._clock;
			const remoteClear = this._clearRevision;
			const remotePairs = this._pairEntries;
			const remoteScalars = this._scalarEntries;
			this._clock = Math.max(localClock, remoteClock);
			this._clearRevision = this._compareRevision(localClear, remoteClear) >= 0 ? localClear : remoteClear;
			this._pairEntries = {};
			for (const key of new Set([...Object.keys(localPairs), ...Object.keys(remotePairs)])) {
				const local = localPairs[key];
				const remote = remotePairs[key];
				this._pairEntries[key] = this._compareSyncEntry(local, remote) >= 0 ? local : remote;
			}
			for (const [key, entry] of Object.entries(this._pairEntries)) {
				if (this._compareRevision((entry as any).revision, this._clearRevision) <= 0) delete this._pairEntries[key];
			}
			this._scalarEntries = {};
			for (const name of ['enableUidDetection', 'lastPairCheckAt', 'pairNotificationDismissedAt']) {
				const local = localScalars[name];
				const remote = remoteScalars[name];
				if (name === 'lastPairCheckAt' || name === 'pairNotificationDismissedAt') {
					const localValue = Number.isFinite(local?.value) ? local.value : 0;
					const remoteValue = Number.isFinite(remote?.value) ? remote.value : 0;
					this._scalarEntries[name] = remoteValue > localValue || (remoteValue === localValue && this._compareSyncEntry(local, remote) < 0) ? remote : local;
				} else {
					this._scalarEntries[name] = this._compareSyncEntry(local, remote) >= 0 ? local : remote;
				}
			}
			this._rebuildFromSync();
			const changed = JSON.stringify(this._snapshot()) !== localSnapshot;
			if (!changed) return false;
			if (!this._setGM(this.KEY, this._snapshot())) {
				this._state = localState;
				this._revision = localRevision;
				this._clock = localClock;
				this._clearRevision = localClear;
				this._pairEntries = localPairs;
				this._scalarEntries = localScalars;
				this._rebuildPairIndex();
				return false;
			}
			return true;
		}
		refreshStatuses(): PersistenceResult<any> {
			if (Date.now() >= this._nextStatusAt) return this._saveState(this._state);
			return { ok: true, value: this.getState() };
		}
		_result(ok: boolean, error?: unknown): PersistenceResult<any> {
			return { ok, value: this.getState(), ...(error ? { error } : {}) };
		}
		isUidDetectionEnabled() {
			return !!this._state.enableUidDetection;
		}
		setUidDetectionEnabled(enabled: any) {
			return this._saveState({ ...this._state, enableUidDetection: !!enabled }, { scalars: ['enableUidDetection'] });
		}
		getLastPairCheckAt() {
			return this._state.lastPairCheckAt;
		}
		setLastPairCheckAt(ts: any) {
			const next = Number.isFinite(ts) ? Math.max(this._state.lastPairCheckAt || 0, ts) : this._state.lastPairCheckAt;
			return this._saveState({ ...this._state, lastPairCheckAt: next || null }, { scalars: ['lastPairCheckAt'] });
		}
		getNotificationDismissedAt() {
			return this._state.pairNotificationDismissedAt;
		}
		dismissNotification(ts = Date.now()) {
			const next = Math.max(this._state.pairNotificationDismissedAt || 0, Number.isFinite(ts) ? ts : Date.now());
			return this._saveState({
				...this._state,
				pairNotificationDismissedAt: next
			}, { scalars: ['pairNotificationDismissedAt'] });
		}
		allPairs() {
			return this._state.pairs.map((pair: PairRecord) => ({ ...pair }));
		}
		getPair(handle: any): PairRecord | null {
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			if (this._pairIndexCaseSensitive !== caseSensitive) this._rebuildPairIndex();
			const normalized = getHandleCompareKey(handle, caseSensitive);
			if (!normalized) return null;
			return this._pairIndex.get(normalized) || null;
		}
		upsertPair(pair: any) {
			const normalized = this._normalizePair(pair);
			if (!normalized) return this._result(false, new Error('Invalid pair metadata'));
			const compareKey = this._pairKey(normalized.handle);
			const nextPairs = this._state.pairs.filter((item: PairRecord) =>
				getHandleCompareKey(item.handle, this.settings?.isHandleCaseSensitive?.() || false) !== compareKey
			);
			nextPairs.push(normalized);
			return this._saveState({ ...this._state, pairs: nextPairs }, { pairChanges: [{ key: compareKey, item: normalized }] });
		}
		removePair(handle: any) {
			const normalized = this._pairKey(handle);
			if (!normalized) return this._result(false, new Error('Invalid pair handle'));
			return this._saveState({
				...this._state,
				pairs: this._state.pairs.filter((pair: PairRecord) =>
					getHandleCompareKey(pair.handle, this.settings?.isHandleCaseSensitive?.() || false) !== normalized
				)
			}, { pairChanges: [{ key: normalized, deleted: true }] });
		}
		removePairs(handles: any[]) {
			const keys = new Set((handles || [])
				.map(handle => getHandleCompareKey(handle, this.settings?.isHandleCaseSensitive?.() || false))
				.filter(Boolean));
			if (!keys.size) return this._result(true);
			return this._saveState({
				...this._state,
				pairs: this._state.pairs.filter((pair: PairRecord) =>
					!keys.has(getHandleCompareKey(pair.handle, this.settings?.isHandleCaseSensitive?.() || false))
				)
			}, { pairChanges: Array.from(keys).map(key => ({ key, deleted: true })) });
		}
		clearPairs() {
			return this._saveState({ ...this._state, pairs: [] }, { clearPairs: true });
		}
	}

