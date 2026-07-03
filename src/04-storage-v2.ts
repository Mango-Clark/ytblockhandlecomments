	/* ----------------------------------------------------------
	 * 3. Storage V2 (id/handle/regex) + migration
	 * ---------------------------------------------------------- */
	class StorageV2 {
		// v2 schema: { version: 2, updatedAt: number, items: Array<{type:'id'|'handle'|'regex', value:string, flags?:string}> }
		constructor(settings) {
			this.settings = settings;
			this.KEY_LEGACY = 'blockedHandles';
			this.KEY_V1 = 'blockedHandles_v1';
			this.KEY_V2 = 'blocked_v2';
			this._items = this._init();
		}
		_getGM(key, def) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key, val) { try { GM_setValue(key, val); } catch { } }

		_loadLegacy() {
			const raw = this._getGM(this.KEY_LEGACY, []);
			let handles = [];
			if (Array.isArray(raw)) handles = raw;
			else if (typeof raw === 'string') handles = raw.split(/\s*[,\n]\s*/);
			return handles.map(norm).filter(Boolean).map(h => ({ type: 'handle', value: h }));
		}
		_loadV1() {
			const v = this._getGM(this.KEY_V1, null);
			if (!v || typeof v !== 'object' || v.version !== 1 || !Array.isArray(v.handles)) return [];
			return v.handles.map(norm).filter(Boolean).map(h => ({ type: 'handle', value: h }));
		}
		_loadV2() {
			const v = this._getGM(this.KEY_V2, null);
			if (!v || typeof v !== 'object' || v.version !== 2 || !Array.isArray(v.items)) return [];
			return v.items.filter(it => it && typeof it.value === 'string' && ['id', 'handle', 'regex'].includes(it.type));
		}
		_normalizeItems(items) {
			const normed = [];
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
			const unique = [];
			const seen = new Set();
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
		_saveV2(items) {
			const unique = this._normalizeItems(items);
			if (this._arraysEqual(this._items, unique)) { this._items = unique; return unique; }
			this._setGM(this.KEY_V2, { version: 2, updatedAt: Date.now(), items: unique });
			this._items = unique; return unique;
		}

		setAllLocal(items) { this._items = this._normalizeItems(items); return this.all(); }

		_arraysEqual(a, b) {
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
			const merged = [...this._loadV2(), ...this._loadV1(), ...this._loadLegacy()];
			return this._saveV2(merged);
		}
		all() { return this._items.slice(); }
		setAll(items) { return this._saveV2(items); }
		addHandle(h) {
			const v = sanitizeHandle(h);
			if (!v) return false;
			const before = this._items.length;
			this._saveV2([...this._items, { type: 'handle', value: v }]);
			return this._items.length > before;
		}
		addId(id) {
			id = (id || '').trim();
			if (!isChannelId(id)) return false;
			const before = this._items.length;
			this._saveV2([...this._items, { type: 'id', value: id }]);
			return this._items.length > before;
		}
		addRegex(pattern, flags = '') {
			const spec = validateRegexSpec(pattern, flags);
			if (!spec) return false;
			const before = this._items.length;
			this._saveV2([...this._items, { type: 'regex', value: spec.pattern, flags: spec.flags }]);
			return this._items.length > before;
		}
		remove(item) {
			const key = getItemKey(item);
			const before = this._items.length;
			this._saveV2(this._items.filter(it => {
				const k = getItemKey(it);
				return k !== key;
			}));
			return this._items.length < before;
		}
		clear() { this._saveV2([]); }
	}

