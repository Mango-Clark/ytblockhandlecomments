import {
	exportRegexLiteral,
	formatDateTime,
	getApiTestCategoryLabel,
	getItemKey,
	getLang,
	getScriptVersion,
	isChannelId,
	isNonNull,
	parseRegexLiteral,
	REGEX_MATCH_INITIAL_LIMIT,
	REGEX_MATCH_PAGE_SIZE,
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

	/* ----------------------------------------------------------
	 * 7. BlockListManager (UI + Import/Export)
	 * ---------------------------------------------------------- */
	export class BlockListManager {
		[key: string]: any;
		constructor(app: AppLike) {
			this.app = app;
		}
		_makeBadge(code: string) {
			const badge = document.createElement('span');
			badge.className = `tm-badge ${code}`;
			const key = code === 'uid'
				? 'badgeUid'
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
		_getPairOutcomeLabel(code: PairOutcome | string) {
			if (code === 'created') return t('pairOutcomeCreated');
			if (code === 'updated') return t('pairOutcomeUpdated');
			if (code === 'mismatch') return t('pairOutcomeMismatch');
			if (code === 'failed') return t('pairOutcomeFailed');
			return t('pairOutcomeSkipped');
		}
		_getRegexMatches(regexItem: BlockItem | null | undefined, items: BlockItem[]) {
			if (!regexItem || regexItem.type !== 'regex') return [];
			const handles = (items || []).filter(item => item.type === 'handle');
			const spec = validateRegexSpec(regexItem.value, regexItem.flags || '');
			if (!spec) return [];
			const rx = new RegExp(spec.pattern, spec.flags);
			return handles.filter(item => safeRegexTest(rx, item.value));
		}
		_getPairResultItems(stats: PairRunStats | null | undefined, options: any = {}) {
			const items = Array.isArray(stats?.items) ? stats.items.slice() : [];
			const filter = options.filter || 'all';
			const sort = options.sort || 'original';
			const filtered = filter === 'all' ? items : items.filter(item => item.outcome === filter);
			if (sort === 'handle') {
				filtered.sort((a, b) => String(a.handle || '').localeCompare(String(b.handle || '')));
			} else if (sort === 'outcome') {
				const order = ['failed', 'mismatch', 'created', 'updated', 'skipped'];
				filtered.sort((a, b) => {
					const ai = order.indexOf(a.outcome);
					const bi = order.indexOf(b.outcome);
					return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi)
						|| String(a.handle || '').localeCompare(String(b.handle || ''));
				});
			}
			return filtered;
		}
		_getFailedPairHandles(stats: PairRunStats | null | undefined) {
			return (stats?.items || [])
				.filter(item => item?.outcome === 'failed' && item.handle)
				.map(item => item.handle);
		}
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
		_renderPairResultList(container: HTMLElement, stats: PairRunStats | null | undefined) {
			const previousOpen = container.querySelector('details')?.open;
			const state = container.__pairResultState || { filter: 'all', sort: 'original' };
			container.__pairResultState = state;
			container.replaceChildren();
			if (!stats?.items?.length) {
				container.textContent = t('pairResultEmpty');
				container.className = 'tm-inline-note';
				return;
			}
			container.className = 'tm-result-panel';
			const details = document.createElement('details');
			details.open = typeof previousOpen === 'boolean' ? previousOpen : true;
			const summary = document.createElement('summary');
			summary.textContent = t('pairResultDetails');
			const controls = document.createElement('div');
			controls.className = 'tm-inline-actions';
			const filterLabel = document.createElement('label');
			filterLabel.textContent = t('pairResultFilterLabel');
			const filterSelect = document.createElement('select');
			const outcomes = ['all', 'created', 'updated', 'mismatch', 'failed', 'skipped'];
			for (const outcome of outcomes) {
				const option = document.createElement('option');
				option.value = outcome;
				option.textContent = outcome === 'all' ? t('pairResultFilterAll') : this._getPairOutcomeLabel(outcome);
				filterSelect.appendChild(option);
			}
			filterSelect.value = state.filter;
			const sortLabel = document.createElement('label');
			sortLabel.textContent = t('pairResultSortLabel');
			const sortSelect = document.createElement('select');
			[
				['original', t('pairResultSortOriginal')],
				['outcome', t('pairResultSortOutcome')],
				['handle', t('pairResultSortHandle')]
			].forEach(([value, label]) => {
				const option = document.createElement('option');
				option.value = value;
				option.textContent = label;
				sortSelect.appendChild(option);
			});
			sortSelect.value = state.sort;
			const failedHandles = this._getFailedPairHandles(stats);
			const copyFailedBtn = Object.assign(document.createElement('button'), {
				textContent: t('pairResultCopyFailed'),
				disabled: !failedHandles.length
			});
			const exportFailedBtn = Object.assign(document.createElement('button'), {
				textContent: t('pairResultExportFailed'),
				disabled: !failedHandles.length
			});
			filterSelect.addEventListener('change', () => {
				state.filter = filterSelect.value || 'all';
				this._renderPairResultList(container, stats);
			});
			sortSelect.addEventListener('change', () => {
				state.sort = sortSelect.value || 'original';
				this._renderPairResultList(container, stats);
			});
			copyFailedBtn.addEventListener('click', () => {
				this._copyText(failedHandles.join('\n'));
				Toast.show(t('pairResultFailedCopied', failedHandles.length));
			});
			exportFailedBtn.addEventListener('click', () => this._showFailedPairExport(failedHandles));
			controls.append(filterLabel, filterSelect, sortLabel, sortSelect, copyFailedBtn, exportFailedBtn);
			const list = document.createElement('ul');
			list.className = 'tm-result-list';
			for (const item of this._getPairResultItems(stats, state)) {
				const li = document.createElement('li');
				const title = document.createElement('div');
				title.innerHTML = '';
				const outcome = document.createElement('span');
				outcome.className = 'tm-result-outcome';
				outcome.textContent = this._getPairOutcomeLabel(item.outcome);
				const handle = document.createElement('span');
				handle.textContent = ` ${item.handle}`;
				title.append(outcome, handle);
				li.appendChild(title);
				if (item.uid) li.appendChild(this._createMetaLine(t('metaUid', item.uid)));
				if (item.resolvedUid && item.resolvedUid !== item.uid) {
					li.appendChild(this._createMetaLine(t('metaResolvedUid', item.resolvedUid)));
				}
				if (item.message) li.appendChild(this._createMetaLine(item.message));
				list.appendChild(li);
			}
			details.append(summary, controls, list);
			container.appendChild(details);
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
			const body = document.createElement('div');
			this._renderPairResultList(body, stats);
			Dialog.show({
				title: t('pairResultDialogTitle'),
				body,
				buttons: [{ label: t('close'), value: false, primary: true }],
				onRefresh: (ctx: DialogRefreshContext) => {
					ctx.setTitle(t('pairResultDialogTitle'));
					ctx.buttons[0].textContent = t('close');
					this._renderPairResultList(body, stats);
				}
			});
		}
		openSettings() {
			const body = document.createElement('div');
			const settingsSection = document.createElement('section');
			settingsSection.className = 'tm-section tm-settings-panel';
			const settingsTitle = document.createElement('h3');
			const settingsIntro = document.createElement('p');
			settingsIntro.className = 'tm-settings-intro tm-muted';
			const settingsList = document.createElement('ul');
			settingsList.className = 'tm-settings-list';
			const matchingGroup = document.createElement('li');
			matchingGroup.className = 'tm-setting-group';
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
			matchingControls.append(matchModeLabel, matchModeHelp, caseLabel, caseHelp, caseLegacy, autoLabel, autoHelp);
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
			commentControls.append(dislikeLabel, dislikeHelp, blockModeLabel, blockModeHelp);
			commentGroup.append(commentTitle, commentControls);

			const keywordGroup = document.createElement('li');
			keywordGroup.className = 'tm-setting-group';
			const keywordTitle = document.createElement('h4');
			const keywordControls = document.createElement('div');
			keywordControls.className = 'tm-setting-controls';
			const keywordLabel = document.createElement('label');
			const keywordText = document.createElement('span');
			const keywordInput = document.createElement('textarea');
			keywordInput.dataset.setting = 'keyword-rules';
			keywordInput.rows = 4;
			keywordLabel.append(keywordText, keywordInput);
			const keywordFieldsTitle = document.createElement('strong');
			const keywordCommentLabel = document.createElement('label');
			const keywordCommentToggle = document.createElement('input');
			keywordCommentToggle.type = 'checkbox';
			const keywordCommentText = document.createElement('span');
			keywordCommentLabel.append(keywordCommentToggle, keywordCommentText);
			const keywordHandleLabel = document.createElement('label');
			const keywordHandleToggle = document.createElement('input');
			keywordHandleToggle.type = 'checkbox';
			const keywordHandleText = document.createElement('span');
			keywordHandleLabel.append(keywordHandleToggle, keywordHandleText);
			const keywordPinnedLabel = document.createElement('label');
			const keywordPinnedToggle = document.createElement('input');
			keywordPinnedToggle.type = 'checkbox';
			const keywordPinnedText = document.createElement('span');
			keywordPinnedLabel.append(keywordPinnedToggle, keywordPinnedText);
			const keywordActionsTitle = document.createElement('strong');
			const keywordDislikeLabel = document.createElement('label');
			const keywordDislikeToggle = document.createElement('input');
			keywordDislikeToggle.type = 'checkbox';
			const keywordDislikeText = document.createElement('span');
			keywordDislikeLabel.append(keywordDislikeToggle, keywordDislikeText);
			const keywordBlockLabel = document.createElement('label');
			const keywordBlockToggle = document.createElement('input');
			keywordBlockToggle.type = 'checkbox';
			const keywordBlockText = document.createElement('span');
			keywordBlockLabel.append(keywordBlockToggle, keywordBlockText);
			const keywordPairLabel = document.createElement('label');
			const keywordPairToggle = document.createElement('input');
			keywordPairToggle.type = 'checkbox';
			const keywordPairText = document.createElement('span');
			keywordPairLabel.append(keywordPairToggle, keywordPairText);
			const keywordHelp = document.createElement('p');
			keywordControls.append(
				keywordLabel,
				keywordFieldsTitle,
				keywordCommentLabel,
				keywordHandleLabel,
				keywordPinnedLabel,
				keywordActionsTitle,
				keywordDislikeLabel,
				keywordBlockLabel,
				keywordPairLabel,
				keywordHelp
			);
			keywordGroup.append(keywordTitle, keywordControls);

			const loggingGroup = document.createElement('li');
			loggingGroup.className = 'tm-setting-group';
			const loggingTitle = document.createElement('h4');
			const loggingControls = document.createElement('div');
			loggingControls.className = 'tm-setting-controls';
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
			const logActions = document.createElement('div');
			logActions.className = 'tm-inline-actions';
			const downloadLogBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			const clearLogBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			logActions.append(downloadLogBtn, clearLogBtn);
			const logHelp = document.createElement('p');
			loggingControls.append(logFileLabel, logConsoleLabel, logLevelLabel, logRetentionLabel, verboseLabel, logActions, logHelp);
			loggingGroup.append(loggingTitle, loggingControls);

			const displayGroup = document.createElement('li');
			displayGroup.className = 'tm-setting-group';
			const displayTitle = document.createElement('h4');
			const displayControls = document.createElement('div');
			displayControls.className = 'tm-setting-controls';
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
			displayControls.append(fontSizeLabel, uiScaleLabel, displayHelp);
			displayGroup.append(displayTitle, displayControls);

			const maintenanceGroup = document.createElement('li');
			maintenanceGroup.className = 'tm-setting-group';
			const maintenanceTitle = document.createElement('h4');
			const maintenanceControls = document.createElement('div');
			maintenanceControls.className = 'tm-setting-controls';
			const resetSettingsActions = document.createElement('div');
			resetSettingsActions.className = 'tm-inline-actions';
			const openListBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			const resetSettingsBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			resetSettingsActions.append(openListBtn, resetSettingsBtn);
			maintenanceControls.append(resetSettingsActions);
			maintenanceGroup.append(maintenanceTitle, maintenanceControls);
			settingsList.append(matchingGroup, commentGroup, keywordGroup, loggingGroup, displayGroup, maintenanceGroup);
			settingsSection.append(settingsTitle, settingsIntro, settingsList);

			const apiSection = document.createElement('section');
			apiSection.className = 'tm-section';
			const apiTitle = document.createElement('h3');
			const apiLabel = document.createElement('label');
			const apiInput = document.createElement('input');
			apiInput.type = 'password';
			apiInput.style.minWidth = '280px';
			apiInput.style.width = 'min(420px, 100%)';
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
			apiSection.append(apiTitle, apiLabel, apiInput, apiHelp, apiStatus, apiTestStatus, apiProgress, apiActions);

			const pairSection = document.createElement('section');
			pairSection.className = 'tm-section';
			const pairTitle = document.createElement('h3');
			const toggleLabel = document.createElement('label');
			const uidToggle = document.createElement('input');
			uidToggle.type = 'checkbox';
			const uidText = document.createElement('span');
			toggleLabel.append(uidToggle, uidText);
			const toggleHelp = document.createElement('p');
			const pairUpdateTitle = document.createElement('h4');
			const pairUpdateUidLabel = document.createElement('label');
			const pairUpdateUidToggle = document.createElement('input');
			pairUpdateUidToggle.type = 'checkbox';
			const pairUpdateUidText = document.createElement('span');
			pairUpdateUidLabel.append(pairUpdateUidToggle, pairUpdateUidText);
			const pairUpdateHandleLabel = document.createElement('label');
			const pairUpdateHandleToggle = document.createElement('input');
			pairUpdateHandleToggle.type = 'checkbox';
			const pairUpdateHandleText = document.createElement('span');
			pairUpdateHandleLabel.append(pairUpdateHandleToggle, pairUpdateHandleText);
			const pairUpdateHelp = document.createElement('p');
			const pairActions = document.createElement('div');
			pairActions.className = 'tm-inline-actions';
			const createBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			const updateBtn = Object.assign(document.createElement('button'), { className: 'primary' });
			pairActions.append(createBtn, updateBtn);
			const lastCheck = document.createElement('div');
			lastCheck.className = 'tm-muted';
			const summaryGrid = document.createElement('div');
			summaryGrid.className = 'tm-summary-grid';
			const pairProgress = document.createElement('div');
			pairProgress.className = 'tm-progress';
			pairProgress.hidden = true;
			const pairResultPanel = document.createElement('div');
			pairSection.append(
				pairTitle,
				toggleLabel,
				toggleHelp,
				pairUpdateTitle,
				pairUpdateUidLabel,
				pairUpdateHandleLabel,
				pairUpdateHelp,
				pairActions,
				lastCheck,
				summaryGrid,
				pairProgress,
				pairResultPanel
			);

			const debugSection = document.createElement('section');
			debugSection.className = 'tm-section';
			const debugTitle = document.createElement('h3');
			const debugList = document.createElement('div');
			debugList.className = 'tm-inline-note';
			debugSection.append(debugTitle, debugList);
			body.append(settingsSection, apiSection, pairSection, debugSection);

			let apiTestBusy = false;
			let pairBusy = false;
			const renderApiStatus = () => {
				const hasKey = this.app.apiConfig.hasApiKey();
				apiInput.value = this.app.apiConfig.getApiKey();
				apiStatus.textContent = hasKey
					? t('apiKeyStatusSaved', this.app.apiConfig.getMaskedApiKey())
					: t('apiKeyStatusMissing');
				this._renderApiTestStatus(apiTestStatus, this.app.apiConfig.getLastTestResult(), apiTestBusy);
				testApiBtn.disabled = apiTestBusy || !hasKey;
				testApiBtn.textContent = apiTestBusy ? t('apiKeyTestRunning') : t('apiKeyTest');
				createBtn.disabled = pairBusy || !hasKey;
				updateBtn.disabled = pairBusy || !hasKey;
			};
			const renderPairSummary = () => {
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
			};
			const renderDebug = () => {
				const metrics = window.__ytCommentBlockerPerf || {};
				const lines = [
					['mutationBatches', metrics.mutationBatches || 0],
					['fullRefreshes', metrics.fullRefreshes || 0],
					['incrementalRefreshes', metrics.incrementalRefreshes || 0],
					['scannedNodes', metrics.scannedNodes || 0],
					['autoAddedRegexHandles', metrics.autoAddedRegexHandles || 0],
					['lastDurationMs', metrics.lastDurationMs || 0],
					['totalDurationMs', metrics.totalDurationMs || 0]
				];
				debugList.replaceChildren(...lines.map(([label, value]) => this._createMetaLine(t('debugMetric', label, value))));
			};
			const renderAll = () => {
				caseToggle.checked = this.app.settings.isHandleCaseSensitive();
				autoToggle.checked = this.app.settings.isAutoAddRegexHandlesEnabled();
				matchModeSelect.value = this.app.settings.getBlockMatchMode();
				const keywordAutomation = this.app.settings.getKeywordAutomation();
				keywordInput.value = keywordAutomation.keywords.join('\n');
				keywordCommentToggle.checked = !!keywordAutomation.fields.commentText;
				keywordHandleToggle.checked = !!keywordAutomation.fields.handle;
				keywordPinnedToggle.checked = !!keywordAutomation.fields.pinned;
				keywordDislikeToggle.checked = !!keywordAutomation.actions.dislike;
				keywordBlockToggle.checked = !!keywordAutomation.actions.blockHandle;
				keywordPairToggle.checked = !!keywordAutomation.actions.createPair;
				const logging = this.app.settings.getLogging();
				logFileToggle.checked = !!logging.fileEnabled;
				logConsoleToggle.checked = !!logging.consoleEnabled;
				logLevelSelect.value = logging.level;
				logRetentionSelect.value = String(logging.retention);
				verboseSelect.value = String(this.app.settings.getVerboseLevel());
				dislikeSelect.value = this.app.settings.getDislikeMode();
				blockModeSelect.value = this.app.settings.getCommentBlockMode();
				fontSizeSelect.value = String(this.app.settings.getFontSizeLevel());
				uiScaleSelect.value = String(this.app.settings.getUiScaleLevel());
				uidToggle.checked = this.app.pairStore.isUidDetectionEnabled();
				pairUpdateUidToggle.checked = this.app.settings.isPairUpdateUidCheckEnabled();
				pairUpdateHandleToggle.checked = this.app.settings.isPairUpdateHandleLookupEnabled();
				apiProgress.hidden = !apiTestBusy;
				pairProgress.hidden = !pairBusy;
				renderApiStatus();
				renderPairSummary();
				renderDebug();
			};
			const applyLanguage = () => {
				settingsTitle.textContent = t('settingsTitle');
				settingsIntro.textContent = t('settingsIntro');
				matchingTitle.textContent = t('settingsMatchingTitle');
				matchModeText.textContent = t('blockMatchModeLabel') + ': ';
				matchModeSelect.options[0].textContent = t('blockMatchModeHandle');
				matchModeSelect.options[1].textContent = t('blockMatchModePair');
				matchModeHelp.textContent = t('blockMatchModeHelp');
				commentTitle.textContent = t('settingsCommentTitle');
				keywordTitle.textContent = t('keywordAutomationTitle');
				keywordText.textContent = t('keywordRulesLabel');
				keywordInput.placeholder = t('keywordRulesPlaceholder');
				keywordFieldsTitle.textContent = t('keywordFieldsTitle');
				keywordCommentText.textContent = t('keywordFieldComment');
				keywordHandleText.textContent = t('keywordFieldHandle');
				keywordPinnedText.textContent = t('keywordFieldPinned');
				keywordActionsTitle.textContent = t('keywordActionsTitle');
				keywordDislikeText.textContent = t('keywordActionDislike');
				keywordBlockText.textContent = t('keywordActionBlockHandle');
				keywordPairText.textContent = t('keywordActionCreatePair');
				keywordHelp.textContent = t('keywordAutomationHelp');
				loggingTitle.textContent = t('loggingTitle');
				logFileText.textContent = t('loggingFileLabel');
				logConsoleText.textContent = t('loggingConsoleLabel');
				logLevelText.textContent = t('loggingLevelLabel') + ': ';
				logRetentionText.textContent = t('loggingRetentionLabel') + ': ';
				verboseText.textContent = t('verboseLevelLabel') + ': ';
				Array.from(logLevelSelect.options).forEach(option => { option.textContent = t(`loggingLevel${option.value[0].toUpperCase()}${option.value.slice(1)}`); });
				Array.from(logRetentionSelect.options).forEach(option => { option.textContent = t('loggingRetentionValue', option.value); });
				Array.from(verboseSelect.options).forEach(option => { option.textContent = t('verboseLevelValue', option.value); });
				downloadLogBtn.textContent = t('loggingDownload');
				clearLogBtn.textContent = t('loggingClear');
				logHelp.textContent = t('loggingHelp');
				displayTitle.textContent = t('settingsDisplayTitle');
				maintenanceTitle.textContent = t('settingsMaintenanceTitle');
				caseText.textContent = t('handleCaseLabel');
				caseHelp.textContent = t('handleCaseHelp');
				caseLegacy.textContent = t('handleCaseLegacy');
				autoText.textContent = t('autoAddRegexLabel');
				autoHelp.textContent = t('autoAddRegexHelp');
				dislikeText.textContent = t('dislikeModeLabel') + ': ';
				dislikeSelect.options[0].textContent = t('dislikeModeNone');
				dislikeSelect.options[1].textContent = t('dislikeModeNewHidden');
				dislikeSelect.options[2].textContent = t('dislikeModeAlways');
				dislikeHelp.textContent = t('dislikeModeHelp');
				blockModeText.textContent = t('commentBlockModeLabel') + ': ';
				blockModeSelect.options[0].textContent = t('commentBlockModeHide');
				blockModeSelect.options[1].textContent = t('commentBlockModePlaceholder');
				blockModeSelect.options[2].textContent = t('commentBlockModeReveal');
				blockModeHelp.textContent = t('commentBlockModeHelp');
				fontSizeText.textContent = t('fontSizeLevelLabel') + ': ';
				uiScaleText.textContent = t('uiScaleLevelLabel') + ': ';
				Array.from(fontSizeSelect.options).forEach((option, index) => {
					option.textContent = t('levelLabel', index + 1);
				});
				Array.from(uiScaleSelect.options).forEach((option, index) => {
					option.textContent = t('levelLabel', index + 1);
				});
				displayHelp.textContent = t('displayLevelHelp');
				openListBtn.textContent = t('openBlockList');
				resetSettingsBtn.textContent = t('resetSettings');
				apiTitle.textContent = t('apiKeyTitle');
				apiLabel.textContent = t('apiKeyLabel');
				apiInput.placeholder = t('apiKeyPlaceholder');
				apiHelp.textContent = t('apiKeyHelp');
				saveApiBtn.textContent = t('apiKeySave');
				clearApiBtn.textContent = t('apiKeyClear');
				pairTitle.textContent = t('uidDetectionLabel');
				uidText.textContent = t('uidDetectionLabel');
				toggleHelp.textContent = t('uidDetectionHelp');
				pairUpdateTitle.textContent = t('pairUpdatePolicyTitle');
				pairUpdateUidText.textContent = t('pairUpdateUidCheckLabel');
				pairUpdateHandleText.textContent = t('pairUpdateHandleLookupLabel');
				pairUpdateHelp.textContent = t('pairUpdatePolicyHelp');
				createBtn.textContent = pairBusy ? t('pairWorking') : t('pairCreate');
				updateBtn.textContent = pairBusy ? t('pairWorking') : t('pairUpdate');
				debugTitle.textContent = t('debugTitle');
				renderAll();
			};
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
			const saveKeywordAutomation = () => {
				this.app.settings.setKeywordAutomation({
					keywords: keywordInput.value.split(/\r?\n/),
					fields: {
						commentText: keywordCommentToggle.checked,
						handle: keywordHandleToggle.checked,
						pinned: keywordPinnedToggle.checked
					},
					actions: {
						dislike: keywordDislikeToggle.checked,
						blockHandle: keywordBlockToggle.checked,
						createPair: keywordPairToggle.checked
					}
				});
				this.app.refreshAfterStorageChange();
				renderAll();
			};
			keywordInput.addEventListener('change', saveKeywordAutomation);
			keywordCommentToggle.addEventListener('change', saveKeywordAutomation);
			keywordHandleToggle.addEventListener('change', saveKeywordAutomation);
			keywordPinnedToggle.addEventListener('change', saveKeywordAutomation);
			keywordDislikeToggle.addEventListener('change', saveKeywordAutomation);
			keywordBlockToggle.addEventListener('change', saveKeywordAutomation);
			keywordPairToggle.addEventListener('change', saveKeywordAutomation);
			const saveLogging = () => {
				this.app.settings.setLogging({
					fileEnabled: logFileToggle.checked,
					consoleEnabled: logConsoleToggle.checked,
					level: logLevelSelect.value,
					retention: Number(logRetentionSelect.value)
				});
				renderAll();
			};
			logFileToggle.addEventListener('change', saveLogging);
			logConsoleToggle.addEventListener('change', saveLogging);
			logLevelSelect.addEventListener('change', saveLogging);
			logRetentionSelect.addEventListener('change', saveLogging);
			verboseSelect.addEventListener('change', () => {
				this.app.settings.setVerboseLevel(verboseSelect.value);
				renderAll();
			});
			downloadLogBtn.addEventListener('click', () => this.app.logger.download());
			clearLogBtn.addEventListener('click', () => { this.app.logger.clear(); Toast.show(t('loggingCleared')); });
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
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			uiScaleSelect.addEventListener('change', () => {
				this.app.settings.setUiScaleLevel(uiScaleSelect.value);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
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
						{ label: t('resetSettings'), value: true, primary: true }
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
					this.app.refreshAfterStorageChange();
					renderAll();
					Toast.show(t('settingsReset'));
				});
			});
			uidToggle.addEventListener('change', () => {
				this.app.pairStore.setUidDetectionEnabled(uidToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			pairUpdateUidToggle.addEventListener('change', () => {
				this.app.settings.setPairUpdateUidCheckEnabled(pairUpdateUidToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			pairUpdateHandleToggle.addEventListener('change', () => {
				this.app.settings.setPairUpdateHandleLookupEnabled(pairUpdateHandleToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			saveApiBtn.addEventListener('click', () => {
				this.app.apiConfig.setApiKey(apiInput.value);
				this.app.refreshAfterStorageChange();
				renderAll();
				Toast.show(t('apiKeySaved'));
			});
			testApiBtn.addEventListener('click', async () => {
				apiTestBusy = true;
				renderAll();
				const result = await this.app.testApiKey();
				apiTestBusy = false;
				renderAll();
				Toast.show(t('apiKeyTestResult', getApiTestCategoryLabel(result.category), result.message, result.httpStatus ? String(result.httpStatus) : ''), 3200);
			});
			clearApiBtn.addEventListener('click', () => {
				this.app.apiConfig.clearApiKey();
				this.app.refreshAfterStorageChange();
				renderAll();
				Toast.show(t('apiKeyCleared'));
			});
			const runPair = async (mode: string) => {
				pairBusy = true;
				applyLanguage();
				const stats = await this.app.runPairUpdate(mode);
				pairBusy = false;
				applyLanguage();
				Toast.show(t('pairResult', stats), 3200);
			};
			createBtn.addEventListener('click', () => runPair('create'));
			updateBtn.addEventListener('click', () => runPair('update'));
			applyLanguage();
			Dialog.show({
				title: t('settingsTitle'),
				body,
				buttons: [{ label: t('close'), value: false, primary: true }],
				onRefresh: (ctx: DialogRefreshContext) => {
					ctx.setTitle(t('settingsTitle'));
					ctx.buttons[0].textContent = t('close');
					applyLanguage();
				}
			});
		}
		openList() {
			this.app.pairStore.refreshStatuses();
			const wrap = document.createElement('div');
			const selection = new Set();
			const tagFilters = new Set();
			const expandedRegexKeys = new Set();
			const showAllRegexKeys = new Map();
			let busy = false;
			let apiTestBusy = false;
			let searchQuery = '';
			const isBusy = () => busy;

			const versionSection = document.createElement('section');
			versionSection.className = 'tm-section';
			const versionTitle = document.createElement('h3');
			const versionText = document.createElement('div');
			versionText.className = 'tm-muted';
			versionSection.append(versionTitle, versionText);

			const settingsSection = document.createElement('section');
			settingsSection.className = 'tm-section';
			const settingsTitle = document.createElement('h3');
			const settingsRow = document.createElement('div');
			settingsRow.className = 'tm-toggle-row';
			const settingsBox = document.createElement('div');
			const caseLabel = document.createElement('label');
			const caseToggle = document.createElement('input');
			caseToggle.type = 'checkbox';
			caseToggle.checked = this.app.settings.isHandleCaseSensitive();
			const caseText = document.createElement('span');
			caseText.textContent = t('handleCaseLabel');
			caseLabel.append(caseToggle, caseText);
			const caseHelp = document.createElement('p');
			caseHelp.textContent = t('handleCaseHelp');
			const caseLegacy = document.createElement('p');
			caseLegacy.textContent = t('handleCaseLegacy');
			const settingsActions = document.createElement('div');
			settingsActions.className = 'tm-inline-actions';
			const openSettingsBtn = Object.assign(document.createElement('button'), { className: 'secondary' });
			settingsActions.append(openSettingsBtn);
			settingsBox.append(caseLabel, caseHelp, caseLegacy);
			settingsRow.append(settingsBox, settingsActions);
			settingsSection.append(settingsTitle, settingsRow);

			const apiSection = document.createElement('section');
			apiSection.className = 'tm-section';
			const apiTitle = document.createElement('h3');
			apiTitle.textContent = t('apiKeyTitle');
			const apiRow = document.createElement('div');
			apiRow.className = 'tm-toggle-row';
			const apiBox = document.createElement('div');
			const apiLabel = document.createElement('label');
			const apiInput = document.createElement('input');
			apiInput.type = 'password';
			apiInput.style.minWidth = '280px';
			apiInput.style.width = 'min(420px, 100%)';
			apiInput.value = this.app.apiConfig.getApiKey();
			const apiHelp = document.createElement('p');
			const apiStatus = document.createElement('div');
			apiStatus.className = 'tm-muted';
			const apiTestStatus = document.createElement('div');
			apiTestStatus.className = 'tm-inline-note';
			const apiProgress = document.createElement('div');
			apiProgress.className = 'tm-progress';
			apiProgress.hidden = true;
			apiBox.append(apiLabel, apiInput, apiHelp, apiStatus);
			apiBox.appendChild(apiTestStatus);
			apiBox.appendChild(apiProgress);
			const apiActions = document.createElement('div');
			apiActions.className = 'tm-inline-actions';
			const saveApiBtn = Object.assign(document.createElement('button'), {
				className: 'primary'
			});
			const testApiBtn = Object.assign(document.createElement('button'), {
				className: 'secondary'
			});
			const clearApiBtn = Object.assign(document.createElement('button'), {
				className: 'secondary'
			});
			apiActions.append(saveApiBtn, testApiBtn, clearApiBtn);
			apiRow.append(apiBox, apiActions);
			apiSection.append(apiTitle, apiRow);

			const pairSection = document.createElement('section');
			pairSection.className = 'tm-section';
			const pairTitle = document.createElement('h3');
			const toggleRow = document.createElement('div');
			toggleRow.className = 'tm-toggle-row';
			const toggleBox = document.createElement('div');
			const toggleLabel = document.createElement('label');
			const toggle = document.createElement('input');
			toggle.type = 'checkbox';
			toggle.checked = this.app.pairStore.isUidDetectionEnabled();
			const toggleText = document.createElement('span');
			toggleText.textContent = t('uidDetectionLabel');
			toggleLabel.append(toggle, toggleText);
			const toggleHelp = document.createElement('p');
			toggleBox.append(toggleLabel, toggleHelp);
			const pairActions = document.createElement('div');
			pairActions.className = 'tm-inline-actions';
			const createBtn = Object.assign(document.createElement('button'), {
				className: 'secondary'
			});
			const updateBtn = Object.assign(document.createElement('button'), {
				className: 'primary'
			});
			pairActions.append(createBtn, updateBtn);
			toggleRow.append(toggleBox, pairActions);
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

			const form = document.createElement('div');
			form.className = 'tm-regex-bar';
			const formTitle = document.createElement('header');
			const titleRow = document.createElement('div');
			titleRow.className = 'row';
			const regexrBtn = Object.assign(document.createElement('button'), {
				className: 'primary'
			});
			regexrBtn.style.padding = '6px 12px';
			regexrBtn.style.fontSize = '13px';
			regexrBtn.addEventListener('click', () => {
				try { window.open('https://regexr.com/', '_blank', 'noopener'); } catch { location.href = 'https://regexr.com/'; }
			});
			titleRow.append(formTitle, regexrBtn);
			const controls = document.createElement('div');
			controls.className = 'controls';
			const patternLabel = document.createElement('label');
			const patternInput = document.createElement('input');
			patternInput.type = 'text';
			patternInput.style.width = '60%';
			patternInput.placeholder = '/^@spam.*/i or ^@promo';
			const flagsLabel = document.createElement('label');
			const flagsInput = document.createElement('input');
			flagsInput.type = 'text';
			flagsInput.style.width = '80px';
			flagsInput.placeholder = 'i';
			const addBtn = Object.assign(document.createElement('button'), {
				className: 'secondary'
			});
			addBtn.style.padding = '6px 12px';
			addBtn.style.fontSize = '13px';
			controls.append(patternLabel, patternInput, flagsLabel, flagsInput, addBtn);
			form.append(titleRow, controls);

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
			const searchNote = document.createElement('div');
			searchNote.className = 'tm-search-note';
			const typeSelect = document.createElement('select');
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
			topRight.append(searchLabel, searchInput, typeLabel, typeSelect);
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
				input.addEventListener('change', () => {
					if (input.checked) tagFilters.add(code);
					else tagFilters.delete(code);
					invalidateViewState({ clearRegex: true });
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
			listSection.append(listTitle, toolbar, list);
			wrap.append(versionSection, settingsSection, apiSection, pairSection, form, listSection);

			const regexMatchCache = new Map<string, RegexMatchCacheEntry>();
			const rowRefs = new Map<string, { checkbox: HTMLInputElement }>();
			let baseViewStateCache: BlockListBaseViewState | null = null;
			let viewStateCache: BlockListViewState | null = null;
			let selectionVersion = 0;
			const getCurrentItems = () => this.app.storage.all();
			const getStatusCode = (item: BlockItem, blockedIds: Set<string> | null = null) => item.type === 'handle'
				? this.app.pairService.getHandleStatus(item.value, blockedIds).code
				: null;
			const markSelectionChanged = () => {
				selectionVersion += 1;
				viewStateCache = null;
			};
			const setSelectionValue = (key: string | null, selected: boolean) => {
				if (!key) return false;
				if (selected) {
					if (selection.has(key)) return false;
					selection.add(key);
					markSelectionChanged();
					return true;
				}
				if (!selection.has(key)) return false;
				selection.delete(key);
				markSelectionChanged();
				return true;
			};
			const invalidateViewState = ({ clearRegex = false } = {}) => {
				baseViewStateCache = null;
				viewStateCache = null;
				rowRefs.clear();
				if (clearRegex) regexMatchCache.clear();
			};
			const getItemsRevision = (items: BlockItem[]) => (items || [])
				.map(item => `${item.type}:${item.value}:${item.flags || ''}`)
				.join('\u001f');
			const getPairRevision = (items: BlockItem[], blockedIds: Set<string> | null = null) => (items || [])
				.filter(item => item.type === 'handle')
				.map(item => {
					const status = this.app.pairService.getHandleStatus(item.value, blockedIds);
					const pair = status?.pair || null;
					return [
						getItemKey(item),
						status?.code || '',
						pair?.uid || '',
						pair?.verifiedAt || '',
						pair?.lastResolvedUid || '',
						pair?.lastError || '',
						pair?.source || ''
					].join(':');
				})
				.join('\u001e');
			const pruneSelection = (keyedItems?: Map<string, BlockItem>) => {
				const valid = keyedItems || new Map(getCurrentItems()
					.map((item: BlockItem): [string | null, BlockItem] => [getItemKey(item), item])
					.filter((entry: [string | null, BlockItem]): entry is [string, BlockItem] => !!entry[0]));
				let changed = false;
				for (const key of Array.from(selection)) {
					if (!valid.has(key)) {
						selection.delete(key);
						changed = true;
					}
				}
				if (changed) markSelectionChanged();
			};
			const buildBaseViewState = (): BlockListBaseViewState => {
				const allItems = getCurrentItems();
				const blockedIds = this.app.pairService.getBlockedIdSet(allItems);
				const keyedItems: Map<string, BlockItem> = new Map(allItems
					.map((item: BlockItem): [string | null, BlockItem] => [getItemKey(item), item])
					.filter((entry: [string | null, BlockItem]): entry is [string, BlockItem] => !!entry[0]));
				const handleItems = allItems.filter((item: BlockItem) => item.type === 'handle');
				const searchIndex = buildManagerSearchIndex(allItems);
				const searched = searchManagerIndex(searchIndex, searchQuery);
				const typeValue = typeSelect.value || 'all';
				const visibleItems = searched.filter((item: BlockItem) => {
					if (typeValue !== 'all' && item.type !== typeValue) return false;
					if (!tagFilters.size) return true;
					if (item.type !== 'handle') return false;
					return tagFilters.has(getStatusCode(item, blockedIds));
				});
				const visibleKeys = visibleItems.map(getItemKey).filter(isNonNull);
				return {
					signature: [
						getItemsRevision(allItems),
						getPairRevision(handleItems, blockedIds),
						String(this.app.settings.isHandleCaseSensitive()),
						(typeSelect.value || 'all'),
						String(searchQuery || '').trim().toLowerCase(),
						Array.from(tagFilters).sort().join(',')
					].join('|'),
					itemsRevision: getItemsRevision(allItems),
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
				if (force || !baseViewStateCache) baseViewStateCache = buildBaseViewState();
				const baseViewState = baseViewStateCache;
				pruneSelection(baseViewState.keyedItems);
				if (
					!force &&
					viewStateCache &&
					viewStateCache.baseSignature === baseViewState.signature &&
					viewStateCache.selectionVersion === selectionVersion
				) {
					return viewStateCache;
				}
				const selectedItems = Array.from(selection)
					.map(key => baseViewState.keyedItems.get(key))
					.filter(isNonNull);
				const selectedHandleCount = selectedItems.filter(item => item.type === 'handle').length;
				const selectedVisibleCount = baseViewState.visibleKeys.filter(key => selection.has(key)).length;
				viewStateCache = {
					...baseViewState,
					baseSignature: baseViewState.signature,
					selectionVersion,
					selectedItems,
					selectedHandleCount,
					selectedVisibleCount
				};
				return viewStateCache;
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
				let entry = regexMatchCache.get(cacheKey);
				if (!entry) {
					entry = {
						revision: viewState?.itemsRevision || '',
						caseSensitive: this.app.settings.isHandleCaseSensitive(),
						matchCount: null,
						matches: null
					};
					regexMatchCache.set(cacheKey, entry);
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
				for (const [itemKey, refs] of rowRefs.entries()) {
					if (refs?.checkbox) refs.checkbox.checked = selection.has(itemKey);
				}
			};
			const syncApiStatus = () => {
				apiInput.value = this.app.apiConfig.getApiKey();
				apiStatus.textContent = this.app.apiConfig.hasApiKey()
					? t('apiKeyStatusSaved', this.app.apiConfig.getMaskedApiKey())
					: t('apiKeyStatusMissing');
				this._renderApiTestStatus(apiTestStatus, this.app.apiConfig.getLastTestResult(), apiTestBusy);
				apiProgress.hidden = !apiTestBusy;
			};
			const syncActionState = (viewState = computeViewState()) => {
				const hasKey = this.app.apiConfig.hasApiKey();
				const pairBulk = bulkSelect.value === 'create' || bulkSelect.value === 'update';
				createBtn.disabled = busy || !hasKey;
				updateBtn.disabled = busy || !hasKey;
				createBtn.textContent = busy ? t('pairWorking') : t('pairCreate');
				updateBtn.textContent = busy ? t('pairWorking') : t('pairUpdate');
				pairProgress.hidden = !busy;
				testApiBtn.disabled = apiTestBusy || !hasKey;
				testApiBtn.textContent = apiTestBusy ? t('apiKeyTestRunning') : t('apiKeyTest');
				masterToggle.disabled = busy || !viewState.visibleKeys.length;
				masterToggle.checked = !!viewState.visibleKeys.length && viewState.selectedVisibleCount === viewState.visibleKeys.length;
				masterToggle.indeterminate = viewState.selectedVisibleCount > 0 && viewState.selectedVisibleCount < viewState.visibleKeys.length;
				executeBtn.disabled = busy || !selection.size || (pairBulk && (!hasKey || !viewState.selectedHandleCount));
				clearSelectionBtn.disabled = busy || !selection.size;
				bulkSelect.disabled = busy;
				counter.textContent = t('pairResultSummary', {
					selected: selection.size,
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
				toggle.checked = this.app.pairStore.isUidDetectionEnabled();
				caseToggle.checked = this.app.settings.isHandleCaseSensitive();
				syncApiStatus();
				this._renderPairResultList(pairResultPanel, this.app.getLastPairRunResult());
				syncActionState(computeViewState());
			};
			const renderList = (viewState = computeViewState()) => {
				listTitle.textContent = t('manageTitle', viewState.allItems.length);
				rowRefs.clear();
				list.replaceChildren();
				if (!viewState.allItems.length || !viewState.visibleItems.length) {
					const li = document.createElement('li');
					li.className = 'tm-list-empty';
					li.textContent = viewState.allItems.length
						? (searchQuery ? t('searchNoMatches') : t('noFilteredEntries'))
						: t('noEntries');
					list.appendChild(li);
					syncActionState(viewState);
					return;
				}
				for (const item of viewState.visibleItems) {
					const itemKey = getItemKey(item);
					if (!itemKey) continue;
					const li = document.createElement('li');
					const checkbox = document.createElement('input');
					checkbox.type = 'checkbox';
					checkbox.className = 'tm-item-check';
					checkbox.checked = selection.has(itemKey);
					checkbox.addEventListener('change', () => {
						setSelectionValue(itemKey, checkbox.checked);
						syncActionState();
					});
					rowRefs.set(itemKey, { checkbox });

					const left = document.createElement('div');
					left.className = 'tm-block-main';
					const label = document.createElement('div');
					label.className = 'tm-block-label';
					label.textContent = item.type === 'regex' ? `/${item.value}/${item.flags || ''}` : item.value;
					const badges = document.createElement('div');
					badges.className = 'tm-block-badges';
					const meta = document.createElement('div');
					meta.className = 'tm-block-meta';

					if (item.type === 'handle') {
						const status = this.app.pairService.getHandleStatus(item.value, viewState.blockedIds);
						badges.appendChild(this._makeBadge(status.code));
						if (status.pair?.uid) meta.appendChild(this._createMetaLine(t('metaUid', status.pair.uid)));
						if (status.pair?.verifiedAt) {
							meta.appendChild(this._createMetaLine(t('metaVerifiedAt', formatDateTime(status.pair.verifiedAt))));
						}
						if (status.pair?.lastResolvedUid && status.pair.lastResolvedUid !== status.pair.uid) {
							meta.appendChild(this._createMetaLine(t('metaResolvedUid', status.pair.lastResolvedUid)));
						}
						if (status.pair?.source) meta.appendChild(this._createMetaLine(t('metaSource', status.pair.source)));
						if (status.pair?.lastError) meta.appendChild(this._createMetaLine(t('metaError', status.pair.lastError)));
					} else if (item.type === 'id') {
						badges.appendChild(this._makeBadge('uid'));
					} else if (item.type === 'regex') {
						badges.appendChild(this._makeBadge('regex'));
						const regexSummary = document.createElement('div');
						regexSummary.className = 'tm-regex-summary';
						const renderRegexSummary = () => {
							const currentViewState = computeViewState();
							const regexActions = document.createElement('div');
							regexActions.className = 'tm-regex-actions';
							const regexState = getRegexMatchState(
								item,
								currentViewState,
								expandedRegexKeys.has(itemKey) ? 'full' : 'count'
							);
							const countLine = document.createElement('div');
							countLine.className = 'tm-inline-note';
							countLine.textContent = t('regexMatchedCount', regexState.matchCount || 0);
							const selectMatchesBtn = Object.assign(document.createElement('button'), {
								textContent: t('regexSelectMatches')
							});
							selectMatchesBtn.disabled = !(regexState.matchCount || 0) || isBusy();
							selectMatchesBtn.addEventListener('click', () => {
								const matchState = getRegexMatchState(item, computeViewState(), 'full');
								let changed = false;
								for (const match of matchState.matches || []) {
									const matchKey = getItemKey(match);
									if (!matchKey || selection.has(matchKey)) continue;
									selection.add(matchKey);
									changed = true;
								}
								if (changed) markSelectionChanged();
								syncVisibleSelection();
								syncActionState();
								Toast.show(t('regexSelectedMatches', matchState.matchCount || 0));
							});
							const toggleRegexBtn = Object.assign(document.createElement('button'), {
								textContent: expandedRegexKeys.has(itemKey) ? t('regexCollapse') : t('regexExpand')
							});
							toggleRegexBtn.disabled = !(regexState.matchCount || 0);
							toggleRegexBtn.addEventListener('click', () => {
								if (expandedRegexKeys.has(itemKey)) {
									expandedRegexKeys.delete(itemKey);
									showAllRegexKeys.delete(itemKey);
								} else {
									expandedRegexKeys.add(itemKey);
									showAllRegexKeys.set(itemKey, REGEX_MATCH_INITIAL_LIMIT);
								}
								renderRegexSummary();
							});
							regexActions.append(countLine, selectMatchesBtn, toggleRegexBtn);
							regexSummary.replaceChildren(regexActions);
							if (!expandedRegexKeys.has(itemKey)) return;
							const fullMatchState = getRegexMatchState(item, currentViewState, 'full');
							const matches = fullMatchState.matches || [];
							if (!matches.length) {
								const empty = document.createElement('div');
								empty.className = 'tm-inline-note';
								empty.textContent = t('regexNoMatches');
								regexSummary.appendChild(empty);
								return;
							}
							const listWrap = document.createElement('ul');
							listWrap.className = 'tm-regex-match-list';
							const storedLimit = Number(showAllRegexKeys.get(itemKey));
							const limit = Math.min(
								matches.length,
								Number.isFinite(storedLimit) && storedLimit > 0 ? storedLimit : REGEX_MATCH_INITIAL_LIMIT
							);
							for (const match of matches.slice(0, limit)) {
								const row = document.createElement('li');
								row.textContent = match.value;
								listWrap.appendChild(row);
							}
							regexSummary.appendChild(listWrap);
							if (limit < matches.length) {
								const showMoreBtn = Object.assign(document.createElement('button'), {
									textContent: t('regexShowMore', limit, matches.length)
								});
								showMoreBtn.addEventListener('click', () => {
									showAllRegexKeys.set(itemKey, Math.min(matches.length, limit + REGEX_MATCH_PAGE_SIZE));
									renderRegexSummary();
								});
								regexSummary.appendChild(showMoreBtn);
							} else if (matches.length > REGEX_MATCH_INITIAL_LIMIT) {
								const showLessBtn = Object.assign(document.createElement('button'), {
									textContent: t('regexShowLess')
								});
								showLessBtn.addEventListener('click', () => {
									showAllRegexKeys.set(itemKey, REGEX_MATCH_INITIAL_LIMIT);
									renderRegexSummary();
								});
								regexSummary.appendChild(showLessBtn);
							}
						};
						renderRegexSummary();
						meta.appendChild(regexSummary);
					}

					const removeBtn = Object.assign(document.createElement('button'), { textContent: t('unblock') });
					removeBtn.disabled = busy;
					removeBtn.addEventListener('click', () => {
						setSelectionValue(itemKey, false);
						this.app.removeEntry(item);
						renderAll();
						Toast.show(t('removed', label.textContent));
					});
					left.append(label, badges);
					if (meta.childNodes.length) left.appendChild(meta);
					li.append(checkbox, left, removeBtn);
					list.appendChild(li);
				}
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
				settingsTitle.textContent = t('handleCaseLabel');
				caseText.textContent = t('handleCaseLabel');
				caseHelp.textContent = t('handleCaseHelp');
				caseLegacy.textContent = t('handleCaseLegacy');
				openSettingsBtn.textContent = t('openSettings');
				apiTitle.textContent = t('apiKeyTitle');
				apiLabel.textContent = t('apiKeyLabel');
				apiInput.placeholder = t('apiKeyPlaceholder');
				apiHelp.textContent = t('apiKeyHelp');
				saveApiBtn.textContent = t('apiKeySave');
				clearApiBtn.textContent = t('apiKeyClear');
				pairTitle.textContent = t('uidDetectionLabel');
				toggleText.textContent = t('uidDetectionLabel');
				toggleHelp.textContent = t('uidDetectionHelp');
				createBtn.textContent = t('pairCreate');
				updateBtn.textContent = t('pairUpdate');
				summaryTitle.textContent = t('pairSummary');
				formTitle.textContent = t('addRegex');
				regexrBtn.textContent = t('testRegex');
				patternLabel.textContent = t('patternLabel') + ':';
				flagsLabel.textContent = t('flagsLabel') + ':';
				addBtn.textContent = t('addBtn');
				masterText.textContent = t('selectVisible');
				searchLabel.textContent = t('searchLabel');
				searchInput.placeholder = t('searchPlaceholder');
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
				searchNote.textContent = searchQuery ? t('searchLabel') : '';
				renderAll();
			};
			const setBusy = (nextBusy: boolean) => {
				busy = !!nextBusy;
				renderSummary();
			};

			caseToggle.addEventListener('change', () => {
				this.app.settings.setHandleCaseSensitive(caseToggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			openSettingsBtn.addEventListener('click', () => {
				Dialog.closeAll('navigate');
				this.openSettings();
			});
			toggle.addEventListener('change', () => {
				this.app.pairStore.setUidDetectionEnabled(toggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			searchInput.addEventListener('input', () => {
				searchQuery = searchInput.value || '';
				invalidateViewState({ clearRegex: true });
				renderList();
			});
			typeSelect.addEventListener('change', () => {
				invalidateViewState({ clearRegex: true });
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
						if (selection.has(key)) continue;
						selection.add(key);
						changed = true;
					} else if (selection.has(key)) {
						selection.delete(key);
						changed = true;
					}
				}
				if (changed) markSelectionChanged();
				syncVisibleSelection();
				syncActionState();
			});
			clearSelectionBtn.addEventListener('click', () => {
				if (!selection.size) return;
				selection.clear();
				markSelectionChanged();
				syncVisibleSelection();
				syncActionState();
			});
			saveApiBtn.addEventListener('click', () => {
				this.app.apiConfig.setApiKey(apiInput.value);
				this.app.refreshAfterStorageChange();
				renderAll();
				Toast.show(t('apiKeySaved'));
			});
			testApiBtn.addEventListener('click', async () => {
				apiTestBusy = true;
				renderSummary();
				const result = await this.app.testApiKey();
				apiTestBusy = false;
				renderSummary();
				Toast.show(t('apiKeyTestResult', getApiTestCategoryLabel(result.category), result.message, result.httpStatus ? String(result.httpStatus) : ''), 3200);
			});
			clearApiBtn.addEventListener('click', () => {
				this.app.apiConfig.clearApiKey();
				this.app.refreshAfterStorageChange();
				renderAll();
				Toast.show(t('apiKeyCleared'));
			});
			createBtn.addEventListener('click', async () => {
				setBusy(true);
				const stats = await this.app.runPairUpdate('create');
				setBusy(false);
				Toast.show(t('pairResult', stats), 3200);
				renderAll();
			});
			updateBtn.addEventListener('click', async () => {
				setBusy(true);
				const stats = await this.app.runPairUpdate('update');
				setBusy(false);
				Toast.show(t('pairResult', stats), 3200);
				renderAll();
			});
			executeBtn.addEventListener('click', async () => {
				const selectedItems = computeViewState().selectedItems;
				if (!selectedItems.length) return;
				if (bulkSelect.value === 'delete') {
					this.app.removeEntries(selectedItems);
					const removedCount = selectedItems.length;
					selection.clear();
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
				const stats = await this.app.runPairUpdate(bulkSelect.value, handles);
				setBusy(false);
				Toast.show(t('pairResult', stats), 3200);
				renderAll();
			});
			addBtn.addEventListener('click', () => {
				let pattern = (patternInput.value || '').trim();
				let flags = (flagsInput.value || '').trim();
				if (!pattern) return;
				const literal = parseRegexLiteral(pattern);
				if (literal) { pattern = literal.pattern; flags = literal.flags || ''; }
				if (!validateRegexSpec(pattern, flags)) { Toast.show(t('invalidRegex')); return; }
				const ok = this.app.storage.addRegex(pattern, flags);
				if (!ok) { Toast.show(t('exists')); return; }
				this.app.refreshAfterStorageChange();
				patternInput.value = '';
				flagsInput.value = '';
				renderAll();
				Toast.show(t('addedRegex'));
			});

			applyLanguage();
			Dialog.show({
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
					applyLanguage();
				}
			}).then(v => {
				if (v === 'import') this.importList();
				else if (v === 'export') this.exportList();
			});
		}

		exportList() {
			const json = JSON.stringify({ version: 2, exportedAt: Date.now(), items: this.app.storage.all() }, null, 2);
			const body = document.createElement('div');

			const p = document.createElement('p'); p.textContent = t('exportHint');
			const h4a = document.createElement('h4'); h4a.textContent = t('json');
			const ta1 = document.createElement('textarea'); ta1.readOnly = true; ta1.value = json;
			const h4b = document.createElement('h4'); h4b.textContent = t('text');
			const ta2 = document.createElement('textarea'); ta2.readOnly = true;
			ta2.value = this.app.storage.all().map((it: BlockItem) => it.type === 'regex' ? exportRegexLiteral(it) : it.value).join('\n');
			body.append(p, h4a, ta1, h4b, ta2);
			Dialog.show({
				title: t('export'),
				body,
				buttons: [{ label: t('close'), value: false, primary: true }],
				onRefresh: (ctx) => {
					ctx.setTitle(t('export'));
					p.textContent = t('exportHint');
					h4a.textContent = t('json');
					h4b.textContent = t('text');
					ctx.buttons[0].textContent = t('close');
				}
			});
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
						Toast.show(getLang() === 'ko' ? '가져오기 입력이 너무 큽니다.' : 'Import text is too large.');
						return { ok: false, count: 0 };
					}
					const txt = rawText.trim();
					if (!txt) return { ok: false, count: 0 };

					let items = [];
					try {
						const obj = JSON.parse(txt);
						if (obj && Array.isArray(obj.items)) items = obj.items;
						else if (obj && Array.isArray(obj.handles)) items = obj.handles.map((h: any) => ({ type: 'handle', value: h }));
					} catch {
						const parts = txt.split(/\n+/).flatMap(line => {
							const trimmed = line.trim();
							const literal = parseRegexLiteral(trimmed);
							return literal ? [trimmed] : trimmed.split(',');
						});
						items = parts.map(s => s.trim()).filter(Boolean).map(s => {
							if (s.startsWith('@')) return { type: 'handle', value: s };
							const literal = parseRegexLiteral(s);
							if (literal) return { type: 'regex', value: literal.pattern, flags: literal.flags };
							if (isChannelId(s)) return { type: 'id', value: s };
							return { type: 'handle', value: s };
						}).filter(Boolean);
					}
					const before = this.app.storage.all().length;
					this.app.storage.setAll([...this.app.storage.all(), ...items]);
					const count = this.app.storage.all().length - before;
					this.app.refreshAfterStorageChange();
					return { ok: true, count };
				}
			}).then(res => {
				if (res && res.ok) Toast.show(t('importedCount', res.count));
			});
		}
	}
