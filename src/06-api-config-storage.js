	/* ----------------------------------------------------------
	 * 5. API config storage
	 * ---------------------------------------------------------- */
	class ApiConfigStorage {
		constructor() {
			this.KEY = 'youtube_data_api_v3_config';
			this._state = this._init();
		}
		_getGM(key, def) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key, val) { try { GM_setValue(key, val); } catch { } }
		_defaultState() {
			return { version: 2, apiKey: '', lastTestResult: null, quotaFailureCount: 0, lastQuotaFailureAt: null };
		}
		_normalizeTestResult(raw) {
			if (!raw || typeof raw !== 'object') return null;
			const category = ['ok', 'invalid', 'quota', 'forbidden', 'network', 'unknown'].includes(raw.category)
				? raw.category
				: 'unknown';
			return {
				checkedAt: Number.isFinite(raw.checkedAt) ? raw.checkedAt : Date.now(),
				ok: !!raw.ok,
				category,
				httpStatus: Number.isFinite(raw.httpStatus) ? raw.httpStatus : null,
				message: typeof raw.message === 'string' && raw.message.trim()
					? raw.message.trim()
					: (category === 'ok' ? 'OK' : 'Unknown')
			};
		}
		_normalizeState(raw) {
			const src = raw && typeof raw === 'object' ? raw : {};
			return {
				version: 2,
				apiKey: typeof src.apiKey === 'string' ? src.apiKey.trim() : '',
				lastTestResult: this._normalizeTestResult(src.lastTestResult),
				quotaFailureCount: Number.isFinite(src.quotaFailureCount) && src.quotaFailureCount > 0
					? Math.floor(src.quotaFailureCount)
					: 0,
				lastQuotaFailureAt: Number.isFinite(src.lastQuotaFailureAt) ? src.lastQuotaFailureAt : null
			};
		}
		_init() {
			return this._normalizeState(this._getGM(this.KEY, null));
		}
		getState() {
			return { ...this._state };
		}
		setAllLocal(state) {
			this._state = this._normalizeState(state);
			return this.getState();
		}
		_saveState(nextState) {
			const normalized = this._normalizeState(nextState);
			const sameResult = JSON.stringify(this._state.lastTestResult) === JSON.stringify(normalized.lastTestResult);
			if (
				this._state.apiKey === normalized.apiKey &&
				sameResult &&
				this._state.quotaFailureCount === normalized.quotaFailureCount &&
				(this._state.lastQuotaFailureAt || null) === (normalized.lastQuotaFailureAt || null)
			) {
				this._state = normalized;
				return this.getState();
			}
			this._state = normalized;
			this._setGM(this.KEY, this._state);
			return this.getState();
		}
		hasApiKey() {
			return !!this._state.apiKey;
		}
		getApiKey() {
			return this._state.apiKey;
		}
		getLastTestResult() {
			return this._state.lastTestResult ? { ...this._state.lastTestResult } : null;
		}
		getQuotaGuidance() {
			if (this._state.quotaFailureCount < 2 || !this._state.lastQuotaFailureAt) return null;
			return {
				count: this._state.quotaFailureCount,
				lastFailureAt: this._state.lastQuotaFailureAt,
				resetAt: this._state.lastQuotaFailureAt + 24 * 60 * 60 * 1000
			};
		}
		setApiKey(apiKey) {
			const nextKey = String(apiKey || '').trim();
			return this._saveState({
				...this._state,
				apiKey: nextKey,
				lastTestResult: this._state.apiKey === nextKey ? this._state.lastTestResult : null,
				quotaFailureCount: this._state.apiKey === nextKey ? this._state.quotaFailureCount : 0,
				lastQuotaFailureAt: this._state.apiKey === nextKey ? this._state.lastQuotaFailureAt : null
			});
		}
		clearApiKey() {
			return this._saveState({ ...this._state, apiKey: '', lastTestResult: null, quotaFailureCount: 0, lastQuotaFailureAt: null });
		}
		setLastTestResult(result) {
			const normalized = this._normalizeTestResult(result);
			const quotaFailureCount = normalized?.category === 'quota'
				? this._state.quotaFailureCount + 1
				: (normalized?.ok ? 0 : this._state.quotaFailureCount);
			return this._saveState({
				...this._state,
				lastTestResult: normalized,
				quotaFailureCount,
				lastQuotaFailureAt: normalized?.category === 'quota' ? normalized.checkedAt : this._state.lastQuotaFailureAt
			});
		}
		clearLastTestResult() {
			return this._saveState({ ...this._state, lastTestResult: null, quotaFailureCount: 0, lastQuotaFailureAt: null });
		}
		getMaskedApiKey() {
			const key = this.getApiKey();
			if (!key) return '';
			if (key.length <= 8) return '•'.repeat(key.length);
			return `${key.slice(0, 4)}...${key.slice(-4)}`;
		}
	}

