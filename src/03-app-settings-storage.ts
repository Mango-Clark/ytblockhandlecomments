
	/* ----------------------------------------------------------
	 * 2. App settings storage
	 * ---------------------------------------------------------- */
	export class AppSettingsStorage {
		[key: string]: any;
		constructor() {
			this.KEY = 'app_settings_v1';
			this.DISPLAY_SCALE = {
				1: 0.92,
				2: 1,
				3: 1.08,
				4: 1.16,
				5: 1.24
			};
			this._state = this._init();
			this._applyDisplaySettings();
		}
		_getGM(key: string, def: any) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key: string, val: any) { try { GM_setValue(key, val); } catch { } }
		_normalizeLevel(value: any) {
			const level = Number(value);
			if (!Number.isInteger(level) || level < 1 || level > 5) return 3;
			return level;
		}
		_normalizeState(raw: any) {
			const src = raw && typeof raw === 'object' ? raw : {};
			const pairUpdateUidCheck = !!src.pairUpdateUidCheck;
			const pairUpdateHandleLookup = src.pairUpdateHandleLookup !== false;
			return {
				version: 1,
				handleCaseSensitive: !!src.handleCaseSensitive,
				autoAddRegexHandles: !!src.autoAddRegexHandles,
				blockMatchMode: ['handle', 'pair'].includes(src.blockMatchMode) ? src.blockMatchMode : 'handle',
				pairUpdateUidCheck,
				pairUpdateHandleLookup: pairUpdateUidCheck || pairUpdateHandleLookup ? pairUpdateHandleLookup : true,
				dislikeMode: ['none', 'new-hidden', 'always'].includes(src.dislikeMode) ? src.dislikeMode : 'none',
				commentBlockMode: ['hide', 'placeholder', 'placeholder-reveal'].includes(src.commentBlockMode) ? src.commentBlockMode : 'hide',
				fontSizeLevel: this._normalizeLevel(src.fontSizeLevel),
				uiScaleLevel: this._normalizeLevel(src.uiScaleLevel)
			};
		}
		_applyDisplaySettings() {
			if (typeof document !== 'object' || !document?.documentElement?.style) return;
			document.documentElement.style.setProperty('--tm-font-scale', String(this.DISPLAY_SCALE[this.getFontSizeLevel()] || 1.08));
			document.documentElement.style.setProperty('--tm-ui-scale', String(this.DISPLAY_SCALE[this.getUiScaleLevel()] || 1.08));
		}
		_init() {
			return this._normalizeState(this._getGM(this.KEY, null));
		}
		getState() {
			return { ...this._state };
		}
		setAllLocal(state: any) {
			this._state = this._normalizeState(state);
			this._applyDisplaySettings();
			return this.getState();
		}
		_saveState(nextState: any) {
			const normalized = this._normalizeState(nextState);
			if (
				this._state.handleCaseSensitive === normalized.handleCaseSensitive &&
				this._state.autoAddRegexHandles === normalized.autoAddRegexHandles &&
				this._state.blockMatchMode === normalized.blockMatchMode &&
				this._state.pairUpdateUidCheck === normalized.pairUpdateUidCheck &&
				this._state.pairUpdateHandleLookup === normalized.pairUpdateHandleLookup &&
				this._state.dislikeMode === normalized.dislikeMode &&
				this._state.commentBlockMode === normalized.commentBlockMode &&
				this._state.fontSizeLevel === normalized.fontSizeLevel &&
				this._state.uiScaleLevel === normalized.uiScaleLevel
			) {
				this._state = normalized;
				this._applyDisplaySettings();
				return this.getState();
			}
			this._state = normalized;
			this._applyDisplaySettings();
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
		getBlockMatchMode() {
			return this._state.blockMatchMode || 'handle';
		}
		setBlockMatchMode(mode: any) {
			return this._saveState({ ...this._state, blockMatchMode: mode });
		}
		isPairUpdateUidCheckEnabled() {
			return !!this._state.pairUpdateUidCheck;
		}
		setPairUpdateUidCheckEnabled(enabled: any) {
			return this._saveState({ ...this._state, pairUpdateUidCheck: !!enabled });
		}
		isPairUpdateHandleLookupEnabled() {
			return this._state.pairUpdateHandleLookup !== false;
		}
		setPairUpdateHandleLookupEnabled(enabled: any) {
			return this._saveState({ ...this._state, pairUpdateHandleLookup: !!enabled });
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
		getFontSizeLevel() {
			return this._normalizeLevel(this._state.fontSizeLevel);
		}
		setFontSizeLevel(level: any) {
			return this._saveState({ ...this._state, fontSizeLevel: this._normalizeLevel(level) });
		}
		getUiScaleLevel() {
			return this._normalizeLevel(this._state.uiScaleLevel);
		}
		setUiScaleLevel(level: any) {
			return this._saveState({ ...this._state, uiScaleLevel: this._normalizeLevel(level) });
		}
		resetSettings() {
			return this._saveState({});
		}
	}

