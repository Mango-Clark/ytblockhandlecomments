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
			this._items = this._init();
		}
		_getGM(key: string, def: any) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key: string, val: any) { try { GM_setValue(key, val); } catch { } }

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
			this._setGM(this.KEY_V2, { version: 2, updatedAt: Date.now(), items: unique });
			this._items = unique; return unique;
		}

		setAllLocal(items: any[]) { this._items = this._normalizeItems(items); return this.all(); }

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
			if (this._hasValidV2()) return this._saveV2(this._loadV2());
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
		clear() { this._saveV2([]); }
	}

