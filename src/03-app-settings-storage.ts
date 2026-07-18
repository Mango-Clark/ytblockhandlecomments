
	/* ----------------------------------------------------------
	 * 2. App settings storage
	 * ---------------------------------------------------------- */
	export class AppSettingsStorage {
		[key: string]: any;
		constructor() {
			this.KEY = 'app_settings_v1';
			this.CONSOLE_TIME_FORMATS = ['iso', 'iso-date', 'iso-time', 'iso-basic'];
			this.THEME_MODES = ['light', 'dark', 'system', 'system-inverted', 'youtube', 'youtube-inverted', 'custom'];
			this.THEME_DEFAULTS = {
				background: '#f8f9fa', surface: '#ffffff', text: '#202124', muted: '#5f6368',
				border: '#d0d7de', primary: '#065fd4', danger: '#b3261e'
			};
			this.DISPLAY_SCALE = {
				1: 0.92,
				2: 1,
				3: 1.08,
				4: 1.16,
				5: 1.24
			};
			this._state = this._init();
			this._applyDisplaySettings();
			this._bindThemeUpdates();
			this._applyThemeSettings();
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
		_normalizeThemeColor(value: any, fallback: string) {
			const color = String(value || '').trim();
			return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
		}
		_normalizeThemeCustom(value: any) {
			const source = value && typeof value === 'object' ? value : {};
			return Object.fromEntries(Object.entries(this.THEME_DEFAULTS).map(([key, fallback]) => [
				key, this._normalizeThemeColor(source[key], String(fallback))
			]));
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
		_normalizeConsolePrefix(value: any) {
			const prefix = String(value ?? '[YTCB]').trim();
			return prefix && prefix.length <= 64 && !this._hasControlCharacter(prefix) ? prefix : '[YTCB]';
		}
		_hasControlCharacter(value: string) {
			return Array.from(value).some(character => {
				const code = character.codePointAt(0) || 0;
				return code < 32 || code === 127;
			});
		}
		_normalizeConsoleTimeFormat(value: any) {
			const format = String(value ?? 'iso').trim();
			return this.CONSOLE_TIME_FORMATS.includes(format) || this._isValidConsoleTimeFormat(format) ? format : 'iso';
		}
		_isValidConsoleTimeFormat(value: any) {
			const format = String(value || '').trim();
			if (!format || format.length > 80) return false;
			const parts = format.match(/yyyy|yy|MM|dd|HH|mm|ss|SSS|XXX|X|T|Z|[^A-Za-z]+/g);
			return !!parts && parts.join('') === format;
		}
		_isValidTimeZone(value: any) {
			const zone = String(value || '').trim();
			if (!zone || zone.length > 64) return false;
			if (/^offset:[+-](?:0\d|1[0-4]):00$/.test(zone)) return true;
			const aliases: Record<string, string> = { KST: 'Asia/Seoul', JST: 'Asia/Tokyo', CET: 'Europe/Berlin', CEST: 'Europe/Berlin', EST: 'America/New_York', EDT: 'America/New_York', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles' };
			try { Intl.DateTimeFormat('en-US', { timeZone: aliases[zone] || zone }); return true; } catch { return false; }
		}
		getLoggingValidationError(config: any) {
			const prefix = String(config?.consolePrefix ?? '').trim();
			if (!prefix || prefix.length > 64 || this._hasControlCharacter(prefix)) return 'prefix';
			if (!this._isValidConsoleTimeFormat(config?.consoleTimeFormat) && !this.CONSOLE_TIME_FORMATS.includes(String(config?.consoleTimeFormat))) return 'format';
			const zone = String(config?.consoleTimeZone ?? 'system');
			if (zone === 'system') return null;
			const target = zone === 'userinput' ? config?.consoleTimeZoneInput : zone;
			return this._isValidTimeZone(target) ? null : 'timezone';
		}
		_normalizeState(raw: any) {
			const src = raw && typeof raw === 'object' ? raw : {};
			const pairUpdateUidCheck = !!src.pairUpdateUidCheck;
			const pairUpdateHandleLookup = src.pairUpdateHandleLookup !== false;
			const keywordFields = src.keywordFields && typeof src.keywordFields === 'object' ? src.keywordFields : {};
			const keywordActions = src.keywordActions && typeof src.keywordActions === 'object' ? src.keywordActions : {};
			const logging = src.logging && typeof src.logging === 'object' ? src.logging : {};
			const themeMode = this.THEME_MODES.includes(src.themeMode) ? src.themeMode : 'system';
			return {
				version: 1,
				handleCaseSensitive: !!src.handleCaseSensitive,
				autoAddRegexHandles: !!src.autoAddRegexHandles,
				blockMatchMode: ['handle', 'pair'].includes(src.blockMatchMode) ? src.blockMatchMode : 'handle',
				pairUpdateUidCheck,
				pairUpdateHandleLookup: pairUpdateUidCheck || pairUpdateHandleLookup ? pairUpdateHandleLookup : true,
				keywordAutomationEnabled: src.keywordAutomationEnabled !== false,
				themeMode,
				themeCustom: this._normalizeThemeCustom(src.themeCustom),
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
					retention: [100, 500, 1000].includes(Number(logging.retention)) ? Number(logging.retention) : 500,
					consolePrefix: this._normalizeConsolePrefix(logging.consolePrefix),
					consoleTimestampEnabled: !!logging.consoleTimestampEnabled,
					consoleTimeFormat: this._normalizeConsoleTimeFormat(logging.consoleTimeFormat),
					consoleTimeZone: this._isValidTimeZone(logging.consoleTimeZone) || ['system', 'userinput'].includes(logging.consoleTimeZone) ? logging.consoleTimeZone : 'system',
					consoleTimeZoneInput: String(logging.consoleTimeZoneInput || '').trim().slice(0, 64)
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
		_getSystemDark() {
			try { return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches; } catch { return false; }
		}
		_getYouTubeDark() {
			if (typeof document !== 'object') return this._getSystemDark();
			const root = document.documentElement;
			return !!(root?.hasAttribute?.('dark') || root?.classList?.contains?.('dark') || document.querySelector?.('ytd-app[dark]'));
		}
		_resolveThemeDark(mode = this.getThemeMode()) {
			if (mode === 'dark') return true;
			if (mode === 'light' || mode === 'custom') return false;
			const dark = mode.startsWith('youtube') ? this._getYouTubeDark() : this._getSystemDark();
			return mode.endsWith('inverted') ? !dark : dark;
		}
		_applyThemeSettings() {
			if (typeof document !== 'object' || !document?.documentElement) return;
			const root = document.documentElement;
			const mode = this.getThemeMode();
			const isCustom = mode === 'custom';
			const themeClass = isCustom ? 'tm-theme-custom' : this._resolveThemeDark(mode) ? 'tm-theme-dark' : 'tm-theme-light';
			for (const name of ['tm-theme-light', 'tm-theme-dark', 'tm-theme-custom']) {
				if (name !== themeClass && root.classList?.contains?.(name)) root.classList.remove(name);
			}
			if (!root.classList?.contains?.(themeClass)) root.classList?.add?.(themeClass);
			if (root.dataset.tmThemeMode !== mode) root.dataset.tmThemeMode = mode;
			for (const [key, value] of Object.entries(this.getThemeCustom())) {
				const variable = `--tm-theme-${key}`;
				if (isCustom) {
					if (root.style?.getPropertyValue?.(variable) !== String(value)) root.style?.setProperty?.(variable, String(value));
				} else if (root.style?.getPropertyValue?.(variable)) {
					root.style?.removeProperty?.(variable);
				}
			}
		}
		_onYouTubeThemeMutation(records: MutationRecord[] = []) {
			if (!this.getThemeMode().startsWith('youtube')) return;
			const root = typeof document === 'object' ? document.documentElement : null;
			const app = this._youtubeThemeTarget;
			const hasYouTubeThemeChange = records.some(record =>
				(record.target === root && record.attributeName === 'dark') ||
				(record.target === app && ['dark', 'class'].includes(record.attributeName || ''))
			);
			if (hasYouTubeThemeChange) this._applyThemeSettings();
		}
		_watchYouTubeThemeTarget() {
			const app = typeof document === 'object' ? document.querySelector?.('ytd-app') : null;
			if (app === this._youtubeThemeTarget) return;
			this._youtubeThemeTarget = app;
			this._youtubeAppThemeObserver?.disconnect?.();
			if (app) this._youtubeAppThemeObserver?.observe?.(app, { attributes: true, attributeFilter: ['class', 'dark'] });
		}
		_bindThemeUpdates() {
			try {
				this._themeMediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
				this._themeMediaQuery?.addEventListener?.('change', () => this._applyThemeSettings());
			} catch { }
			try {
				this._youtubeRootThemeObserver = new MutationObserver(records => this._onYouTubeThemeMutation(records));
				this._youtubeAppThemeObserver = new MutationObserver(records => this._onYouTubeThemeMutation(records));
				this._youtubeAppDiscoveryObserver = new MutationObserver(() => this._watchYouTubeThemeTarget());
				this._youtubeRootThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
				this._youtubeAppDiscoveryObserver.observe(document.body, { childList: true, subtree: true });
				this._watchYouTubeThemeTarget();
			} catch { }
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
			this._applyThemeSettings();
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
				this._state.themeMode === normalized.themeMode &&
				JSON.stringify(this._state.themeCustom) === JSON.stringify(normalized.themeCustom) &&
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
				this._applyThemeSettings();
				return this.getState();
			}
			this._state = normalized;
			this._applyDisplaySettings();
			this._applyThemeSettings();
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
		getThemeMode() {
			return this.THEME_MODES.includes(this._state.themeMode) ? this._state.themeMode : 'system';
		}
		setThemeMode(mode: any) {
			return this._saveState({ ...this._state, themeMode: mode });
		}
		getThemeCustom() {
			return { ...this._state.themeCustom };
		}
		setThemeCustom(colors: any) {
			return this._saveState({ ...this._state, themeCustom: colors });
		}
		resetThemeCustom() {
			return this._saveState({ ...this._state, themeCustom: this.THEME_DEFAULTS });
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
			const logging = { ...this.getLogging(), ...config };
			if (this.getLoggingValidationError(logging)) return null;
			return this._saveState({ ...this._state, logging });
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

