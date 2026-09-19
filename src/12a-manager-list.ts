import { getItemKey, REGEX_MATCH_INITIAL_LIMIT, REGEX_MATCH_PAGE_SIZE, t, type BlockItem } from './02-utils-i18n.ts';

export type ManagerListState = {
	selection: Set<string>;
	tagFilters: Set<string>;
	expandedRegexKeys: Set<string>;
	showAllRegexKeys: Map<string, number>;
	searchQuery: string;
	searchRenderFrame: number | null;
	isComposingSearch: boolean;
	searchRenderTimer: ReturnType<typeof setTimeout> | null;
	page: number;
	lastListFilter: string;
	regexMatchCache: Map<string, any>;
	rowRefs: Map<string, { checkbox: HTMLInputElement }>;
	searchIndexCache: any;
	baseViewStateCache: any;
	viewStateCache: any;
	selectionVersion: number;
	dispose(): void;
};

export function createManagerListController(savedViewState: any, validTagFilters: Set<string>): ManagerListState {
	const state: ManagerListState = {
		selection: new Set<string>(Array.isArray(savedViewState?.selection) ? savedViewState.selection : []),
		tagFilters: new Set<string>((Array.isArray(savedViewState?.tagFilters) ? savedViewState.tagFilters : [])
			.filter((code: string) => validTagFilters.has(code))),
		expandedRegexKeys: new Set(),
		showAllRegexKeys: new Map(),
		searchQuery: String(savedViewState?.searchQuery || ''),
		searchRenderFrame: null,
		isComposingSearch: false,
		searchRenderTimer: null,
		page: Math.max(0, Math.floor(Number(savedViewState?.page) || 0)),
		lastListFilter: '',
		regexMatchCache: new Map(),
		rowRefs: new Map(),
		searchIndexCache: null,
		baseViewStateCache: null,
		viewStateCache: null,
		selectionVersion: 0,
		dispose() {
			if (state.searchRenderFrame !== null) cancelAnimationFrame(state.searchRenderFrame);
			if (state.searchRenderTimer !== null) clearTimeout(state.searchRenderTimer);
			state.searchRenderFrame = null;
			state.searchRenderTimer = null;
			state.regexMatchCache.clear();
			state.rowRefs.clear();
			state.searchIndexCache = null;
			state.baseViewStateCache = null;
			state.viewStateCache = null;
			state.selection.clear();
			state.tagFilters.clear();
			state.expandedRegexKeys.clear();
			state.showAllRegexKeys.clear();
		}
	};
	return state;
}

export const getManagerPageSize = (app: any): number => app?.settings?.isLowPerformanceMode?.() ? 50 : 100;

export function renderManagerPagination(container: HTMLElement, page: number, total: number, pageSize: number, onChange: (page: number) => void): number {
	const pages = Math.max(1, Math.ceil(total / pageSize));
	page = Math.max(0, Math.min(page, pages - 1));
	const previous = Object.assign(document.createElement('button'), { type: 'button', textContent: t('pagePrevious'), disabled: page === 0 });
	const next = Object.assign(document.createElement('button'), { type: 'button', textContent: t('pageNext'), disabled: page === pages - 1 });
	previous.dataset.action = 'previous-page';
	next.dataset.action = 'next-page';
	for (const button of [previous, next]) button.addEventListener('keydown', event => { if (event.key === 'Enter') event.stopPropagation(); });
	const status = document.createElement('span');
	status.setAttribute('aria-live', 'polite');
	status.textContent = t('pageStatus', page + 1, pages, total);
	previous.addEventListener('click', () => onChange(page - 1));
	next.addEventListener('click', () => onChange(page + 1));
	container.className = 'tm-inline-actions tm-pagination';
	container.replaceChildren(previous, status, next);
	return page;
}

export function createManagerListCacheController(state: ManagerListState, persistViewState: () => void, getCurrentItems: () => BlockItem[]) {
	const markSelectionChanged = () => {
		state.selectionVersion += 1;
		state.viewStateCache = null;
		persistViewState();
	};
	return {
		markSelectionChanged,
		setSelectionValue(key: string | null, selected: boolean) {
			if (!key) return false;
			if (selected) {
				if (state.selection.has(key)) return false;
				state.selection.add(key);
				markSelectionChanged();
				return true;
			}
			if (!state.selection.has(key)) return false;
			state.selection.delete(key);
			markSelectionChanged();
			return true;
		},
		invalidate({ clearRegex = false }: { clearRegex?: boolean } = {}) {
			state.baseViewStateCache = null;
			state.viewStateCache = null;
			state.rowRefs.clear();
			if (clearRegex) state.regexMatchCache.clear();
		},
		pruneSelection(keyedItems?: Map<string, BlockItem>) {
			const valid = keyedItems || new Map(getCurrentItems()
				.map((item: BlockItem): [string | null, BlockItem] => [getItemKey(item), item])
				.filter((entry: [string | null, BlockItem]): entry is [string, BlockItem] => !!entry[0]));
			let changed = false;
			for (const key of Array.from(state.selection)) {
				if (!valid.has(key)) {
					state.selection.delete(key);
					changed = true;
				}
			}
			if (changed) markSelectionChanged();
		}
	};
}

export type ManagerListRowContext = {
	state: ManagerListState;
	viewState: any;
	pageSize: number;
	pairBusy: boolean;
	isBusy: () => boolean;
	getPairStatus: (handle: string, blockedIds: Set<string>) => any;
	formatDate: (value: number) => string | null;
	makeBadge: (code: string) => HTMLElement;
	createMetaLine: (text: any) => HTMLElement;
	showToast: (message: string) => void;
	getRegexMatchState: (item: BlockItem, viewState: any, mode: string) => any;
	computeViewState: () => any;
	setSelectionValue: (key: string | null, selected: boolean) => boolean;
	markSelectionChanged: () => void;
	syncVisibleSelection: () => void;
	syncActionState: () => void;
	removeItem: (item: BlockItem) => boolean;
	renderAll: () => void;
};

export function renderManagerListRows(items: BlockItem[], context: ManagerListRowContext): HTMLLIElement[] {
	const { state } = context;
	const rows: HTMLLIElement[] = [];
	for (const item of items) {
		const itemKey = getItemKey(item);
		if (!itemKey) continue;
		const li = document.createElement('li');
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.className = 'tm-item-check';
		checkbox.checked = state.selection.has(itemKey);
		checkbox.addEventListener('change', () => {
			context.setSelectionValue(itemKey, checkbox.checked);
			context.syncActionState();
		});
		state.rowRefs.set(itemKey, { checkbox });

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
			const status = context.getPairStatus(item.value, context.viewState.blockedIds);
			badges.appendChild(context.makeBadge(status.code));
			if (status.pair?.uid) meta.appendChild(context.createMetaLine(t('metaUid', status.pair.uid)));
			if (status.pair?.verifiedAt) meta.appendChild(context.createMetaLine(t('metaVerifiedAt', context.formatDate(status.pair.verifiedAt))));
			if (status.pair?.lastResolvedUid && status.pair.lastResolvedUid !== status.pair.uid) meta.appendChild(context.createMetaLine(t('metaResolvedUid', status.pair.lastResolvedUid)));
			if (status.pair?.source) meta.appendChild(context.createMetaLine(t('metaSource', status.pair.source)));
			if (status.pair?.lastError) meta.appendChild(context.createMetaLine(t('metaError', status.pair.lastError)));
		} else if (item.type === 'id') {
			badges.appendChild(context.makeBadge('uid'));
		} else if (item.type === 'regex') {
			badges.appendChild(context.makeBadge('regex'));
			const regexSummary = document.createElement('div');
			regexSummary.className = 'tm-regex-summary';
			const renderRegexSummary = () => {
				const currentViewState = context.computeViewState();
				const regexActions = document.createElement('div');
				regexActions.className = 'tm-regex-actions';
				const regexState = context.getRegexMatchState(item, currentViewState, state.expandedRegexKeys.has(itemKey) ? 'full' : 'count');
				const countLine = document.createElement('div');
				countLine.className = 'tm-inline-note';
				countLine.textContent = t('regexMatchedCount', regexState.matchCount || 0);
				const selectMatchesBtn = Object.assign(document.createElement('button'), { textContent: t('regexSelectMatches') });
				selectMatchesBtn.disabled = !(regexState.matchCount || 0) || context.isBusy();
				selectMatchesBtn.addEventListener('click', () => {
					const matchState = context.getRegexMatchState(item, context.computeViewState(), 'full');
					let changed = false;
					for (const match of matchState.matches || []) {
						const matchKey = getItemKey(match);
						if (!matchKey || state.selection.has(matchKey)) continue;
						state.selection.add(matchKey);
						changed = true;
					}
					if (changed) context.markSelectionChanged();
					context.syncVisibleSelection();
					context.syncActionState();
					context.showToast(t('regexSelectedMatches', matchState.matchCount || 0));
				});
				const toggleRegexBtn = Object.assign(document.createElement('button'), { textContent: state.expandedRegexKeys.has(itemKey) ? t('regexCollapse') : t('regexExpand') });
				toggleRegexBtn.disabled = !(regexState.matchCount || 0);
				toggleRegexBtn.addEventListener('click', () => {
					if (state.expandedRegexKeys.has(itemKey)) {
						state.expandedRegexKeys.delete(itemKey);
						state.showAllRegexKeys.delete(itemKey);
					} else {
						state.expandedRegexKeys.add(itemKey);
						state.showAllRegexKeys.set(itemKey, REGEX_MATCH_INITIAL_LIMIT);
					}
					renderRegexSummary();
				});
				regexActions.append(countLine, selectMatchesBtn, toggleRegexBtn);
				regexSummary.replaceChildren(regexActions);
				if (!state.expandedRegexKeys.has(itemKey)) return;
				const matches = (context.getRegexMatchState(item, currentViewState, 'full').matches || []) as BlockItem[];
				if (!matches.length) {
					const empty = document.createElement('div');
					empty.className = 'tm-inline-note';
					empty.textContent = t('regexNoMatches');
					regexSummary.appendChild(empty);
					return;
				}
				const listWrap = document.createElement('ul');
				listWrap.className = 'tm-regex-match-list';
				const storedLimit = Number(state.showAllRegexKeys.get(itemKey));
				const limit = Math.min(matches.length, Number.isFinite(storedLimit) && storedLimit > 0 ? storedLimit : REGEX_MATCH_INITIAL_LIMIT);
				for (const match of matches.slice(0, limit)) {
					const row = document.createElement('li');
					row.textContent = match.value;
					listWrap.appendChild(row);
				}
				regexSummary.appendChild(listWrap);
				if (limit < matches.length) {
					const showMoreBtn = Object.assign(document.createElement('button'), { textContent: t('regexShowMore', limit, matches.length) });
					showMoreBtn.addEventListener('click', () => {
						state.showAllRegexKeys.set(itemKey, Math.min(matches.length, limit + REGEX_MATCH_PAGE_SIZE));
						renderRegexSummary();
					});
					regexSummary.appendChild(showMoreBtn);
				} else if (matches.length > REGEX_MATCH_INITIAL_LIMIT) {
					const showLessBtn = Object.assign(document.createElement('button'), { textContent: t('regexShowLess') });
					showLessBtn.addEventListener('click', () => {
						state.showAllRegexKeys.set(itemKey, REGEX_MATCH_INITIAL_LIMIT);
						renderRegexSummary();
					});
					regexSummary.appendChild(showLessBtn);
				}
			};
			renderRegexSummary();
			meta.appendChild(regexSummary);
		}

		const removeBtn = Object.assign(document.createElement('button'), { textContent: t('unblock') });
		removeBtn.disabled = context.pairBusy;
		removeBtn.addEventListener('click', () => {
			context.setSelectionValue(itemKey, false);
			const removed = context.removeItem(item);
			context.renderAll();
			context.showToast(removed ? t('removed', label.textContent) : t('storageSaveFailed'));
		});
		left.append(label, badges);
		if (meta.childNodes.length) left.appendChild(meta);
		li.append(checkbox, left, removeBtn);
		rows.push(li);
	}
	return rows;
}
