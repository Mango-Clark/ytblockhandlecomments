
	/* ----------------------------------------------------------
	 * 2. App settings storage
	 * ---------------------------------------------------------- */
	export class AppSettingsStorage {
		[key: string]: any;
		constructor() {
			this.KEY = 'app_settings_v1';
			this._state = this._init();
		}
		_getGM(key: string, def: any) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key: string, val: any) { try { GM_setValue(key, val); } catch { } }
		_normalizeState(raw: any) {
			const src = raw && typeof raw === 'object' ? raw : {};
			return {
				version: 1,
				handleCaseSensitive: !!src.handleCaseSensitive,
				autoAddRegexHandles: !!src.autoAddRegexHandles,
				dislikeMode: ['none', 'new-hidden', 'always'].includes(src.dislikeMode) ? src.dislikeMode : 'none',
				commentBlockMode: ['hide', 'placeholder', 'placeholder-reveal'].includes(src.commentBlockMode) ? src.commentBlockMode : 'hide'
			};
		}
		_init() {
			return this._normalizeState(this._getGM(this.KEY, null));
		}
		getState() {
			return { ...this._state };
		}
		setAllLocal(state: any) {
			this._state = this._normalizeState(state);
			return this.getState();
		}
		_saveState(nextState: any) {
			const normalized = this._normalizeState(nextState);
			if (
				this._state.handleCaseSensitive === normalized.handleCaseSensitive &&
				this._state.autoAddRegexHandles === normalized.autoAddRegexHandles &&
				this._state.dislikeMode === normalized.dislikeMode &&
				this._state.commentBlockMode === normalized.commentBlockMode
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
		setHandleCaseSensitive(enabled: any) {
			return this._saveState({ ...this._state, handleCaseSensitive: !!enabled });
		}
		isAutoAddRegexHandlesEnabled() {
			return !!this._state.autoAddRegexHandles;
		}
		setAutoAddRegexHandlesEnabled(enabled: any) {
			return this._saveState({ ...this._state, autoAddRegexHandles: !!enabled });
		}
		getDislikeMode() {
			return this._state.dislikeMode || 'none';
		}
		setDislikeMode(mode: any) {
			return this._saveState({ ...this._state, dislikeMode: mode });
		}
		getCommentBlockMode() {
			return this._state.commentBlockMode || 'hide';
		}
		setCommentBlockMode(mode: any) {
			return this._saveState({ ...this._state, commentBlockMode: mode });
		}
		resetSettings() {
			return this._saveState({});
		}
	}

