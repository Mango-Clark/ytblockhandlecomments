import {
	getHandleCompareKey,
	getItemKey,
	isChannelId,
	isNonNull,
	norm,
	sanitizeHandle,
	validateRegexSpec,
	type BlockItem,
	type SettingsLike
} from './02-utils-i18n.ts';

	/* ----------------------------------------------------------
	 * 3. Storage V2 (id/handle/regex) + migration
	 * ---------------------------------------------------------- */
	export class StorageV2 {
		[key: string]: any;
		// v2 schema: { version: 2, updatedAt: number, items: Array<{type:'id'|'handle'|'regex', value:string, flags?:string}> }
		constructor(settings: SettingsLike) {
			this.settings = settings;
			this.KEY_LEGACY = 'blockedHandles';
			this.KEY_V1 = 'blockedHandles_v1';
			this.KEY_V2 = 'blocked_v2';
			this._writerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
			this._lastSaveError = null;
			this._clock = 0;
			this._entries = {};
			this._clearRevision = null;
			this._items = this._init();
		}
		_getGM(key: string, def: any) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key: string, val: any) {
			try { GM_setValue(key, val); this._lastSaveError = null; return true; }
			catch (error) { this._lastSaveError = error; return false; }
		}
		getLastSaveError() { return this._lastSaveError; }

		_loadLegacy() {
			const raw = this._getGM(this.KEY_LEGACY, []);
			let handles: any[] = [];
			if (Array.isArray(raw)) handles = raw;
			else if (typeof raw === 'string') handles = raw.split(/\s*[,\n]\s*/);
			return handles.map(norm).filter(isNonNull).map((h: string) => ({ type: 'handle', value: h }));
		}
		_loadV1() {
			const v = this._getGM(this.KEY_V1, null);
			if (!v || typeof v !== 'object' || v.version !== 1 || !Array.isArray(v.handles)) return [];
			return v.handles.map(norm).filter(isNonNull).map((h: string) => ({ type: 'handle', value: h }));
		}
		_loadV2() {
			const v = this._getGM(this.KEY_V2, null);
			if (!v || typeof v !== 'object' || v.version !== 2 || !Array.isArray(v.items)) return [];
			return v.items.filter((it: any) => it && typeof it.value === 'string' && ['id', 'handle', 'regex'].includes(it.type));
		}
		_hasValidV2() {
			const v = this._getGM(this.KEY_V2, null);
			return !!v && typeof v === 'object' && v.version === 2 && Array.isArray(v.items);
		}
		_itemKey(item: BlockItem) {
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			if (item.type === 'handle') return `h:${getHandleCompareKey(item.value, caseSensitive)}`;
			if (item.type === 'id') return `i:${item.value}`;
			return `r:${item.value}/${item.flags || ''}`;
		}
		_compareRevision(a: any, b: any) {
			if (!a) return -1;
			if (!b) return 1;
			if (a.clock !== b.clock) return a.clock > b.clock ? 1 : -1;
			return String(a.writer || '').localeCompare(String(b.writer || ''));
		}
		_nextRevision() { return { clock: Math.max(this._clock, Date.now()) + 1, writer: this._writerId }; }
		_normalizeRevision(value: any, fallback = 0) {
			return value && Number.isFinite(value.clock)
				? { clock: Number(value.clock), writer: String(value.writer || '') }
				: { clock: fallback, writer: '' };
		}
		_hydrateSync(raw: any, items: BlockItem[]) {
			const sync = raw?.sync && typeof raw.sync === 'object' ? raw.sync : {};
			this._clock = Math.max(this._clock, Number(sync.clock) || 0, Number(raw?.updatedAt) || 0);
			this._clearRevision = sync.clear ? this._normalizeRevision(sync.clear) : null;
			this._entries = {};
			for (const [key, value] of Object.entries(sync.entries || {})) {
				const entry: any = value;
				this._entries[key] = { revision: this._normalizeRevision(entry?.revision), deleted: !!entry?.deleted, item: entry?.item };
			}
			for (const item of items) {
				const key = this._itemKey(item);
				if (!this._entries[key]) this._entries[key] = { revision: this._normalizeRevision(null, Number(raw?.updatedAt) || 0), deleted: false, item };
				else this._entries[key].item = item;
			}
		}
		_snapshot() {
			return {
				version: 2,
				updatedAt: Date.now(),
				items: this._items,
				sync: { clock: this._clock, clear: this._clearRevision, entries: this._entries }
			};
		}
		_rebuildItems() {
			const values: BlockItem[] = [];
			for (const entry of Object.values(this._entries) as any[]) {
				if (entry.deleted || !entry.item || this._compareRevision(entry.revision, this._clearRevision) <= 0) continue;
				values.push(entry.item);
			}
			this._items = this._normalizeItems(values);
		}
		_normalizeItems(items: any[]): BlockItem[] {
			const normed: BlockItem[] = [];
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			for (const it of items || []) {
				if (!it || !it.value) continue;
				if (it.type === 'handle') {
					const h = sanitizeHandle(it.value);
					if (!h) continue;
					normed.push({ type: 'handle', value: h });
				} else if (it.type === 'id') {
					const id = String(it.value).trim(); if (!isChannelId(id)) continue; normed.push({ type: 'id', value: id });
				} else if (it.type === 'regex') {
					const spec = validateRegexSpec(it.value, it.flags || '');
					if (spec) normed.push({ type: 'regex', value: spec.pattern, flags: spec.flags });
				}
			}
			// dedupe
			const unique: BlockItem[] = [];
			const seen = new Set<string>();
			for (const it of normed) {
				const key = it.type === 'handle'
					? `h:${getHandleCompareKey(it.value, caseSensitive)}`
					: it.type === 'id'
						? `i:${it.value}`
						: `r:${it.value}/${it.flags || ''}`;
				if (seen.has(key)) continue; seen.add(key); unique.push(it);
			}
			return unique;
		}
		_saveV2(items: any[]): BlockItem[] {
			const unique = this._normalizeItems(items);
			if (this._arraysEqual(this._items, unique)) { this._items = unique; return unique; }
			const previousItems = Array.isArray(this._items) ? this._items : [];
			const previousEntries = Object.fromEntries(Object.entries(this._entries).map(([key, entry]: [string, any]) => [key, {
				...entry,
				revision: entry.revision ? { ...entry.revision } : entry.revision,
				item: entry.item ? { ...entry.item } : entry.item
			}]));
			const previousClearRevision = this._clearRevision;
			const previousClock = this._clock;
			const previous = new Map<string, BlockItem>((this._items || []).map((item: BlockItem) => [this._itemKey(item), item]));
			const next = new Map<string, BlockItem>(unique.map(item => [this._itemKey(item), item]));
			const revision = this._nextRevision();
			this._clock = revision.clock;
			if (!unique.length && previous.size) this._clearRevision = revision;
			for (const [key, item] of next) {
				if (!previous.has(key)) this._entries[key] = { revision, deleted: false, item };
			}
			for (const key of previous.keys()) {
				if (!next.has(key) && unique.length) this._entries[key] = { revision, deleted: true, item: previous.get(key) };
			}
			this._items = unique;
			if (!this._setGM(this.KEY_V2, this._snapshot())) {
				this._items = previousItems;
				this._entries = previousEntries;
				this._clearRevision = previousClearRevision;
				this._clock = previousClock;
				return this.all();
			}
			return unique;
		}

		setAllLocal(items: any[]) { this._items = this._normalizeItems(items); return this.all(); }
		mergeRemote(raw: any) {
			if (!raw || raw.version !== 2 || !Array.isArray(raw.items)) return false;
			const localEntries = this._entries;
			const localClear = this._clearRevision;
			const localItems = this._items;
			const localClock = this._clock;
			const remoteItems = this._normalizeItems(raw.items);
			this._hydrateSync(raw, remoteItems);
			const remoteEntries = this._entries;
			const remoteClear = this._clearRevision;
			this._entries = { ...remoteEntries };
			this._clearRevision = this._compareRevision(localClear, remoteClear) > 0 ? localClear : remoteClear;
			for (const [key, local] of Object.entries(localEntries) as any[]) {
				const remote = this._entries[key];
				if (!remote || this._compareRevision(local.revision, remote.revision) > 0) this._entries[key] = local;
			}
			this._clock = Math.max(this._clock, ...Object.values(this._entries).map((entry: any) => Number(entry.revision?.clock) || 0));
			this._rebuildItems();
			const changed = !this._arraysEqual(this._items, remoteItems) || this._compareRevision(localClear, remoteClear) > 0 || Object.keys(localEntries).some(key => !remoteEntries[key] || this._compareRevision(localEntries[key].revision, remoteEntries[key].revision) > 0);
			if (changed && !this._setGM(this.KEY_V2, this._snapshot())) {
				this._entries = localEntries;
				this._clearRevision = localClear;
				this._items = localItems;
				this._clock = localClock;
				return false;
			}
			return changed || !this._arraysEqual(localItems, this._items);
		}

		_arraysEqual(a: BlockItem[], b: BlockItem[]) {
			if (a === b) return true;
			if (!Array.isArray(a) || !Array.isArray(b)) return false;
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) {
				const A = a[i], B = b[i];
				if (!A || !B || A.type !== B.type || A.value !== B.value || (A.flags || '') !== (B.flags || '')) return false;
			}
			return true;
		}
		_init() {
			if (this._hasValidV2()) {
				const raw = this._getGM(this.KEY_V2, null);
				const items = this._normalizeItems(this._loadV2());
				this._hydrateSync(raw, items);
				this._items = items;
				return items;
			}
			return this._saveV2([...this._loadV1(), ...this._loadLegacy()]);
		}
		all(): BlockItem[] { return this._items.slice(); }
		setAll(items: any[]) { return this._saveV2(items); }
		addHandle(h: any) {
			const v = sanitizeHandle(h);
			if (!v) return false;
			const before = this._items.length;
			this._saveV2([...this._items, { type: 'handle', value: v }]);
			return this._items.length > before;
		}
		addId(id: any) {
			id = (id || '').trim();
			if (!isChannelId(id)) return false;
			const before = this._items.length;
			this._saveV2([...this._items, { type: 'id', value: id }]);
			return this._items.length > before;
		}
		addRegex(pattern: any, flags = '') {
			const spec = validateRegexSpec(pattern, flags);
			if (!spec) return false;
			const before = this._items.length;
			this._saveV2([...this._items, { type: 'regex', value: spec.pattern, flags: spec.flags }]);
			return this._items.length > before;
		}
		remove(item: BlockItem) {
			const key = getItemKey(item);
			const before = this._items.length;
			this._saveV2(this._items.filter((it: BlockItem) => {
				const k = getItemKey(it);
				return k !== key;
			}));
			return this._items.length < before;
		}
		clear() { return this._saveV2([]).length === 0; }
	}

