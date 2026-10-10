import {
	formatDateTime,
	getApiTestCategoryLabel,
	getItemKey,
	createLanguageSelect,
	getLanguagePreference,
	setLanguagePreference,
	getScriptVersion,
	isNonNull,
	parseRegexLiteral,
	safeRegexTest,
	searchManagerIndex,
	buildManagerSearchIndex,
	t,
	validateRegexSpec,
	type ApiTestResult,
	type AppLike,
	type BlockItem,
	type DialogRefreshContext,
	type PairOutcome,
	type PairRunStats
} from './02-utils-i18n.ts';
import { Dialog, Toast } from './08-toast-dialog.ts';
import { createManagerListCacheController, createManagerListController, getManagerPageSize, renderManagerListRows, renderManagerPagination } from './12a-manager-list.ts';
import { refreshSettingsUi, saveManagerLoggingSettings } from './12b-manager-settings.ts';
import { createManagerExport, downloadManagerExport, parseManagerImport, persistManagerImport } from './12c-manager-export.ts';
import { createManagerPairController, getFailedPairHandles, getPairOutcomeLabel, getPairResultItems, renderManagerPairResultList, showManagerPairResultDialog } from './12d-manager-pairing.ts';

	/* ----------------------------------------------------------
	 * 7. BlockListManager (UI + Import/Export)
	 * ---------------------------------------------------------- */
	export class BlockListManager {
		declare app: AppLike;
		declare _listViewState: { searchQuery: string; page?: number; typeFilter: string; tagFilters: string[]; selection: string[]; scrollTop: number };
		constructor(app: AppLike) {
			this.app = app;
			this._listViewState = {
				searchQuery: '',
				typeFilter: 'all',
				tagFilters: [],
				selection: [],
				scrollTop: 0
			};
		}
		_refreshUiOnly() {
			if (typeof this.app.refreshUiOnly === 'function') refreshSettingsUi({ app: this.app });
			else Dialog.refreshAll();
		}
		_makeBadge(code: string) {
			const badge = document.createElement('span');
			badge.className = `tm-badge ${code}`;
			const key = code === 'ucid'
				? 'badgeUcid'
				: code === 'regex'
					? 'badgeRegex'
					: code === 'paired'
						? 'badgePaired'
						: code === 'stale'
							? 'badgeStale'
							: code === 'mismatch'
								? 'badgeMismatch'
								: code === 'unverified'
									? 'badgeUnverified'
									: 'badgeHandleOnly';
			badge.textContent = t(key);
			return badge;
		}
		_createMetaLine(text: any) {
			const div = document.createElement('div');
			div.textContent = text;
			return div;
		}
		_getRegexMatches(regexItem: BlockItem | null | undefined, items: BlockItem[]) {
			if (!regexItem || regexItem.type !== 'regex') return [];
			const handles = (items || []).filter(item => item.type === 'handle');
			const spec = validateRegexSpec(regexItem.value, regexItem.flags || '');
			if (!spec) return [];
			const rx = new RegExp(spec.pattern, spec.flags);
			return handles.filter(item => safeRegexTest(rx, item.value));
		}
		_getPairOutcomeLabel(code: PairOutcome | string) { return getPairOutcomeLabel(code); }
		_getPairResultItems(stats: PairRunStats | null | undefined, options: any = {}) { return getPairResultItems(stats, options); }
		_getFailedPairHandles(stats: PairRunStats | null | undefined) { return getFailedPairHandles(stats); }
		_copyText(text: any) {
			const value = String(text || '');
			try {
				if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
			} catch { }
			const ta = document.createElement('textarea');
			ta.value = value;
			ta.setAttribute('readonly', 'readonly');
			ta.style.position = 'fixed';
			ta.style.left = '-9999px';
			document.body.appendChild(ta);
			try {
				ta.focus();
				if (typeof ta.select === 'function') ta.select();
				if (typeof document.execCommand === 'function') document.execCommand('copy');
			} catch { }
			ta.remove();
			return Promise.resolve();
		}
		_showFailedPairExport(handles: string[]) {
			const body = document.createElement('div');
			const p = document.createElement('p');
			p.textContent = handles.length ? t('exportHint') : t('pairResultFailedEmpty');
			const ta = document.createElement('textarea');
			ta.readOnly = true;
			ta.value = handles.join('\n');
			body.append(p, ta);
			Dialog.show({
				title: t('pairResultFailedTitle'),
				body,
				buttons: [{ label: t('close'), value: false, primary: true }],
				onRefresh: (ctx: DialogRefreshContext) => {
					ctx.setTitle(t('pairResultFailedTitle'));
					p.textContent = handles.length ? t('exportHint') : t('pairResultFailedEmpty');
					ctx.buttons[0].textContent = t('close');
				}
			});
		}
		_getPageSize() { return getManagerPageSize(this.app); }
		_renderPagination(container: HTMLElement, page: number, total: number, onChange: (page: number) => void) { return renderManagerPagination(container, page, total, this._getPageSize(), onChange); }
		_renderPairResultList(container: HTMLElement, stats: PairRunStats | null | undefined) {
			return renderManagerPairResultList(container, stats, this._pairResultContext());
		}
		_pairResultContext() {
			return {
				getPageSize: () => this._getPageSize(),
				renderPagination: (container: HTMLElement, page: number, total: number, onChange: (page: number) => void) => this._renderPagination(container, page, total, onChange),
				copyText: (text: string) => this._copyText(text),
				showFailedExport: (handles: string[]) => this._showFailedPairExport(handles),
				getOutcomeLabel: (code: PairOutcome | string) => this._getPairOutcomeLabel(code),
				getResultItems: (stats: PairRunStats | null | undefined, options: { filter?: string; sort?: string }) => this._getPairResultItems(stats, options),
				getFailedHandles: (stats: PairRunStats | null | undefined) => this._getFailedPairHandles(stats),
				createMetaLine: (text: any) => this._createMetaLine(text)
			};
		}
		_renderApiTestStatus(container: HTMLElement, result: ApiTestResult | null, isRunning: boolean) {
			container.replaceChildren();
			container.className = 'tm-inline-note';
			if (isRunning) {
				container.textContent = t('apiKeyTestRunning');
				return;
			}
			if (!result) {
				container.textContent = t('apiKeyTestIdle');
				return;
			}
			const category = getApiTestCategoryLabel(result.category);
			const statusText = result.httpStatus ? String(result.httpStatus) : '';
			const line = document.createElement('div');
			line.textContent = `${t('apiKeyTestLabel')}: ${t('apiKeyTestResult', category, result.message, statusText)} (${formatDateTime(result.checkedAt) || ''})`;
			container.appendChild(line);
			const guidance = this.app?.apiConfig?.getQuotaGuidance?.();
			if (guidance) {
				const quota = document.createElement('div');
				quota.className = 'tm-inline-note';
				const strong = document.createElement('strong');
				strong.textContent = t('apiQuotaGuidanceTitle');
				const body = document.createElement('div');
				body.textContent = t('apiQuotaGuidance', {
					count: guidance.count,
					reset: formatDateTime(guidance.resetAt) || ''
				});
				quota.append(strong, body);
				container.appendChild(quota);
			}
		}
		_showPairResultDialog(stats: PairRunStats) {
			return showManagerPairResultDialog(stats, this._pairResultContext());
		}
		openBlockKeywordAutomation() {
			const body = document.createElement('div');
			body.className = 'tm-automation-panel';
			const intro = document.createElement('p');
			intro.className = 'tm-muted';
			const regexSection = document.createElement('section');
			regexSection.className = 'tm-section';
			const regexTitle = document.createElement('h3');
			const patternLabel = document.createElement('label');
			const patternText = document.createElement('span');
			const patternInput = document.createElement('input');
			patternInput.dataset.setting = 'regex-pattern';
			const flagsLabel = document.createElement('label');
			const flagsText = document.createElement('span');
			const flagsInput = document.createElement('input');
			flagsInput.dataset.setting = 'regex-flags';
			const addRegexBtn = Object.assign(document.createElement('button'), { className: 'primary' });
			patternLabel.append(patternText, patternInput);
			flagsLabel.append(flagsText, flagsInput);
			regexSection.append(regexTitle, patternLabel, flagsLabel, addRegexBtn);

			const keywordSection = document.createElement('section');
			keywordSection.className = 'tm-section';
			const keywordTitle = document.createElement('h3');
			const keywordLabel = document.createElement('label');
			const keywordText = document.createElement('span');
			const keywordInput = document.createElement('textarea');
			keywordInput.dataset.setting = 'keyword-rules';
			keywordInput.rows = 4;
			keywordLabel.append(keywordText, keywordInput);
			const fieldsTitle = document.createElement('strong');
			const actionsTitle = document.createElement('strong');
			const makeToggle = () => {
				const label = document.createElement('label');
				const input = document.createElement('input');
				input.type = 'checkbox';
				const text = document.createElement('span');
				const help = document.createElement('p');
				label.append(input, text);
				return { label, input, text, help };
			};
			const commentField = makeToggle();
			const handleField = makeToggle();
			const pinnedField = makeToggle();
			const dislikeAction = makeToggle();
			const blockAction = makeToggle();
			const pairAction = makeToggle();
			const keywordHelp = document.createElement('p');
			keywordSection.append(
				keywordTitle,
				keywordLabel,
				fieldsTitle,
				commentField.label, commentField.help,
				handleField.label, handleField.help,
				pinnedField.label, pinnedField.help,
				actionsTitle,
				dislikeAction.label, dislikeAction.help,
				blockAction.label, blockAction.help,
				pairAction.label, pairAction.help,
				keywordHelp
			);
			body.append(intro, regexSection, keywordSection);

			const renderAll = () => {
				const config = this.app.settings.getKeywordAutomation();
				keywordInput.value = config.keywords.join('\n');
				commentField.input.checked = !!config.fields.commentText;
				handleField.input.checked = !!config.fields.handle;
				pinnedField.input.checked = !!config.fields.pinned;
				dislikeAction.input.checked = !!config.actions.dislike;
				blockAction.input.checked = !!config.actions.blockHandle;
				pairAction.input.checked = !!config.actions.createPair;
				pairAction.input.disabled = !!this.app.settings.isLowPerformanceMode?.();
				pairAction.help.textContent = t(pairAction.input.disabled ? 'lowPerformanceHelp' : 'keywordActionCreatePairHelp');
			};
			const applyLanguage = () => {
				intro.textContent = t('blockKeywordAutomationHelp');
				regexTitle.textContent = t('addRegex');
				patternText.textContent = t('patternLabel') + ':';
				flagsText.textContent = t('flagsLabel') + ':';
				addRegexBtn.textContent = t('addBtn');
				keywordTitle.textContent = t('keywordAutomationTitle');
				keywordText.textContent = t('keywordRulesLabel');
				keywordInput.placeholder = t('keywordRulesPlaceholder');
				fieldsTitle.textContent = t('keywordFieldsTitle');
				commentField.text.textContent = t('keywordFieldComment');
				commentField.help.textContent = t('keywordFieldCommentHelp');
				handleField.text.textContent = t('keywordFieldHandle');
				handleField.help.textContent = t('keywordFieldHandleHelp');
				pinnedField.text.textContent = t('keywordFieldPinned');
				pinnedField.help.textContent = t('keywordFieldPinnedHelp');
				actionsTitle.textContent = t('keywordActionsTitle');
				dislikeAction.text.textContent = t('keywordActionDislike');
				dislikeAction.help.textContent = t('keywordActionDislikeHelp');
				blockAction.text.textContent = t('keywordActionBlockHandle');
				blockAction.help.textContent = t('keywordActionBlockHandleHelp');
				pairAction.text.textContent = t('keywordActionCreatePair');
				pairAction.help.textContent = t('keywordActionCreatePairHelp');
				keywordHelp.textContent = t('keywordAutomationHelp');
				renderAll();
			};
			const saveKeywords = () => {
				this.app.settings.setKeywordAutomation({
					keywords: keywordInput.value.split(/\r?\n/),
					fields: {
						commentText: commentField.input.checked,
						handle: handleField.input.checked,
						pinned: pinnedField.input.checked
					},
					actions: {
						dislike: dislikeAction.input.checked,
						blockHandle: blockAction.input.checked,
						createPair: pairAction.input.checked
					}
				});
				this.app.refreshAfterStorageChange();
				renderAll();
			};
			keywordInput.addEventListener('change', saveKeywords);
			[commentField, handleField, pinnedField, dislikeAction, blockAction, pairAction].forEach(toggle => {
				toggle.input.addEventListener('change', saveKeywords);
			});
			addRegexBtn.addEventListener('click', () => {
				let pattern = (patternInput.value || '').trim();
				let flags = (flagsInput.value || '').trim();
				if (!pattern) return;
				const literal = parseRegexLiteral(pattern);
				if (literal) { pattern = literal.pattern; flags = literal.flags || ''; }
				if (!validateRegexSpec(pattern, flags)) { Toast.show(t('invalidRegex')); return; }
				if (!this.app.storage.addRegex(pattern, flags)) { Toast.show(this.app.storage.getLastSaveError() ? t('storageSaveFailed') : t('exists')); return; }
				this.app.refreshAfterStorageChange();
				patternInput.value = '';
				flagsInput.value = '';
				Toast.show(t('addedRegex'));
			});
			applyLanguage();
			Dialog.show({
				title: t('blockKeywordAutomationTitle'),
				body,
				buttons: [
					{ label: t('openBlockList'), value: 'list' },
					{ label: t('openSettings'), value: 'settings' },
					{ label: t('close'), value: false, primary: true }
				],
				onRefresh: (ctx: DialogRefreshContext) => {
					if (ctx.reason === 'storage') return;
					ctx.setTitle(t('blockKeywordAutomationTitle'));
					ctx.buttons[0].textContent = t('openBlockList');
					ctx.buttons[1].textContent = t('openSettings');
					ctx.buttons[2].textContent = t('close');
					applyLanguage();
				}
			}).then(value => {
				if (value === 'list') this.openList();
				else if (value === 'settings') this.openSettings();
			});
		}
		openThemeCustomizer() {
			const body = document.createElement('div');
			const help = document.createElement('p');
			help.className = 'tm-muted';
			const controls = document.createElement('div');
			controls.className = 'tm-setting-controls';
			const colorKeys = ['background', 'surface', 'text', 'muted', 'border', 'primary', 'danger'];
			const inputs = new Map<string, HTMLInputElement>();
			const labels = new Map<string, HTMLSpanElement>();
			for (const key of colorKeys) {
				const label = document.createElement('label');
				const text = document.createElement('span');
				const input = document.createElement('input');
				input.type = 'text';
				input.dataset.themeColor = key;
				label.append(text, input);
				controls.append(label);
				inputs.set(key, input);
				labels.set(key, text);
			}
			body.append(help, controls);
			const isValid = () => Array.from(inputs.values()).every(input => /^#[0-9a-fA-F]{6}$/.test(input.value.trim()));
			const render = () => {
				const colors = this.app.settings.getThemeCustom();
				for (const [key, input] of inputs) input.value = colors[key];
			};
			const applyLanguage = () => {
				help.textContent = t('customThemeHelp');
				for (const [key] of inputs) {
					labels.get(key)!.textContent = t(`themeColor${key[0].toUpperCase()}${key.slice(1)}`);
				}
			};
			inputs.forEach(input => input.addEventListener('input', () => {
				const saveButton = Array.from(document.querySelectorAll('.tm-dialog footer button')).find(button => button.textContent === t('customThemeSave')) as HTMLButtonElement | undefined;
				if (saveButton) saveButton.disabled = !isValid();
			}));
			render();
			applyLanguage();
			Dialog.show({
				title: t('customThemeTitle'),
				body,
				buttons: [
					{ label: t('customThemeReset'), value: 'reset' },
					{ label: t('close'), value: false },
					{ label: t('customThemeSave'), value: 'save', primary: true }
				],
				onRefresh: (ctx: DialogRefreshContext) => {
					ctx.setTitle(t('customThemeTitle'));
					ctx.buttons[0].textContent = t('customThemeReset');
					ctx.buttons[1].textContent = t('close');
					ctx.buttons[2].textContent = t('customThemeSave');
					ctx.buttons[2].disabled = !isValid();
					applyLanguage();
				}
			}).then(value => {
				if (value === 'reset') {
					this.app.settings.resetThemeCustom();
					this._refreshUiOnly();
					this.openThemeCustomizer();
					return;
				}
				if (value !== 'save') return;
				if (!isValid()) { Toast.show(t('customThemeInvalid')); return; }
				const colors = Object.fromEntries(Array.from(inputs.entries()).map(([key, input]) => [key, input.value.trim()]));
				this.app.settings.setThemeCustom(colors);
				this._refreshUiOnly();
			});
		}
		openSettings(section = 'matching', returnToList = false) {
			const markDefaultOption = (select: HTMLSelectElement, value: string | number) => {
				const option = Array.from(select.options).find(item => item.value === String(value));
				option?.classList.add('tm-default-option');
			};
			const defaultOptionText = (option: HTMLOptionElement, label: string) =>
				option.classList.contains('tm-default-option') ? `${label} ${t('defaultOption')}` : label;
			const makeSettingField = (label: HTMLLabelElement, ...details: HTMLElement[]) => {
				const field = document.createElement('div');
				field.className = 'tm-setting-field';
				label.className = label.querySelector('input')?.type === 'checkbox' ? 'tm-setting-label tm-setting-checkbox' : 'tm-setting-label';
				field.append(label, ...details);
				return field;
			};
			const body = document.createElement('div');
			body.className = 'tm-settings-layout';
			const settingsSection = document.createElement('section');
			settingsSection.className = 'tm-section tm-settings-panel';
			const settingsTitle = document.createElement('h3');
			const settingsIntro = document.createElement('p');
			const lowModeLabel = document.createElement('label');
			const lowModeToggle = document.createElement('input');
			lowModeToggle.type = 'checkbox';
			lowModeToggle.dataset.setting = 'low-performance-mode';
			const lowModeText = document.createElement('span');
			const lowModeHelp = document.createElement('p');
			lowModeHelp.className = 'tm-muted';
			lowModeLabel.append(lowModeToggle, lowModeText);
			settingsIntro.className = 'tm-settings-intro tm-muted';
			const settingsList = document.createElement('ul');
			settingsList.className = 'tm-settings-list';
			const matchingGroup = document.createElement('li');
			matchingGroup.className = 'tm-setting-group tm-setting-group-matching';
			const matchingTitle = document.createElement('h4');
			const matchingControls = document.createElement('div');
			matchingControls.className = 'tm-setting-controls';
			const matchModeLabel = document.createElement('label');
			const matchModeText = document.createElement('span');
			const matchModeSelect = document.createElement('select');
			matchModeSelect.dataset.setting = 'block-match-mode';
			['handle', 'pair'].forEach(value => {
				const option = document.createElement('option');
				option.value = value;
				matchModeSelect.appendChild(option);
			});
			matchModeLabel.append(matchModeText, matchModeSelect);
			const matchModeHelp = document.createElement('p');
			const caseLabel = document.createElement('label');
			const caseToggle = document.createElement('input');
			caseToggle.type = 'checkbox';
			const caseText = document.createElement('span');
			caseLabel.append(caseToggle, caseText);
			const caseHelp = document.createElement('p');
			const caseLegacy = document.createElement('p');
			const autoLabel = document.createElement('label');
			const autoToggle = document.createElement('input');
			autoToggle.type = 'checkbox';
			const autoText = document.createElement('span');
			autoLabel.append(autoToggle, autoText);
			const autoHelp = document.createElement('p');
			matchingControls.append(makeSettingField(lowModeLabel, lowModeHelp), makeSettingField(matchModeLabel, matchModeHelp), makeSettingField(caseLabel, caseHelp, caseLegacy), makeSettingField(autoLabel, autoHelp));
			matchingGroup.append(matchingTitle, matchingControls);

			const commentGroup = document.createElement('li');
			commentGroup.className = 'tm-setting-group';
			const commentTitle = document.createElement('h4');
			const commentControls = document.createElement('div');
			commentControls.className = 'tm-setting-controls';
			const dislikeLabel = document.createElement('label');
			const dislikeSelect = document.createElement('select');
			dislikeSelect.dataset.setting = 'dislike-mode';
			const dislikeText = document.createElement('span');
			['none', 'new-hidden', 'always'].forEach(value => {
				const option = document.createElement('option');
				option.value = value;
				dislikeSelect.appendChild(option);
			});
			dislikeLabel.append(dislikeText, dislikeSelect);
			const dislikeHelp = document.createElement('p');
			const blockModeLabel = document.createElement('label');
			const blockModeText = document.createElement('span');
			const blockModeSelect = document.createElement('select');
			blockModeSelect.dataset.setting = 'comment-block-mode';
			['hide', 'placeholder', 'placeholder-reveal'].forEach(value => {
				const option = document.createElement('option');
				option.value = value;
				blockModeSelect.appendChild(option);
			});
			blockModeLabel.append(blockModeText, blockModeSelect);
			const blockModeHelp = document.createElement('p');
			commentControls.append(makeSettingField(dislikeLabel, dislikeHelp), makeSettingField(blockModeLabel, blockModeHelp));
			commentGroup.append(commentTitle, commentControls);

			const keywordGroup = document.createElement('li');
			keywordGroup.className = 'tm-setting-group';
			const keywordTitle = document.createElement('h4');
			const keywordControls = document.createElement('div');
			keywordControls.className = 'tm-setting-controls';
			const keywordEnabledLabel = document.createElement('label');
			const keywordEnabledToggle = document.createElement('input');
			keywordEnabledToggle.type = 'checkbox';
			keywordEnabledToggle.dataset.setting = 'keyword-automation-enabled';
			const keywordEnabledText = document.createElement('span');
			keywordEnabledLabel.append(keywordEnabledToggle, keywordEnabledText);
			const keywordEnabledHelp = document.createElement('p');
			const openAutomationBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			keywordControls.append(makeSettingField(keywordEnabledLabel, keywordEnabledHelp), openAutomationBtn);
			keywordGroup.append(keywordTitle, keywordControls);

			const loggingGroup = document.createElement('li');
			loggingGroup.className = 'tm-setting-group';
			const loggingTitle = document.createElement('h4');
			const loggingControls = document.createElement('div');
			loggingControls.className = 'tm-setting-controls';
			const makeLoggingSubgroup = () => {
				const group = document.createElement('section');
				group.className = 'tm-logging-subgroup';
				const title = document.createElement('h5');
				const body = document.createElement('div');
				body.className = 'tm-logging-subgroup-body';
				group.append(title, body);
				return { group, title, body };
			};
			const loggingOutputGroup = makeLoggingSubgroup();
			const loggingScopeGroup = makeLoggingSubgroup();
			const loggingConsoleGroup = makeLoggingSubgroup();
			const loggingSavedGroup = makeLoggingSubgroup();
			const logFileLabel = document.createElement('label');
			const logFileToggle = document.createElement('input');
			logFileToggle.type = 'checkbox';
			const logFileText = document.createElement('span');
			logFileLabel.append(logFileToggle, logFileText);
			const logConsoleLabel = document.createElement('label');
			const logConsoleToggle = document.createElement('input');
			logConsoleToggle.type = 'checkbox';
			const logConsoleText = document.createElement('span');
			logConsoleLabel.append(logConsoleToggle, logConsoleText);
			const consolePrefixLabel = document.createElement('label');
			const consolePrefixText = document.createElement('span');
			const consolePrefixInput = document.createElement('input');
			consolePrefixInput.dataset.setting = 'console-log-prefix';
			consolePrefixInput.maxLength = 64;
			consolePrefixLabel.append(consolePrefixText, consolePrefixInput);
			const consoleTimestampLabel = document.createElement('label');
			const consoleTimestampToggle = document.createElement('input');
			consoleTimestampToggle.type = 'checkbox';
			consoleTimestampToggle.dataset.setting = 'console-log-timestamp';
			const consoleTimestampText = document.createElement('span');
			consoleTimestampLabel.append(consoleTimestampToggle, consoleTimestampText);
			const consoleFormatLabel = document.createElement('label');
			const consoleFormatText = document.createElement('span');
			const consoleFormatSelect = document.createElement('select');
			consoleFormatSelect.dataset.setting = 'console-log-time-format';
			['iso', 'iso-date', 'iso-time', 'iso-basic', 'iso-basic-date', 'iso-week-date', 'iso-ordinal-date', 'custom'].forEach(value => {
				const option = document.createElement('option');
				option.value = value;
				consoleFormatSelect.appendChild(option);
			});
			consoleFormatLabel.append(consoleFormatText, consoleFormatSelect);
			const consoleFormatInput = document.createElement('input');
			consoleFormatInput.dataset.setting = 'console-log-time-format-custom';
			consoleFormatInput.maxLength = 80;
			const consoleTimezoneLabel = document.createElement('label');
			const consoleTimezoneText = document.createElement('span');
			const consoleTimezoneSelect = document.createElement('select');
			consoleTimezoneSelect.dataset.setting = 'console-log-timezone';
			['system', 'userinput', ...Array.from({ length: 27 }, (_: unknown, index: number) => `offset:${index - 12 < 0 ? '-' : '+'}${String(Math.abs(index - 12)).padStart(2, '0')}:00`), 'Asia/Seoul', 'Asia/Tokyo', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles'].forEach(value => {
				const option = document.createElement('option');
				option.value = value;
				consoleTimezoneSelect.appendChild(option);
			});
			consoleTimezoneLabel.append(consoleTimezoneText, consoleTimezoneSelect);
			const consoleTimezoneInput = document.createElement('input');
			consoleTimezoneInput.dataset.setting = 'console-log-timezone-custom';
			consoleTimezoneInput.maxLength = 64;
			const consoleLoggingStatus = document.createElement('p');
			consoleLoggingStatus.className = 'tm-muted';
			const logLevelLabel = document.createElement('label');
			const logLevelText = document.createElement('span');
			const logLevelSelect = document.createElement('select');
			['error', 'warn', 'info', 'debug'].forEach(value => {
				const option = document.createElement('option');
				option.value = value;
				logLevelSelect.appendChild(option);
			});
			logLevelLabel.append(logLevelText, logLevelSelect);
			const logRetentionLabel = document.createElement('label');
			const logRetentionText = document.createElement('span');
			const logRetentionSelect = document.createElement('select');
			[100, 500, 1000].forEach(value => {
				const option = document.createElement('option');
				option.value = String(value);
				logRetentionSelect.appendChild(option);
			});
			logRetentionLabel.append(logRetentionText, logRetentionSelect);
			const verboseLabel = document.createElement('label');
			const verboseText = document.createElement('span');
			const verboseSelect = document.createElement('select');
			verboseSelect.dataset.setting = 'verbose-level';
			[0, 1, 2, 3, 4, 5].forEach(value => {
				const option = document.createElement('option');
				option.value = String(value);
				verboseSelect.appendChild(option);
			});
			verboseLabel.append(verboseText, verboseSelect);
			const verboseHelp = document.createElement('p');
			const consolePreview = document.createElement('div');
			consolePreview.className = 'tm-log-preview';
			const testLogBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			const logStatus = document.createElement('p');
			logStatus.className = 'tm-muted';
			const logActions = document.createElement('div');
			logActions.className = 'tm-inline-actions';
			const downloadLogBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			const clearLogBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			logActions.append(testLogBtn, downloadLogBtn, clearLogBtn);
			const logHelp = document.createElement('p');
			loggingOutputGroup.body.append(makeSettingField(logFileLabel), makeSettingField(logConsoleLabel));
			loggingScopeGroup.body.append(makeSettingField(logLevelLabel), makeSettingField(verboseLabel, verboseHelp));
			loggingConsoleGroup.body.append(makeSettingField(consolePrefixLabel), makeSettingField(consoleTimestampLabel), makeSettingField(consoleFormatLabel, consoleFormatInput), makeSettingField(consoleTimezoneLabel, consoleTimezoneInput), consoleLoggingStatus, consolePreview);
			loggingSavedGroup.body.append(makeSettingField(logRetentionLabel, logStatus), logActions);
			loggingControls.append(loggingOutputGroup.group, loggingScopeGroup.group, loggingConsoleGroup.group, loggingSavedGroup.group, logHelp);
			loggingGroup.append(loggingTitle, loggingControls);

			const displayGroup = document.createElement('li');
			displayGroup.className = 'tm-setting-group';
			const displayTitle = document.createElement('h4');
			const displaySizeTitle = document.createElement('h5');
			const displayControls = document.createElement('div');
			displayControls.className = 'tm-setting-controls';
			const languageLabel = document.createElement('label');
			const languageText = document.createElement('span');
			const languageSelect = createLanguageSelect();
			const languageHelp = document.createElement('p');
			languageLabel.append(languageText, languageSelect);
			displayControls.append(makeSettingField(languageLabel, languageHelp));
			languageSelect.addEventListener('change', () => {
				if (!setLanguagePreference(languageSelect.value)) {
					languageSelect.value = getLanguagePreference();
					Toast.show(t('storageSaveFailed'));
					return;
				}
				this.app.refreshLanguageUi();
				Toast.show(t('languageChanged'));
			});
			const fontSizeLabel = document.createElement('label');
			const fontSizeText = document.createElement('span');
			const fontSizeSelect = document.createElement('select');
			fontSizeSelect.dataset.setting = 'font-size-level';
			const uiScaleLabel = document.createElement('label');
			const uiScaleText = document.createElement('span');
			const uiScaleSelect = document.createElement('select');
			uiScaleSelect.dataset.setting = 'ui-scale-level';
			[1, 2, 3, 4, 5].forEach(value => {
				const fontOption = document.createElement('option');
				fontOption.value = String(value);
				const scaleOption = document.createElement('option');
				scaleOption.value = String(value);
				fontSizeSelect.appendChild(fontOption);
				uiScaleSelect.appendChild(scaleOption);
			});
			fontSizeLabel.append(fontSizeText, fontSizeSelect);
			uiScaleLabel.append(uiScaleText, uiScaleSelect);
			const displayHelp = document.createElement('p');
			displayControls.append(displaySizeTitle, makeSettingField(fontSizeLabel), makeSettingField(uiScaleLabel, displayHelp));
			displayGroup.append(displayTitle, displayControls);

			const themeTitle = document.createElement('h5');
			const themeModeLabel = document.createElement('label');
			const themeModeText = document.createElement('span');
			const themeModeSelect = document.createElement('select');
			themeModeSelect.dataset.setting = 'theme-mode';
			['light', 'dark', 'system', 'system-inverted', 'youtube', 'youtube-inverted', 'custom'].forEach(value => {
				const option = document.createElement('option');
				option.value = value;
				themeModeSelect.appendChild(option);
			});
			themeModeLabel.append(themeModeText, themeModeSelect);
			const themeHelp = document.createElement('p');
			const customizeThemeBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			displayControls.append(themeTitle, makeSettingField(themeModeLabel, themeHelp), customizeThemeBtn);

			markDefaultOption(matchModeSelect, 'handle');
			markDefaultOption(dislikeSelect, 'none');
			markDefaultOption(blockModeSelect, 'hide');
			markDefaultOption(logLevelSelect, 'warn');
			markDefaultOption(logRetentionSelect, 500);
			markDefaultOption(consoleFormatSelect, 'iso');
			markDefaultOption(consoleTimezoneSelect, 'system');
			markDefaultOption(verboseSelect, 3);
			markDefaultOption(fontSizeSelect, 3);
			markDefaultOption(uiScaleSelect, 3);
			markDefaultOption(themeModeSelect, 'system');

			const maintenanceGroup = document.createElement('li');
			maintenanceGroup.className = 'tm-setting-group';
			const maintenanceTitle = document.createElement('h4');
			const maintenanceControls = document.createElement('div');
			maintenanceControls.className = 'tm-setting-controls';
			const resetSettingsActions = document.createElement('div');
			resetSettingsActions.className = 'tm-inline-actions';
			const openListBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			const resetSettingsBtn = Object.assign(document.createElement('button'), { className: 'danger' });
			resetSettingsActions.append(openListBtn, resetSettingsBtn);
			maintenanceControls.append(resetSettingsActions);
			maintenanceGroup.append(maintenanceTitle, maintenanceControls);
			settingsSection.append(settingsTitle, settingsIntro, settingsList);

			const apiSection = document.createElement('li');
			apiSection.className = 'tm-setting-group';
			const apiTitle = document.createElement('h4');
			const apiControls = document.createElement('div');
			apiControls.className = 'tm-setting-controls';
			const apiLabel = document.createElement('label');
			const apiInput = document.createElement('input');
			apiInput.type = 'password';
			apiInput.id = 'tm-settings-api-key';
			apiLabel.htmlFor = apiInput.id;
			const apiHelp = document.createElement('p');
			const apiStatus = document.createElement('div');
			apiStatus.className = 'tm-muted';
			const apiTestStatus = document.createElement('div');
			apiTestStatus.className = 'tm-inline-note';
			const apiProgress = document.createElement('div');
			apiProgress.className = 'tm-progress';
			apiProgress.hidden = true;
			const apiActions = document.createElement('div');
			apiActions.className = 'tm-inline-actions';
			const saveApiBtn = Object.assign(document.createElement('button'), { className: 'primary' });
			const testApiBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			const clearApiBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			apiActions.append(saveApiBtn, testApiBtn, clearApiBtn);
			apiControls.append(makeSettingField(apiLabel, apiInput, apiHelp), apiStatus, apiTestStatus, apiProgress, apiActions);
			apiSection.append(apiTitle, apiControls);

			const pairSection = document.createElement('li');
			pairSection.className = 'tm-setting-group';
			const pairTitle = document.createElement('h4');
			const pairControls = document.createElement('div');
			pairControls.className = 'tm-setting-controls';
			const toggleLabel = document.createElement('label');
			const ucidToggle = document.createElement('input');
			ucidToggle.type = 'checkbox';
			ucidToggle.dataset.setting = 'ucid-detection';
			const ucidText = document.createElement('span');
			toggleLabel.append(ucidToggle, ucidText);
			const toggleHelp = document.createElement('p');
			const lookupControls = (['create', 'update', 'onBlock'] as const).map(stage => {
				const label = document.createElement('label');
				const text = document.createElement('span');
				const select = document.createElement('select');
				select.dataset.setting = 'pair-lookup-' + stage;
				for (const value of ['page', 'api', 'page-api']) select.appendChild(Object.assign(document.createElement('option'), { value }));
				markDefaultOption(select, 'page');
				label.append(text, select);
				return { stage, label, text, select };
			});
			const handleLookupIntervalLabel = document.createElement('label');
			const handleLookupIntervalText = document.createElement('span');
			const handleLookupIntervalSelect = document.createElement('select');
			handleLookupIntervalSelect.dataset.setting = 'handle-lookup-interval';
			['always', '60', '300', '600', '3600', '43200', '86400', '604800', '2592000', 'custom'].forEach(value => { const option = document.createElement('option'); option.value = value; handleLookupIntervalSelect.appendChild(option); });
			handleLookupIntervalLabel.append(handleLookupIntervalText, handleLookupIntervalSelect);
			const handleLookupCustomInput = document.createElement('input'); handleLookupCustomInput.type = 'number'; handleLookupCustomInput.min = '1';
			handleLookupCustomInput.dataset.setting = 'pair-refresh-custom-seconds';
			const handleLookupOnAddLabel = document.createElement('label'); const handleLookupOnAddToggle = document.createElement('input'); handleLookupOnAddToggle.type = 'checkbox'; const handleLookupOnAddText = document.createElement('span'); handleLookupOnAddLabel.append(handleLookupOnAddToggle, handleLookupOnAddText);
			const handleLookupHelp = document.createElement('p');
			const openPairListBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			pairControls.append(makeSettingField(toggleLabel, toggleHelp), ...lookupControls.map(control => makeSettingField(control.label)), makeSettingField(handleLookupIntervalLabel, handleLookupCustomInput), makeSettingField(handleLookupOnAddLabel, handleLookupHelp), openPairListBtn);
			pairSection.append(pairTitle, pairControls);

			const debugSection = document.createElement('section');
			debugSection.className = 'tm-logging-subgroup';
			const debugTitle = document.createElement('h5');
			const debugList = document.createElement('div');
			debugList.className = 'tm-inline-note';
			debugSection.append(debugTitle, debugList);
			const pairingGroup = pairSection;
			const apiGroup = apiSection;
			settingsList.append(matchingGroup, commentGroup, keywordGroup, pairingGroup, apiGroup, displayGroup, loggingGroup, maintenanceGroup);
			loggingControls.append(debugSection);
			const navigation = document.createElement('nav'); navigation.className = 'tm-settings-nav';
			const main = document.createElement('div'); main.className = 'tm-settings-main'; main.append(settingsSection);
			const sections = [
				{ id: 'matching', target: matchingGroup, label: 'settingsMatchingTitle' },
				{ id: 'comments', target: commentGroup, label: 'settingsCommentTitle' },
				{ id: 'automation', target: keywordGroup, label: 'keywordAutomationTitle' },
				{ id: 'pairing', target: pairingGroup, label: 'pairLookupTitle' },
				{ id: 'api', target: apiGroup, label: 'apiKeyTitle' },
				{ id: 'display', target: displayGroup, label: 'settingsDisplayThemeTitle' },
				{ id: 'logging', target: loggingGroup, label: 'settingsLogsDiagnosticsTitle' },
				{ id: 'reset', target: maintenanceGroup, label: 'resetSettings' }
			];
			let activeSection = sections.find(item => item.id === section) || sections[0];
			const sectionOffset = () => window.matchMedia?.('(max-width: 700px)')?.matches ? navigation.getBoundingClientRect().height + 12 : 12;
			const scrollToSection = (target: HTMLElement) => {
				target.style.scrollMarginTop = sectionOffset() + 'px';
				target.scrollIntoView?.({ block: 'start' });
			};
			const markActive = (id: string) => { for (const item of navItems) { if (item.id === id) item.button.setAttribute('aria-current', 'location'); else item.button.removeAttribute('aria-current'); } };
			const navItems = sections.map(item => {
				item.target.id = 'tm-settings-' + item.id; item.target.tabIndex = -1;
				const button = Object.assign(document.createElement('button'), { type: 'button', className: 'secondary' });
				button.dataset.section = item.id;
				button.setAttribute('aria-controls', item.target.id);
				button.addEventListener('click', event => { event.stopPropagation(); activeSection = item; scrollToSection(item.target); item.target.focus?.({ preventScroll: true }); markActive(item.id); });
				button.addEventListener('keydown', event => { if (event.key === 'Enter') event.stopPropagation(); });
				navigation.append(button);
				return { ...item, button };
			});
			body.append(navigation, main);
			let scrollContent: HTMLElement | null = null;
			const syncNavigation = () => {
				if (!scrollContent) return;
				const top = scrollContent.getBoundingClientRect().top + sectionOffset();
				const atEnd = scrollContent.scrollTop > 0 && scrollContent.scrollHeight - scrollContent.scrollTop - scrollContent.clientHeight <= 1;
				const visible = atEnd ? sections.at(-1) : sections.filter(item => item.target.getBoundingClientRect().top <= top + 1).at(-1);
				if (visible) { activeSection = visible; markActive(visible.id); }
			};
			const drafts = new Map<HTMLInputElement | HTMLSelectElement, { value: string; hidden: boolean }>();
			const draftInputs = [apiInput, consolePrefixInput, consoleFormatInput, consoleTimezoneInput, consoleFormatSelect, consoleTimezoneSelect, handleLookupCustomInput];
			for (const input of draftInputs) input.addEventListener('input', () => drafts.set(input, { value: input.value, hidden: !!input.hidden }));
			openPairListBtn.addEventListener('click', () => { Dialog.closeAll('navigate'); this.openList(); });

			let apiTestBusy = false;
			let disposed = false;
			let operationGeneration = 0;
			const renderApiStatus = () => {
				const hasKey = this.app.apiConfig.hasApiKey();
				apiInput.value = this.app.apiConfig.getApiKey();
				apiStatus.textContent = hasKey
					? t('apiKeyStatusSaved', this.app.apiConfig.getMaskedApiKey())
					: t('apiKeyStatusMissing');
				this._renderApiTestStatus(apiTestStatus, this.app.apiConfig.getLastTestResult(), apiTestBusy);
				testApiBtn.disabled = apiTestBusy || !hasKey;
				testApiBtn.textContent = apiTestBusy ? t('apiKeyTestRunning') : t('apiKeyTest');
			};
			const renderDebug = () => {
				const metrics = window.__ytCommentBlockerPerf || {};
				const lines = [
					['mutationBatches', metrics.mutationBatches || 0],
					['fullRefreshes', metrics.fullRefreshes || 0],
					['incrementalRefreshes', metrics.incrementalRefreshes || 0],
					['scannedNodes', metrics.scannedNodes || 0],
					['missingChannelIds', metrics.missingChannelIds || 0],
					['missingHandles', metrics.missingHandles || 0],
					['lastDiagnostic', metrics.lastDiagnostic || '-'],
					['autoAddedRegexHandles', metrics.autoAddedRegexHandles || 0],
					['lastDurationMs', metrics.lastDurationMs || 0],
					['totalDurationMs', metrics.totalDurationMs || 0]
				];
				debugList.replaceChildren(...lines.map(([label, value]) => this._createMetaLine(t('debugMetric', t('debug' + String(label)[0].toUpperCase() + String(label).slice(1)), value))));
			};
			const renderLoggingState = () => {
				const logging = this.app.settings.getLogging();
				consolePreview.textContent = this.app.logger?.getConsolePreview?.() || '';
				const logState = this.app.logger?.getStatus?.() || { count: 0, last: null };
				logStatus.textContent = logState.last
					? t('loggingStatus', logState.count, logging.retention, formatDateTime(logState.last.at), String(logState.last.level).toUpperCase())
					: t('loggingStatusEmpty', logging.retention);
				testLogBtn.disabled = !this.app.logger || (!logging.fileEnabled && !logging.consoleEnabled);
				downloadLogBtn.disabled = !logState.count;
				clearLogBtn.disabled = !logState.count;
			};
			const renderAll = () => {
				caseToggle.checked = this.app.settings.isHandleCaseSensitive();
				lowModeToggle.checked = this.app.settings.isLowPerformanceMode();
				autoToggle.checked = this.app.settings.isAutoAddRegexHandlesEnabled();
				matchModeSelect.value = this.app.settings.getBlockMatchMode();
				keywordEnabledToggle.checked = this.app.settings.isKeywordAutomationEnabled();
				const logging = this.app.settings.getLogging();
				logFileToggle.checked = !!logging.fileEnabled;
				logConsoleToggle.checked = !!logging.consoleEnabled;
				logLevelSelect.value = logging.level;
				logRetentionSelect.value = String(logging.retention);
				consolePrefixInput.value = logging.consolePrefix;
				consoleTimestampToggle.checked = !!logging.consoleTimestampEnabled;
				consoleFormatSelect.value = this.app.settings.CONSOLE_TIME_FORMATS.includes(logging.consoleTimeFormat) ? logging.consoleTimeFormat : 'custom';
				consoleFormatInput.value = consoleFormatSelect.value === 'custom' ? logging.consoleTimeFormat : '';
				consoleFormatInput.hidden = consoleFormatSelect.value !== 'custom';
				consoleTimezoneSelect.value = Array.from(consoleTimezoneSelect.options).some(option => option.value === logging.consoleTimeZone) ? logging.consoleTimeZone : 'userinput';
				consoleTimezoneInput.value = consoleTimezoneSelect.value === 'userinput' ? logging.consoleTimeZoneInput || logging.consoleTimeZone : '';
				consoleTimezoneInput.hidden = consoleTimezoneSelect.value !== 'userinput';
				consoleLoggingStatus.textContent = '';
				renderLoggingState();
				verboseSelect.value = String(this.app.settings.getVerboseLevel());
				dislikeSelect.value = this.app.settings.getDislikeMode();
				blockModeSelect.value = this.app.settings.getCommentBlockMode();
				fontSizeSelect.value = String(this.app.settings.getFontSizeLevel());
				uiScaleSelect.value = String(this.app.settings.getUiScaleLevel());
				themeModeSelect.value = this.app.settings.getThemeMode();
				ucidToggle.checked = this.app.pairStore.isUcidDetectionEnabled();
				for (const control of lookupControls) control.select.value = this.app.settings.getPairLookupMethod(control.stage);
				const interval = this.app.settings._state.pairRefreshInterval || (this.app.settings.getPairLookupMethod('update') === 'api' ? '604800' : '600');
				handleLookupIntervalSelect.value = interval;
				Array.from(handleLookupIntervalSelect.options).forEach(option => option.classList.remove('tm-default-option'));
				markDefaultOption(handleLookupIntervalSelect, this.app.settings.getPairLookupMethod('update') === 'api' ? '604800' : '600');
				handleLookupCustomInput.value = String(this.app.settings._state.pairRefreshCustomSeconds);
				handleLookupCustomInput.hidden = interval !== 'custom';
				handleLookupOnAddToggle.checked = this.app.settings.isPairOnBlockEnabled();
				handleLookupOnAddToggle.disabled = this.app.settings.isLowPerformanceMode();
				apiProgress.hidden = !apiTestBusy;
				renderApiStatus();
				renderDebug();
				for (const [input, draft] of drafts) { input.value = draft.value; if (input !== handleLookupCustomInput) input.hidden = draft.hidden; }
			};
			const applyLanguage = () => {
				settingsTitle.textContent = t('settingsTitle');
				languageText.textContent = t('languageLabel');
				languageHelp.textContent = t('languageHelp');
				languageSelect.options[0].textContent = t('languageAutomatic');
				languageSelect.value = getLanguagePreference();
				lowModeText.textContent = t('lowPerformanceMode');
				lowModeHelp.textContent = t('lowPerformanceHelp');
				renderAll();
				settingsIntro.textContent = t('settingsIntro');
				matchingTitle.textContent = t('settingsMatchingTitle');
				matchModeText.textContent = t('blockMatchModeLabel') + ': ';
				matchModeSelect.options[0].textContent = defaultOptionText(matchModeSelect.options[0], t('blockMatchModeHandle'));
				matchModeSelect.options[1].textContent = defaultOptionText(matchModeSelect.options[1], t('blockMatchModePair'));
				matchModeHelp.textContent = t('blockMatchModeHelp');
				commentTitle.textContent = t('settingsCommentTitle');
				keywordTitle.textContent = t('keywordAutomationTitle');
				keywordEnabledText.textContent = t('keywordAutomationEnabled');
				keywordEnabledHelp.textContent = t('keywordAutomationEnabledHelp');
				openAutomationBtn.textContent = t('openBlockKeywordAutomation');
				loggingTitle.textContent = t('settingsLogsDiagnosticsTitle');
				loggingOutputGroup.title.textContent = t('loggingOutputTitle');
				loggingScopeGroup.title.textContent = t('loggingScopeTitle');
				loggingConsoleGroup.title.textContent = t('loggingConsoleTitle');
				loggingSavedGroup.title.textContent = t('loggingSavedTitle');
				logFileText.textContent = t('loggingFileLabel');
				logConsoleText.textContent = t('loggingConsoleLabel');
				consolePrefixText.textContent = t('consolePrefixLabel') + ': ';
				consoleTimestampText.textContent = t('consoleTimestampLabel');
				consoleFormatText.textContent = t('consoleTimeFormatLabel') + ': ';
				const consoleFormatKeys: Record<string, string> = { iso: 'Iso', 'iso-date': 'IsoDate', 'iso-time': 'IsoTime', 'iso-basic': 'IsoBasic', 'iso-basic-date': 'IsoBasicDate', 'iso-week-date': 'IsoWeekDate', 'iso-ordinal-date': 'IsoOrdinalDate', custom: 'Custom' };
				Array.from(consoleFormatSelect.options).forEach(option => { option.textContent = defaultOptionText(option, t(`consoleTimeFormat${consoleFormatKeys[option.value] || 'Custom'}`)); });
				consoleFormatInput.placeholder = t('consoleTimeFormatPlaceholder');
				consoleFormatInput.setAttribute('aria-label', t('consoleTimeFormatPlaceholder'));
				consoleTimezoneText.textContent = t('consoleTimezoneLabel') + ': ';
				Array.from(consoleTimezoneSelect.options).forEach(option => {
					option.textContent = option.value === 'system' ? defaultOptionText(option, t('consoleTimezoneSystem')) : option.value === 'userinput' ? t('consoleTimezoneUserInput') : option.value.startsWith('offset:') ? `UTC${option.value.slice(7)}` : option.value === 'Asia/Seoul' ? 'Asia/Seoul (KST)' : option.value === 'Asia/Tokyo' ? 'Asia/Tokyo (JST)' : option.value === 'Europe/Berlin' ? 'Europe/Berlin (CET/CEST)' : option.value;
				});
				consoleTimezoneInput.placeholder = t('consoleTimezonePlaceholder');
				consoleTimezoneInput.setAttribute('aria-label', t('consoleTimezonePlaceholder'));
				logLevelText.textContent = t('loggingLevelLabel') + ': ';
				logRetentionText.textContent = t('loggingRetentionLabel') + ': ';
				verboseText.textContent = t('verboseLevelLabel') + ': ';
				Array.from(logLevelSelect.options).forEach(option => { option.textContent = defaultOptionText(option, t(`loggingLevel${option.value[0].toUpperCase()}${option.value.slice(1)}`)); });
				Array.from(logRetentionSelect.options).forEach(option => { option.textContent = defaultOptionText(option, t('loggingRetentionValue', option.value)); });
				Array.from(verboseSelect.options).forEach(option => { option.textContent = defaultOptionText(option, t('verboseLevelValue', option.value)); });
				verboseHelp.textContent = t('verboseLevelHelp');
				testLogBtn.textContent = t('loggingTest');
				downloadLogBtn.textContent = t('loggingDownload');
				clearLogBtn.textContent = t('loggingClear');
				logHelp.textContent = t('loggingHelp');
				displayTitle.textContent = t('settingsDisplayThemeTitle');
			displaySizeTitle.textContent = t('settingsDisplayTitle');
				maintenanceTitle.textContent = t('resetSettings');
				caseText.textContent = t('handleCaseLabel');
				caseHelp.textContent = t('handleCaseHelp');
				caseLegacy.textContent = t('handleCaseLegacy');
				autoText.textContent = t('autoAddRegexLabel');
				autoHelp.textContent = t('autoAddRegexHelp');
				dislikeText.textContent = t('dislikeModeLabel') + ': ';
				dislikeSelect.options[0].textContent = defaultOptionText(dislikeSelect.options[0], t('dislikeModeNone'));
				dislikeSelect.options[1].textContent = defaultOptionText(dislikeSelect.options[1], t('dislikeModeNewHidden'));
				dislikeSelect.options[2].textContent = defaultOptionText(dislikeSelect.options[2], t('dislikeModeAlways'));
				dislikeHelp.textContent = t('dislikeModeHelp');
				blockModeText.textContent = t('commentBlockModeLabel') + ': ';
				blockModeSelect.options[0].textContent = defaultOptionText(blockModeSelect.options[0], t('commentBlockModeHide'));
				blockModeSelect.options[1].textContent = defaultOptionText(blockModeSelect.options[1], t('commentBlockModePlaceholder'));
				blockModeSelect.options[2].textContent = defaultOptionText(blockModeSelect.options[2], t('commentBlockModeReveal'));
				blockModeHelp.textContent = t('commentBlockModeHelp');
				fontSizeText.textContent = t('fontSizeLevelLabel') + ': ';
				uiScaleText.textContent = t('uiScaleLevelLabel') + ': ';
				Array.from(fontSizeSelect.options).forEach((option, index) => {
					option.textContent = defaultOptionText(option, t('levelLabel', index + 1));
				});
				Array.from(uiScaleSelect.options).forEach((option, index) => {
					option.textContent = defaultOptionText(option, t('levelLabel', index + 1));
				});
				displayHelp.textContent = t('displayLevelHelp');
				themeTitle.textContent = t('settingsThemeTitle');
				themeModeText.textContent = t('themeModeLabel') + ': ';
				['Light', 'Dark', 'System', 'SystemInverted', 'YouTube', 'YouTubeInverted', 'Custom'].forEach((name, index) => {
					themeModeSelect.options[index].textContent = defaultOptionText(themeModeSelect.options[index], t(`themeMode${name}`));
				});
				themeHelp.textContent = t('themeModeHelp');
				customizeThemeBtn.textContent = t('customizeTheme');
				openListBtn.textContent = t('openBlockList');
				resetSettingsBtn.textContent = t('resetSettings');
				apiTitle.textContent = t('apiKeyTitle');
				apiLabel.textContent = t('apiKeyLabel');
				apiInput.placeholder = t('apiKeyPlaceholder');
				apiHelp.textContent = t('apiKeyHelp');
				saveApiBtn.textContent = t('apiKeySave');
				clearApiBtn.textContent = t('apiKeyClear');
				pairTitle.textContent = t('pairLookupTitle');
				ucidText.textContent = t('ucidDetectionLabel');
				toggleHelp.textContent = t('ucidDetectionHelp');
				for (const control of lookupControls) {
					control.text.textContent = t('pairLookupStage' + control.stage) + ': ';
					for (const option of Array.from(control.select.options)) option.textContent = defaultOptionText(option, t('pairLookupMethod' + option.value));
				}
				openPairListBtn.textContent = t('openBlockList');
				for (const item of navItems) item.button.textContent = t(item.label);
				navigation.setAttribute('aria-label', t('settingsNavigation'));
				handleLookupIntervalText.textContent = t('handleLookupIntervalLabel') + ': ';
				const intervalLabels: Record<string, string> = {
					always: t('handleLookupIntervalAlways'),
					'60': t('handleLookupIntervalMinutes', 1),
					'300': t('handleLookupIntervalMinutes', 5),
					'600': t('handleLookupIntervalMinutes', 10),
					'3600': t('handleLookupIntervalHours', 1),
					'43200': t('handleLookupIntervalHours', 12),
					'86400': t('handleLookupIntervalDays', 1),
					'604800': t('handleLookupIntervalDays', 7),
					'2592000': t('handleLookupIntervalMonth'),
					custom: t('handleLookupCustomLabel')
				};
				Array.from(handleLookupIntervalSelect.options).forEach(option => { option.textContent = defaultOptionText(option, intervalLabels[option.value]); });
				handleLookupOnAddText.textContent = t('handleLookupOnAddLabel'); handleLookupCustomInput.placeholder = t('handleLookupCustomLabel'); handleLookupCustomInput.setAttribute('aria-label', t('handleLookupCustomLabel')); handleLookupHelp.textContent = t('handleLookupHelp');
				debugTitle.textContent = t('debugTitle');
			};
			lowModeToggle.addEventListener('change', () => {
				this.app.settings.setLowPerformanceMode(lowModeToggle.checked);
				if (this.app.settings.getLastSaveError()) Toast.show(t('storageSaveFailed'));
				renderAll();
			});
			caseToggle.addEventListener('change', () => {
				this.app.settings.setHandleCaseSensitive(caseToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			autoToggle.addEventListener('change', () => {
				this.app.settings.setAutoAddRegexHandlesEnabled(autoToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			matchModeSelect.addEventListener('change', () => {
				this.app.settings.setBlockMatchMode(matchModeSelect.value);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			keywordEnabledToggle.addEventListener('change', () => {
				this.app.settings.setKeywordAutomationEnabled(keywordEnabledToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			openAutomationBtn.addEventListener('click', () => {
				Dialog.closeAll('navigate');
				this.openBlockKeywordAutomation();
			});
			const saveLogging = () => {
				const config = {
					fileEnabled: logFileToggle.checked,
					consoleEnabled: logConsoleToggle.checked,
					level: logLevelSelect.value,
					retention: Number(logRetentionSelect.value),
					consolePrefix: consolePrefixInput.value,
					consoleTimestampEnabled: consoleTimestampToggle.checked,
					consoleTimeFormat: consoleFormatSelect.value === 'custom' ? consoleFormatInput.value : consoleFormatSelect.value,
					consoleTimeZone: consoleTimezoneSelect.value,
					consoleTimeZoneInput: consoleTimezoneInput.value
				};
				const result = saveManagerLoggingSettings(this.app.settings, this.app.logger, config);
				if (!result.ok) {
					if (result.persistenceFailed) { Toast.show(t('storageSaveFailed')); renderAll(); return; }
					const field = result.validationError || '';
					consoleLoggingStatus.textContent = t('consoleLoggingInvalid', field);
					return;
				}
				for (const input of [consolePrefixInput, consoleFormatInput, consoleTimezoneInput, consoleFormatSelect, consoleTimezoneSelect]) drafts.delete(input);
				renderAll();
			};
			logFileToggle.addEventListener('change', saveLogging);
			logConsoleToggle.addEventListener('change', saveLogging);
			logLevelSelect.addEventListener('change', saveLogging);
			logRetentionSelect.addEventListener('change', saveLogging);
			consolePrefixInput.addEventListener('change', saveLogging);
			consoleTimestampToggle.addEventListener('change', saveLogging);
			consoleFormatSelect.addEventListener('change', () => { consoleFormatInput.hidden = consoleFormatSelect.value !== 'custom'; saveLogging(); });
			consoleFormatInput.addEventListener('change', saveLogging);
			consoleTimezoneSelect.addEventListener('change', () => { consoleTimezoneInput.hidden = consoleTimezoneSelect.value !== 'userinput'; saveLogging(); });
			consoleTimezoneInput.addEventListener('change', saveLogging);
			verboseSelect.addEventListener('change', () => {
				this.app.settings.setVerboseLevel(verboseSelect.value);
				renderAll();
			});
			testLogBtn.addEventListener('click', () => {
				if (!this.app.logger.testOutput()) { Toast.show(t('loggingTestDisabled')); return; }
				renderLoggingState();
				Toast.show(t('loggingTestWritten'));
			});
			downloadLogBtn.addEventListener('click', () => {
				Toast.show(this.app.logger.download() ? t('loggingDownloadStarted') : t('loggingEmpty'));
			});
			clearLogBtn.addEventListener('click', async () => {
				const confirmed = await Dialog.show({
					title: t('loggingClear'),
					body: t('loggingClearConfirm'),
					buttons: [
						{ label: t('close'), value: false },
						{ label: t('loggingClear'), value: true, danger: true }
					],
					onRefresh: (ctx) => {
						ctx.setTitle(t('loggingClear'));
						ctx.setBody(t('loggingClearConfirm'));
						ctx.buttons[0].textContent = t('close');
						ctx.buttons[1].textContent = t('loggingClear');
					}
				});
				if (!confirmed) return;
				Toast.show(this.app.logger.clear() ? t('loggingCleared') : t('storageSaveFailed'));
				renderLoggingState();
			});
			dislikeSelect.addEventListener('change', () => {
				this.app.settings.setDislikeMode(dislikeSelect.value);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			blockModeSelect.addEventListener('change', () => {
				this.app.settings.setCommentBlockMode(blockModeSelect.value);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			fontSizeSelect.addEventListener('change', () => {
				this.app.settings.setFontSizeLevel(fontSizeSelect.value);
				this._refreshUiOnly();
				renderAll();
			});
			uiScaleSelect.addEventListener('change', () => {
				this.app.settings.setUiScaleLevel(uiScaleSelect.value);
				this._refreshUiOnly();
				renderAll();
			});
			themeModeSelect.addEventListener('change', () => {
				this.app.settings.setThemeMode(themeModeSelect.value);
				this._refreshUiOnly();
				renderAll();
				if (themeModeSelect.value === 'custom') this.openThemeCustomizer();
			});
			customizeThemeBtn.addEventListener('click', () => this.openThemeCustomizer());
			openListBtn.addEventListener('click', () => {
				Dialog.closeAll('navigate');
				this.openList();
			});
			resetSettingsBtn.addEventListener('click', () => {
				Dialog.show({
					title: t('resetSettings'),
					body: (() => {
						const p = document.createElement('p');
						p.textContent = t('confirmResetSettings');
						return p;
					})(),
					buttons: [
						{ label: t('close'), value: false },
						{ label: t('resetSettings'), value: true, primary: true, danger: true }
					],
					onRefresh: (ctx: DialogRefreshContext) => {
						ctx.setTitle(t('resetSettings'));
						if (ctx.content.firstChild) ctx.content.firstChild.textContent = t('confirmResetSettings');
						ctx.buttons[0].textContent = t('close');
						ctx.buttons[1].textContent = t('resetSettings');
					}
				}).then(ok => {
					if (!ok) return;
					this.app.settings.resetSettings();
					if (!this.app.settings.getLastSaveError()) drafts.clear();
					this.app.refreshAfterStorageChange();
					renderAll();
					Toast.show(this.app.settings.getLastSaveError() ? t('storageSaveFailed') : t('settingsReset'));
				});
			});
			ucidToggle.addEventListener('change', () => {
				const result = this.app.pairStore.setUcidDetectionEnabled(ucidToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
				if (!result.ok) Toast.show(t('storageSaveFailed'));
			});
			for (const control of lookupControls) control.select.addEventListener('change', () => {
				this.app.settings.setPairLookupMethod(control.stage, control.select.value);
				if (this.app.settings.getLastSaveError()) Toast.show(t('storageSaveFailed'));
				renderAll();
			});
			handleLookupIntervalSelect.addEventListener('change', () => { handleLookupCustomInput.hidden = handleLookupIntervalSelect.value !== 'custom'; this.app.settings.setPairRefreshInterval(handleLookupIntervalSelect.value, handleLookupCustomInput.value); renderAll(); });
			handleLookupCustomInput.addEventListener('change', () => { if (Number(handleLookupCustomInput.value) < 1) { Toast.show(t('handleLookupInvalidInterval')); return; } this.app.settings.setPairRefreshInterval('custom', handleLookupCustomInput.value); renderAll(); });
			handleLookupOnAddToggle.addEventListener('change', () => { this.app.settings.setPairOnBlockEnabled(handleLookupOnAddToggle.checked); renderAll(); });
			saveApiBtn.addEventListener('click', () => {
				const result = this.app.apiConfig.setApiKey(apiInput.value);
				if (result.ok) drafts.delete(apiInput);
				this._refreshUiOnly();
				renderAll();
				Toast.show(result.ok ? t('apiKeySaved') : t('storageSaveFailed'));
			});
			testApiBtn.addEventListener('click', async () => {
				const operationId = ++operationGeneration;
				apiTestBusy = true;
				renderAll();
				try {
					const result = await this.app.testApiKey();
					if (!disposed && operationGeneration === operationId) {
						if (!result.ok) Toast.show(t('storageSaveFailed'), 3200);
						else Toast.show(t('apiKeyTestResult', getApiTestCategoryLabel(result.result.category), result.result.message, result.result.httpStatus ? String(result.result.httpStatus) : ''), 3200);
					}
				} catch (error) {
					if (!disposed && operationGeneration === operationId) Toast.show(t('operationFailed', error instanceof Error ? error.message : String(error)), 3200);
				} finally {
					if (!disposed && operationGeneration === operationId) { apiTestBusy = false; renderAll(); }
				}
			});
			clearApiBtn.addEventListener('click', () => {
				const result = this.app.apiConfig.clearApiKey();
				if (result.ok) drafts.delete(apiInput);
				this._refreshUiOnly();
				renderAll();
				Toast.show(result.ok ? t('apiKeyCleared') : t('storageSaveFailed'));
			});
			const settingsDialog = Dialog.show({
				title: t('settingsTitle'),
				body,
				buttons: [{ label: t(returnToList ? 'backToList' : 'close'), value: returnToList ? 'list' : false, primary: true }],
					onRefresh: (ctx: DialogRefreshContext) => {
					ctx.setTitle(t('settingsTitle'));
					ctx.buttons[0].textContent = t(returnToList ? 'backToList' : 'close');
					applyLanguage();
				},
				onBeforeClose: (value: any) => {
					disposed = true;
					operationGeneration += 1;
					return value;
				}
			});
			scrollContent = body.parentElement;
			scrollContent?.addEventListener('scroll', syncNavigation, { passive: true });
			markActive(activeSection.id);
			if (section !== 'matching') scrollToSection(activeSection.target);
			const unsubscribeLogging = this.app.logger?.subscribe?.(renderLoggingState) || (() => {});
			settingsDialog.then(value => { unsubscribeLogging(); scrollContent?.removeEventListener('scroll', syncNavigation); if (value === 'list') this.openList(); });
		}
		openList() {
			this.app.pairStore.refreshStatuses();
			const savedViewState = this._listViewState || {};
			const validTypeFilters = new Set(['all', 'handle', 'id', 'regex']);
			const validTagFilters = new Set(['handle-only', 'paired', 'stale', 'mismatch', 'unverified']);
			const listState = createManagerListController(savedViewState, validTagFilters);
			const pairState = createManagerPairController();
			const wrap = document.createElement('div');
			const isBusy = () => pairState.busy;

			const versionSection = document.createElement('section');
			versionSection.className = 'tm-section';
			const versionTitle = document.createElement('h3');
			const versionText = document.createElement('div');
			versionText.className = 'tm-muted';
			versionSection.append(versionTitle, versionText);

			const settingsActions = document.createElement('div'); settingsActions.className = 'tm-inline-actions';
			const openSettingsBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			settingsActions.append(openSettingsBtn);

			const pairSection = document.createElement('section');
			pairSection.className = 'tm-section';
			const pairTitle = document.createElement('h3');
			const toggleRow = document.createElement('div');
			toggleRow.className = 'tm-toggle-row';
			const pairActions = document.createElement('div');
			pairActions.className = 'tm-inline-actions';
			const createBtn = Object.assign(document.createElement('button'), {
				className: 'secondary'
			});
			const updateBtn = Object.assign(document.createElement('button'), {
				className: 'primary'
			});
			pairActions.append(createBtn, updateBtn);
			toggleRow.append(pairActions);
			const summaryTitle = document.createElement('h3');
			const lastCheck = document.createElement('div');
			lastCheck.className = 'tm-muted';
			const summaryGrid = document.createElement('div');
			summaryGrid.className = 'tm-summary-grid';
			const pairProgress = document.createElement('div');
			pairProgress.className = 'tm-progress';
			pairProgress.hidden = true;
			const pairResultPanel = document.createElement('div');
			pairSection.append(pairTitle, toggleRow, summaryTitle, lastCheck, summaryGrid, pairProgress, pairResultPanel);

			const form = document.createElement('section');
			form.className = 'tm-section tm-automation-entry';
			const formTitle = document.createElement('h3');
			const formHelp = document.createElement('p');
			formHelp.className = 'tm-muted';
			const openAutomationBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			form.append(formTitle, formHelp, openAutomationBtn);

			const listSection = document.createElement('section');
			listSection.className = 'tm-section';
			const listTitle = document.createElement('h3');
			const toolbar = document.createElement('div');
			toolbar.className = 'tm-toolbar';
			const topToolbarRow = document.createElement('div');
			topToolbarRow.className = 'tm-toolbar-row';
			const topLeft = document.createElement('div');
			topLeft.className = 'tm-toolbar-group';
			const masterLabel = document.createElement('label');
			const masterToggle = document.createElement('input');
			masterToggle.type = 'checkbox';
			const masterText = document.createElement('span');
			masterLabel.append(masterToggle, masterText);
			const counter = document.createElement('div');
			counter.className = 'tm-counter';
			topLeft.append(masterLabel, counter);
			const topRight = document.createElement('div');
			topRight.className = 'tm-toolbar-group';
			const typeLabel = document.createElement('label');
			const searchLabel = document.createElement('label');
			const searchInput = document.createElement('input');
			searchInput.type = 'search';
			searchInput.dataset.managerFilter = 'search';
			searchInput.value = listState.searchQuery;
			const searchNote = document.createElement('div');
			searchNote.className = 'tm-search-note';
			const typeSelect = document.createElement('select');
			typeSelect.dataset.managerFilter = 'type';
			[
				['all', ''],
				['handle', ''],
				['id', ''],
				['regex', '']
			].forEach(([value, label]) => {
				const option = document.createElement('option');
				option.value = value;
				option.textContent = label;
				typeSelect.appendChild(option);
			});
			typeSelect.value = validTypeFilters.has(savedViewState.typeFilter) ? savedViewState.typeFilter : 'all';
			const resetFiltersBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			topRight.append(searchLabel, searchInput, typeLabel, typeSelect, resetFiltersBtn);
			topToolbarRow.append(topLeft, topRight);
			const middleToolbarRow = document.createElement('div');
			middleToolbarRow.className = 'tm-toolbar-row';
			const tagLabel = document.createElement('div');
			tagLabel.className = 'tm-counter';
			const tagGroup = document.createElement('div');
			tagGroup.className = 'tm-tag-group';
			type TagInputRef = { code: string; input: HTMLInputElement; text: HTMLSpanElement };
			type BlockListBaseViewState = {
				signature: string;
				itemsRevision: string;
				allItems: BlockItem[];
				keyedItems: Map<string, BlockItem>;
				handleItems: BlockItem[];
				blockedIds: Set<string>;
				visibleItems: BlockItem[];
				visibleKeys: string[];
				visibleKeySet: Set<string>;
			};
			type BlockListViewState = BlockListBaseViewState & {
				baseSignature: string;
				selectionVersion: number;
				selectedItems: BlockItem[];
				selectedHandleCount: number;
				selectedVisibleCount: number;
			};
			type RegexMatchCacheEntry = {
				revision: string;
				caseSensitive: boolean;
				matchCount: number | null;
				matches: BlockItem[] | null;
			};
			const tagInputs: TagInputRef[] = [];
			['handle-only', 'paired', 'stale', 'mismatch', 'unverified'].forEach(code => {
				const label = document.createElement('label');
				const input = document.createElement('input');
				input.type = 'checkbox';
				input.dataset.managerTag = code;
				input.checked = listState.tagFilters.has(code);
				input.addEventListener('change', () => {
					if (input.checked) listState.tagFilters.add(code);
					else listState.tagFilters.delete(code);
					persistViewState();
					invalidateViewState();
					renderList();
				});
				const text = document.createElement('span');
				text.textContent = '';
				label.append(input, text);
				tagInputs.push({ code, input, text });
				tagGroup.appendChild(label);
			});
			middleToolbarRow.append(tagLabel, tagGroup);
			const bottomToolbarRow = document.createElement('div');
			bottomToolbarRow.className = 'tm-toolbar-row';
			const bulkLeft = document.createElement('div');
			bulkLeft.className = 'tm-toolbar-group';
			const bulkLabel = document.createElement('label');
			const bulkSelect = document.createElement('select');
			[
				['delete', ''],
				['create', ''],
				['update', '']
			].forEach(([value, label]) => {
				const option = document.createElement('option');
				option.value = value;
				option.textContent = label;
				bulkSelect.appendChild(option);
			});
			const executeBtn = Object.assign(document.createElement('button'), {
				className: 'primary'
			});
			const clearSelectionBtn = Object.assign(document.createElement('button'), {
				className: 'secondary'
			});
			bulkLeft.append(bulkLabel, bulkSelect, executeBtn, clearSelectionBtn);
			bottomToolbarRow.append(bulkLeft, searchNote);
			toolbar.append(topToolbarRow, middleToolbarRow, bottomToolbarRow);
			const list = Object.assign(document.createElement('ul'), { className: 'tm-block-list' });
			const pagination = document.createElement('div');
			listSection.append(listTitle, toolbar, list, pagination);
			wrap.append(versionSection, settingsActions, pairSection, form, listSection);
			const persistViewState = (scrollTop = this._listViewState?.scrollTop || 0) => {
				this._listViewState = {
					searchQuery: listState.searchQuery,
					page: listState.page,
					typeFilter: typeSelect.value || 'all',
					tagFilters: Array.from(listState.tagFilters),
					selection: Array.from(listState.selection),
					scrollTop: Math.max(0, Number(scrollTop) || 0)
				};
			};
			const getCurrentItems = () => this.app.storage.all();
			const listCache = createManagerListCacheController(listState, persistViewState, getCurrentItems);
			const getStatusCode = (item: BlockItem, blockedIds: Set<string> | null = null) => item.type === 'handle'
				? this.app.pairService.getHandleStatus(item.value, blockedIds).code
				: null;
			const { markSelectionChanged, setSelectionValue, invalidate: invalidateViewState, pruneSelection } = listCache;
			const getItemsRevision = (items: BlockItem[]) => this.app.storage._revision !== undefined ? String(this.app.storage._revision) : (items || [])
				.map(item => `${item.type}:${item.value}:${item.flags || ''}`)
				.join('\u001f');
			const getPairRevision = (items: BlockItem[], blockedIds: Set<string> | null = null) => this.app.pairStore._revision !== undefined ? String(this.app.pairStore._revision) : (items || [])
				.filter(item => item.type === 'handle')
				.map(item => {
					const status = this.app.pairService.getHandleStatus(item.value, blockedIds);
					const pair = status?.pair || null;
					return [
						getItemKey(item),
						status?.code || '',
						pair?.ucid || '',
						pair?.verifiedAt || '',
						pair?.lastResolvedUcid || '',
						pair?.lastError || '',
						pair?.source || ''
					].join(':');
				})
				.join('\u001e');
			const buildBaseViewState = (): BlockListBaseViewState => {
				const allItems = getCurrentItems();
				const itemsRevision = getItemsRevision(allItems);
				const blockedIds = this.app.pairService.getBlockedIdSet(allItems);
				const keyedItems: Map<string, BlockItem> = new Map(allItems
					.map((item: BlockItem): [string | null, BlockItem] => [getItemKey(item), item])
					.filter((entry: [string | null, BlockItem]): entry is [string, BlockItem] => !!entry[0]));
				const handleItems = allItems.filter((item: BlockItem) => item.type === 'handle');
				if (!listState.searchIndexCache || listState.searchIndexCache.itemsRevision !== itemsRevision) {
					listState.searchIndexCache = { itemsRevision, index: buildManagerSearchIndex(allItems) };
					const metrics = window.__ytCommentBlockerPerf ||= {};
					metrics.managerIndexBuilds = (metrics.managerIndexBuilds || 0) + 1;
				}
				const searchIndex = listState.searchIndexCache.index;
				const searched = searchManagerIndex(searchIndex, listState.searchQuery);
				const typeValue = typeSelect.value || 'all';
				const visibleItems = searched.filter((item: BlockItem) => {
					if (typeValue !== 'all' && item.type !== typeValue) return false;
					if (!listState.tagFilters.size) return true;
					if (item.type !== 'handle') return false;
					return listState.tagFilters.has(getStatusCode(item, blockedIds));
				});
				const visibleKeys = visibleItems.map(getItemKey).filter(isNonNull);
				return {
					signature: [
						itemsRevision,
						getPairRevision(handleItems, blockedIds),
						String(this.app.settings.isHandleCaseSensitive()),
						(typeSelect.value || 'all'),
						String(listState.searchQuery || '').trim().toLowerCase(),
						Array.from(listState.tagFilters).sort().join(',')
					].join('|'),
					itemsRevision,
					allItems,
					keyedItems,
					handleItems,
					blockedIds,
					visibleItems,
					visibleKeys,
					visibleKeySet: new Set(visibleKeys)
				};
			};
			const computeViewState = (force = false): BlockListViewState => {
				if (force || !listState.baseViewStateCache) listState.baseViewStateCache = buildBaseViewState();
				const baseViewState = listState.baseViewStateCache;
				pruneSelection(baseViewState.keyedItems);
				if (
					!force &&
					listState.viewStateCache &&
					listState.viewStateCache.baseSignature === baseViewState.signature &&
					listState.viewStateCache.selectionVersion === listState.selectionVersion
				) {
					return listState.viewStateCache;
				}
				const selectedItems = Array.from(listState.selection)
					.map(key => baseViewState.keyedItems.get(key))
					.filter(isNonNull);
				const selectedHandleCount = selectedItems.filter(item => item.type === 'handle').length;
				const selectedVisibleCount = baseViewState.visibleKeys.filter((key: string) => listState.selection.has(key)).length;
				listState.viewStateCache = {
					...baseViewState,
					baseSignature: baseViewState.signature,
					selectionVersion: listState.selectionVersion,
					selectedItems,
					selectedHandleCount,
					selectedVisibleCount
				};
				return listState.viewStateCache;
			};
			const getRegexMatchState = (regexItem: BlockItem, viewState: BlockListViewState, mode = 'count'): RegexMatchCacheEntry => {
				if (!regexItem || regexItem.type !== 'regex') {
					return {
						revision: viewState?.itemsRevision || '',
						caseSensitive: this.app.settings.isHandleCaseSensitive(),
						matchCount: 0,
						matches: mode === 'full' ? [] : null
					};
				}
				const cacheKey = [
					getItemKey(regexItem),
					viewState?.itemsRevision || '',
					String(this.app.settings.isHandleCaseSensitive())
				].join('|');
				let entry = listState.regexMatchCache.get(cacheKey);
				if (!entry) {
					entry = {
						revision: viewState?.itemsRevision || '',
						caseSensitive: this.app.settings.isHandleCaseSensitive(),
						matchCount: null,
						matches: null
					};
					listState.regexMatchCache.set(cacheKey, entry);
					if (listState.regexMatchCache.size > 100) listState.regexMatchCache.delete(listState.regexMatchCache.keys().next().value!);
				}
				if (mode === 'full' && Array.isArray(entry.matches)) return entry;
				if (mode === 'count' && typeof entry.matchCount === 'number') return entry;
				const spec = validateRegexSpec(regexItem.value, regexItem.flags || '');
				if (!spec) {
					entry.matchCount = 0;
					if (mode === 'full') entry.matches = [];
					return entry;
				}
				const rx = new RegExp(spec.pattern, spec.flags);
				if (mode === 'full') {
					const matches: BlockItem[] = [];
					for (const item of viewState.handleItems) {
						if (safeRegexTest(rx, item.value)) matches.push(item);
					}
					entry.matches = matches;
					entry.matchCount = matches.length;
					return entry;
				}
				let matchCount = 0;
				for (const item of viewState.handleItems) {
					if (safeRegexTest(rx, item.value)) matchCount += 1;
				}
				entry.matchCount = matchCount;
				return entry;
			};
			const syncVisibleSelection = () => {
				for (const [itemKey, refs] of listState.rowRefs.entries()) {
					if (refs?.checkbox) refs.checkbox.checked = listState.selection.has(itemKey);
				}
			};
			const syncActionState = (viewState = computeViewState()) => {
				const pairBulk = bulkSelect.value === 'create' || bulkSelect.value === 'update';
				createBtn.disabled = pairState.busy;
				updateBtn.disabled = pairState.busy;
				createBtn.textContent = pairState.busy ? t('pairWorking') : t('pairCreate');
				updateBtn.textContent = pairState.busy ? t('pairWorking') : t('pairUpdate');
				pairProgress.hidden = !pairState.busy;
				masterToggle.disabled = pairState.busy || !viewState.visibleKeys.length;
				masterToggle.checked = !!viewState.visibleKeys.length && viewState.selectedVisibleCount === viewState.visibleKeys.length;
				masterToggle.indeterminate = viewState.selectedVisibleCount > 0 && viewState.selectedVisibleCount < viewState.visibleKeys.length;
				executeBtn.disabled = pairState.busy || !listState.selection.size || (pairBulk && !viewState.selectedHandleCount);
				clearSelectionBtn.disabled = pairState.busy || !listState.selection.size;
				bulkSelect.disabled = pairState.busy;
				counter.textContent = t('pairResultSummary', {
					selected: listState.selection.size,
					visible: viewState.visibleItems.length,
					total: viewState.allItems.length
				});
			};
			const renderSummary = () => {
				const summary = this.app.pairService.getSummary();
				const cards = [
					{ label: t('pairSummaryHandles'), value: summary.handles },
					{ label: t('pairSummaryPaired'), value: summary.paired },
					{ label: t('pairSummaryNeeded'), value: summary.pairNeeded },
					{ label: t('pairSummaryStale'), value: summary.stale },
					{ label: t('pairSummaryMismatch'), value: summary.mismatch },
					{ label: t('pairSummaryUnverified'), value: summary.unverified }
				];
				summaryGrid.replaceChildren(...cards.map(card => {
					const box = document.createElement('div');
					box.className = 'tm-summary-card';
					const strong = document.createElement('strong');
					strong.textContent = String(card.value);
					const span = document.createElement('span');
					span.textContent = card.label;
					box.append(strong, span);
					return box;
				}));
				lastCheck.textContent = t('pairLastCheck', formatDateTime(this.app.pairStore.getLastPairCheckAt()));
				this._renderPairResultList(pairResultPanel, this.app.getLastPairRunResult());
				syncActionState(computeViewState());
			};
			const renderList = (viewState = computeViewState()) => {
				const filterKey = JSON.stringify([listState.searchQuery, typeSelect.value, Array.from(listState.tagFilters).sort()]);
				if (listState.lastListFilter && listState.lastListFilter !== filterKey) listState.page = 0;
				listState.lastListFilter = filterKey;
				listState.page = this._renderPagination(pagination, listState.page, viewState.visibleItems.length, nextPage => {
					listState.page = nextPage;
					renderList();
					pagination.querySelector<HTMLButtonElement>(nextPage === 0 ? '[data-action="next-page"]' : '[data-action="previous-page"]')?.focus();
				});
				persistViewState();
				listTitle.textContent = t('manageTitle', viewState.allItems.length);
				listState.rowRefs.clear();
				if (!viewState.allItems.length || !viewState.visibleItems.length) {
					const li = document.createElement('li');
					li.className = 'tm-list-empty';
					li.textContent = viewState.allItems.length
						? (listState.searchQuery ? t('searchNoMatches') : t('noFilteredEntries'))
						: t('noEntries');
					list.replaceChildren(li);
					syncActionState(viewState);
					return;
				}
				const rows = renderManagerListRows(viewState.visibleItems.slice(listState.page * this._getPageSize(), (listState.page + 1) * this._getPageSize()), {
					state: listState,
					viewState,
					pageSize: this._getPageSize(),
					pairBusy: pairState.busy,
					isBusy,
					getPairStatus: (handle: string, blockedIds: Set<string>) => this.app.pairService.getHandleStatus(handle, blockedIds),
					formatDate: (value: number) => formatDateTime(value),
					makeBadge: (code: string) => this._makeBadge(code),
					createMetaLine: (text: any) => this._createMetaLine(text),
					showToast: (message: string) => Toast.show(message),
					getRegexMatchState,
					computeViewState,
					setSelectionValue,
					markSelectionChanged,
					syncVisibleSelection,
					syncActionState: () => syncActionState(),
					removeItem: (item: BlockItem) => this.app.removeEntry(item),
					renderAll: () => renderAll()
				});
				list.replaceChildren(...rows);
				syncActionState(viewState);
			};
			const renderAll = () => {
				invalidateViewState({ clearRegex: true });
				renderSummary();
				renderList();
			};
			const applyLanguage = () => {
				versionTitle.textContent = t('versionTitle');
				versionText.textContent = t('versionValue', getScriptVersion());
				openSettingsBtn.textContent = t('openSettings');
				pairTitle.textContent = t('pairSummary');
				createBtn.textContent = t('pairCreate');
				updateBtn.textContent = t('pairUpdate');
				summaryTitle.textContent = t('pairSummary');
				formTitle.textContent = t('blockKeywordAutomationTitle');
				formHelp.textContent = t('blockKeywordAutomationHelp');
				openAutomationBtn.textContent = t('openBlockKeywordAutomation');
				masterText.textContent = t('selectVisible');
				searchLabel.textContent = t('searchLabel');
				searchInput.placeholder = t('searchPlaceholder');
				resetFiltersBtn.textContent = t('resetFilters');
				typeLabel.textContent = t('typeFilterLabel');
				typeSelect.options[0].textContent = t('typeAll');
				typeSelect.options[1].textContent = t('typeHandle');
				typeSelect.options[2].textContent = t('typeId');
				typeSelect.options[3].textContent = t('typeRegex');
				tagLabel.textContent = t('tagFilterLabel');
				tagInputs.forEach(({ code, text }) => { text.textContent = this._makeBadge(code).textContent; });
				bulkLabel.textContent = t('bulkActionLabel');
				bulkSelect.options[0].textContent = t('bulkDelete');
				bulkSelect.options[1].textContent = t('bulkCreatePairs');
				bulkSelect.options[2].textContent = t('bulkUpdatePairs');
				executeBtn.textContent = t('execute');
				clearSelectionBtn.textContent = t('clearSelection');
				searchNote.textContent = listState.searchQuery ? t('searchLabel') : '';
				renderAll();
			};
			const setBusy = (nextBusy: boolean) => {
				pairState.busy = !!nextBusy;
				renderSummary();
			};

			openSettingsBtn.addEventListener('click', () => {
				Dialog.closeAll('navigate');
				this.openSettings('pairing', true);
			});
			searchInput.addEventListener('input', () => {
				listState.searchQuery = searchInput.value || '';
				persistViewState();
				if (listState.searchRenderTimer !== null) { clearTimeout(listState.searchRenderTimer); listState.searchRenderTimer = null; }
				if (listState.isComposingSearch) return;
				const renderSearch = () => {
					listState.searchRenderFrame = null;
					listState.searchRenderTimer = null;
					invalidateViewState();
					renderList();
				};
				if (this.app.settings.isLowPerformanceMode()) {
					if (listState.searchRenderFrame !== null) { cancelAnimationFrame(listState.searchRenderFrame); listState.searchRenderFrame = null; }
					listState.searchRenderTimer = setTimeout(renderSearch, 200);
				} else if (listState.searchRenderFrame === null) {
					listState.searchRenderFrame = -1;
					const frame = requestAnimationFrame(renderSearch);
					if (listState.searchRenderFrame === -1) listState.searchRenderFrame = frame;
				}
			});
			searchInput.addEventListener('compositionstart', () => { listState.isComposingSearch = true; });
			searchInput.addEventListener('compositionend', () => {
				listState.isComposingSearch = false;
				searchInput.dispatchEvent(new Event('input'));
			});
			typeSelect.addEventListener('change', () => {
				persistViewState();
				invalidateViewState();
				renderList();
			});
			resetFiltersBtn.addEventListener('click', () => {
				listState.searchQuery = '';
				searchInput.value = '';
				typeSelect.value = 'all';
				listState.tagFilters.clear();
				tagInputs.forEach(({ input }) => { input.checked = false; });
				persistViewState();
				invalidateViewState();
				renderList();
			});
			bulkSelect.addEventListener('change', () => syncActionState());
			masterToggle.addEventListener('change', () => {
				const viewState = computeViewState();
				let changed = false;
				for (const item of viewState.visibleItems) {
					const key = getItemKey(item);
					if (!key) continue;
					if (masterToggle.checked) {
						if (listState.selection.has(key)) continue;
						listState.selection.add(key);
						changed = true;
					} else if (listState.selection.has(key)) {
						listState.selection.delete(key);
						changed = true;
					}
				}
				if (changed) markSelectionChanged();
				syncVisibleSelection();
				syncActionState();
			});
			clearSelectionBtn.addEventListener('click', () => {
				if (!listState.selection.size) return;
				listState.selection.clear();
				markSelectionChanged();
				syncVisibleSelection();
				syncActionState();
			});
			createBtn.addEventListener('click', async () => {
				const operation = pairState.begin();
				setBusy(true);
				try {
					const stats = await this.app.runPairUpdate('create');
					if (pairState.isCurrent(operation)) Toast.show(t('pairResult', stats), 3200);
				} catch (error) {
					if (pairState.isCurrent(operation)) Toast.show(t('operationFailed', error instanceof Error ? error.message : String(error)), 3200);
				} finally { if (pairState.isCurrent(operation)) { setBusy(false); renderAll(); } }
			});
			updateBtn.addEventListener('click', async () => {
				const operation = pairState.begin();
				setBusy(true);
				try {
					const stats = await this.app.runPairUpdate('update');
					if (pairState.isCurrent(operation)) Toast.show(t('pairResult', stats), 3200);
				} catch (error) {
					if (pairState.isCurrent(operation)) Toast.show(t('operationFailed', error instanceof Error ? error.message : String(error)), 3200);
				} finally { if (pairState.isCurrent(operation)) { setBusy(false); renderAll(); } }
			});
			executeBtn.addEventListener('click', async () => {
				const selectedItems = computeViewState().selectedItems;
				if (!selectedItems.length) return;
				if (bulkSelect.value === 'delete') {
					if (!this.app.removeEntries(selectedItems)) { Toast.show(t('storageSaveFailed')); return; }
					const removedCount = selectedItems.length;
					listState.selection.clear();
					markSelectionChanged();
					renderAll();
					Toast.show(t('bulkDeleteResult', removedCount));
					return;
				}
				const handles = selectedItems.filter(item => item.type === 'handle').map(item => item.value);
				if (!handles.length) {
					Toast.show(t('bulkHandleRequired'));
					return;
				}
				setBusy(true);
				const operation = pairState.begin();
				try {
					const stats = await this.app.runPairUpdate(bulkSelect.value, handles);
					if (pairState.isCurrent(operation)) Toast.show(t('pairResult', stats), 3200);
				} catch (error) {
					if (pairState.isCurrent(operation)) Toast.show(t('operationFailed', error instanceof Error ? error.message : String(error)), 3200);
				} finally { if (pairState.isCurrent(operation)) { setBusy(false); renderAll(); } }
			});
			openAutomationBtn.addEventListener('click', () => {
				Dialog.closeAll('navigate');
				this.openBlockKeywordAutomation();
			});

			const dialogResult = Dialog.show({
				title: t('manageTitle', this.app.storage.all().length),
				body: wrap,
				buttons: [
					{ label: t('import'), value: 'import' },
					{ label: t('export'), value: 'export' },
					{ label: t('close'), value: false, primary: true }
				],
				onRefresh: (ctx: DialogRefreshContext) => {
					ctx.setTitle(t('manageTitle', this.app.storage.all().length));
					ctx.buttons[0].textContent = t('import');
					ctx.buttons[1].textContent = t('export');
					ctx.buttons[2].textContent = t('close');
					if (ctx.reason === 'storage') renderAll();
					else applyLanguage();
				},
					onBeforeClose: (value, dialog) => {
						persistViewState(dialog.querySelector('.tm-content')?.scrollTop || 0);
						pairState.dispose();
						listState.dispose();
					return value;
				}
			});
			const content = wrap.parentElement;
			if (content) content.scrollTop = Math.max(0, Number(savedViewState.scrollTop) || 0);
			dialogResult.then(v => {
				if (v === 'import') this.importList();
				else if (v === 'export') this.exportList();
			});
		}

		exportList() {
			const payload = this._getExportPayload();
			const body = document.createElement('div');

			const p = document.createElement('p'); p.textContent = t('exportHint');
			const h4a = document.createElement('h4'); h4a.textContent = t('json');
			const ta1 = document.createElement('textarea'); ta1.readOnly = true; ta1.value = payload.json;
			const h4b = document.createElement('h4'); h4b.textContent = t('text');
			const ta2 = document.createElement('textarea'); ta2.readOnly = true;
			ta2.value = payload.text;
			body.append(p, h4a, ta1, h4b, ta2);
			Dialog.show({
				title: t('export'),
				body,
				buttons: [
					{ label: t('back'), value: 'back' },
					{ label: t('exportDownloadJson'), value: 'download-json' },
					{ label: t('exportDownloadText'), value: 'download-text' },
					{ label: t('close'), value: false, primary: true }
				],
				onRefresh: (ctx) => {
					ctx.setTitle(t('export'));
					p.textContent = t('exportHint');
					h4a.textContent = t('json');
					h4b.textContent = t('text');
					ctx.buttons[0].textContent = t('back');
					ctx.buttons[1].textContent = t('exportDownloadJson');
					ctx.buttons[2].textContent = t('exportDownloadText');
					ctx.buttons[3].textContent = t('close');
				}
			}).then(value => {
				if (value === 'back') this.openList();
				else if (value === 'download-json') this._downloadExport('youtube-comment-blocker-export.json', payload.json, 'application/json');
				else if (value === 'download-text') this._downloadExport('youtube-comment-blocker-export.txt', payload.text, 'text/plain');
			});
		}

		_getExportPayload() {
			return createManagerExport(this.app.storage.all());
		}

		_downloadExport(filename: string, content: string, type: string) {
			downloadManagerExport(filename, content, type);
		}

		importList() {
			const ta = document.createElement('textarea');
			ta.placeholder = t('importPlaceholder');

			Dialog.show({
				title: t('importTitle'),
				body: ta,
				buttons: [{ label: t('close'), value: null }, { label: t('importBtn'), value: 'import', primary: true }],
				onRefresh: (ctx) => {
					ctx.setTitle(t('importTitle'));
					ta.placeholder = t('importPlaceholder');
					ctx.buttons[0].textContent = t('close');
					ctx.buttons[1].textContent = t('importBtn');
				},
				onBeforeClose: (val: any) => {
					if (val !== 'import') return null;
					const rawText = ta.value || '';
					if (rawText.length > 1024 * 1024) {
						Toast.show(t('importTooLarge'));
						return { ok: false, count: 0 };
					}
					const txt = rawText.trim();
					if (!txt) return { ok: false, count: 0 };

					const items = parseManagerImport(txt);
					const persistence = persistManagerImport(this.app.storage, items);
					if (!persistence.ok) {
						Toast.show(t('storageSaveFailed'));
						return { ok: false, count: 0 };
					}
					this.app.refreshAfterStorageChange();
					return { ok: true, count: persistence.count };
				}
			}).then(res => {
				if (res && res.ok) Toast.show(t('importedCount', res.count));
			});
		}
	}
