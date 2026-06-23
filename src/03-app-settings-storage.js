	/* ----------------------------------------------------------
	 * 2. App settings storage
	 * ---------------------------------------------------------- */
	class AppSettingsStorage {
		constructor() {
			this.KEY = 'app_settings_v1';
			this._state = this._init();
		}
		_getGM(key, def) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key, val) { try { GM_setValue(key, val); } catch { } }
		_normalizeState(raw) {
			const src = raw && typeof raw === 'object' ? raw : {};
			return {
				version: 1,
				handleCaseSensitive: !!src.handleCaseSensitive,
				autoAddRegexHandles: !!src.autoAddRegexHandles,
				dislikeMode: ['none', 'new-hidden', 'always'].includes(src.dislikeMode) ? src.dislikeMode : 'new-hidden'
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
			if (
				this._state.handleCaseSensitive === normalized.handleCaseSensitive &&
				this._state.autoAddRegexHandles === normalized.autoAddRegexHandles &&
				this._state.dislikeMode === normalized.dislikeMode
			) {
				this._state = normalized;
				return this.getState();
			}
			this._state = normalized;
			this._setGM(this.KEY, this._state);
			return this.getState();
		}
		isHandleCaseSensitive() {
			return !!this._state.handleCaseSensitive;
		}
		setHandleCaseSensitive(enabled) {
			return this._saveState({ ...this._state, handleCaseSensitive: !!enabled });
		}
		isAutoAddRegexHandlesEnabled() {
			return !!this._state.autoAddRegexHandles;
		}
		setAutoAddRegexHandlesEnabled(enabled) {
			return this._saveState({ ...this._state, autoAddRegexHandles: !!enabled });
		}
		getDislikeMode() {
			return this._state.dislikeMode || 'new-hidden';
		}
		setDislikeMode(mode) {
			return this._saveState({ ...this._state, dislikeMode: mode });
		}
	}

