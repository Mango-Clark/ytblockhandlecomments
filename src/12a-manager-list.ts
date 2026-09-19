import { getItemKey, t, type BlockItem } from './02-utils-i18n.ts';

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
