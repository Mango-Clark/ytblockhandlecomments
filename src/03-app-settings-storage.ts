
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
		_normalizeVerboseLevel(value: any) {
			const level = Number(value);
			if (!Number.isInteger(level) || level < 0 || level > 5) return 3;
			return level;
		}
		_normalizeKeywords(value: any): string[] {
			const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : [];
			const seen = new Set<string>();
			const keywords: string[] = [];
			for (const item of source) {
				const keyword = String(item || '').trim().slice(0, 128);
				const key = keyword.toLocaleLowerCase();
				if (!key || seen.has(key)) continue;
				seen.add(key);
				keywords.push(keyword);
				if (keywords.length >= 50) break;
			}
			return keywords;
		}
		_normalizeState(raw: any) {
			const src = raw && typeof raw === 'object' ? raw : {};
			const pairUpdateUidCheck = !!src.pairUpdateUidCheck;
			const pairUpdateHandleLookup = src.pairUpdateHandleLookup !== false;
			const keywordFields = src.keywordFields && typeof src.keywordFields === 'object' ? src.keywordFields : {};
			const keywordActions = src.keywordActions && typeof src.keywordActions === 'object' ? src.keywordActions : {};
			const logging = src.logging && typeof src.logging === 'object' ? src.logging : {};
			return {
				version: 1,
				handleCaseSensitive: !!src.handleCaseSensitive,
				autoAddRegexHandles: !!src.autoAddRegexHandles,
				blockMatchMode: ['handle', 'pair'].includes(src.blockMatchMode) ? src.blockMatchMode : 'handle',
				pairUpdateUidCheck,
				pairUpdateHandleLookup: pairUpdateUidCheck || pairUpdateHandleLookup ? pairUpdateHandleLookup : true,
				keywordAutomationEnabled: src.keywordAutomationEnabled !== false,
				keywordRules: this._normalizeKeywords(src.keywordRules),
				keywordFields: {
					commentText: keywordFields.commentText !== false,
					handle: !!keywordFields.handle,
					pinned: !!keywordFields.pinned
				},
				keywordActions: {
					dislike: !!keywordActions.dislike,
					blockHandle: !!keywordActions.blockHandle,
					createPair: !!keywordActions.createPair
				},
				logging: {
					fileEnabled: !!logging.fileEnabled,
					consoleEnabled: !!logging.consoleEnabled,
					level: ['error', 'warn', 'info', 'debug'].includes(logging.level) ? logging.level : 'warn',
					retention: [100, 500, 1000].includes(Number(logging.retention)) ? Number(logging.retention) : 500
				},
				verboseLevel: this._normalizeVerboseLevel(src.verboseLevel),
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
				this._state.keywordAutomationEnabled === normalized.keywordAutomationEnabled &&
				JSON.stringify(this._state.keywordRules) === JSON.stringify(normalized.keywordRules) &&
				JSON.stringify(this._state.keywordFields) === JSON.stringify(normalized.keywordFields) &&
				JSON.stringify(this._state.keywordActions) === JSON.stringify(normalized.keywordActions) &&
				JSON.stringify(this._state.logging) === JSON.stringify(normalized.logging) &&
				this._state.verboseLevel === normalized.verboseLevel &&
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
		isKeywordAutomationEnabled() {
			return this._state.keywordAutomationEnabled !== false;
		}
		setKeywordAutomationEnabled(enabled: any) {
			return this._saveState({ ...this._state, keywordAutomationEnabled: !!enabled });
		}
		getKeywordAutomation() {
			return {
				keywords: this._state.keywordRules.slice(),
				fields: { ...this._state.keywordFields },
				actions: { ...this._state.keywordActions }
			};
		}
		setKeywordAutomation(config: any) {
			return this._saveState({
				...this._state,
				keywordRules: config?.keywords,
				keywordFields: config?.fields,
				keywordActions: config?.actions
			});
		}
		getLogging() {
			return { ...this._state.logging };
		}
		setLogging(config: any) {
			return this._saveState({ ...this._state, logging: config });
		}
		getVerboseLevel() {
			return this._normalizeVerboseLevel(this._state.verboseLevel);
		}
		setVerboseLevel(level: any) {
			return this._saveState({ ...this._state, verboseLevel: this._normalizeVerboseLevel(level) });
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

