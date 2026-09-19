import { t, type PairOutcome, type PairRunStats } from './02-utils-i18n.ts';
import { Dialog, Toast } from './08-toast-dialog.ts';

export type ManagerPairController = {
	busy: boolean;
	begin(): number;
	isCurrent(operation: number): boolean;
	dispose(): void;
};

export const createManagerPairController = (): ManagerPairController => {
	let active = true;
	let generation = 0;
	return {
		busy: false,
		begin() { generation += 1; return generation; },
		isCurrent(operation) { return active && operation === generation; },
		dispose() { active = false; generation += 1; this.busy = false; }
	};
};

export const getPairOutcomeLabel = (code: PairOutcome | string): string => {
	if (code === 'created') return t('pairOutcomeCreated');
	if (code === 'updated') return t('pairOutcomeUpdated');
	if (code === 'mismatch') return t('pairOutcomeMismatch');
	if (code === 'failed') return t('pairOutcomeFailed');
	return t('pairOutcomeSkipped');
};

export const getFailedPairHandles = (stats: PairRunStats | null | undefined): string[] => (stats?.items || [])
	.filter(item => item?.outcome === 'failed' && item.handle)
	.map(item => item.handle);

export const getPairResultItems = (stats: PairRunStats | null | undefined, options: { filter?: string; sort?: string } = {}) => {
	const items = Array.isArray(stats?.items) ? stats.items.slice() : [];
	const filtered = options.filter && options.filter !== 'all' ? items.filter(item => item.outcome === options.filter) : items;
	if (options.sort === 'handle') filtered.sort((a, b) => String(a.handle || '').localeCompare(String(b.handle || '')));
	if (options.sort === 'outcome') {
		const order = ['failed', 'mismatch', 'created', 'updated', 'skipped'];
		filtered.sort((a, b) => (order.indexOf(a.outcome) < 0 ? order.length : order.indexOf(a.outcome)) - (order.indexOf(b.outcome) < 0 ? order.length : order.indexOf(b.outcome)) || String(a.handle || '').localeCompare(String(b.handle || '')));
	}
	return filtered;
};

export type ManagerPairResultContext = {
	getPageSize: () => number;
	renderPagination: (container: HTMLElement, page: number, total: number, onChange: (page: number) => void) => number;
	copyText: (text: string) => void;
	showFailedExport: (handles: string[]) => void;
	getOutcomeLabel: (code: PairOutcome | string) => string;
	getResultItems: (stats: PairRunStats | null | undefined, options: { filter?: string; sort?: string }) => any[];
	getFailedHandles: (stats: PairRunStats | null | undefined) => string[];
	createMetaLine: (text: any) => HTMLElement;
};

export function renderManagerPairResultList(container: HTMLElement, stats: PairRunStats | null | undefined, context: ManagerPairResultContext): void {
	const previousOpen = container.querySelector('details')?.open;
	const state = container.__pairResultState || { filter: 'all', sort: 'original', page: 0 };
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
	for (const outcome of ['all', 'created', 'updated', 'mismatch', 'failed', 'skipped']) {
		const option = document.createElement('option');
		option.value = outcome;
		option.textContent = outcome === 'all' ? t('pairResultFilterAll') : context.getOutcomeLabel(outcome);
		filterSelect.appendChild(option);
	}
	filterSelect.value = state.filter;
	const sortLabel = document.createElement('label');
	sortLabel.textContent = t('pairResultSortLabel');
	const sortSelect = document.createElement('select');
	for (const [value, label] of [['original', t('pairResultSortOriginal')], ['outcome', t('pairResultSortOutcome')], ['handle', t('pairResultSortHandle')]]) {
		const option = document.createElement('option');
		option.value = value;
		option.textContent = label;
		sortSelect.appendChild(option);
	}
	sortSelect.value = state.sort;
	const failedHandles = context.getFailedHandles(stats);
	const copyFailedBtn = Object.assign(document.createElement('button'), { textContent: t('pairResultCopyFailed'), disabled: !failedHandles.length });
	const exportFailedBtn = Object.assign(document.createElement('button'), { textContent: t('pairResultExportFailed'), disabled: !failedHandles.length });
	filterSelect.addEventListener('change', () => {
		state.filter = filterSelect.value || 'all';
		state.page = 0;
		renderManagerPairResultList(container, stats, context);
	});
	sortSelect.addEventListener('change', () => {
		state.sort = sortSelect.value || 'original';
		state.page = 0;
		renderManagerPairResultList(container, stats, context);
	});
	copyFailedBtn.addEventListener('click', () => {
		context.copyText(failedHandles.join('\n'));
		Toast.show(t('pairResultFailedCopied', failedHandles.length));
	});
	exportFailedBtn.addEventListener('click', () => context.showFailedExport(failedHandles));
	controls.append(filterLabel, filterSelect, sortLabel, sortSelect, copyFailedBtn, exportFailedBtn);
	const list = document.createElement('ul');
	list.className = 'tm-result-list';
	const resultItems = context.getResultItems(stats, state);
	const pagination = document.createElement('div');
	state.page = context.renderPagination(pagination, state.page || 0, resultItems.length, page => {
		state.page = page;
		renderManagerPairResultList(container, stats, context);
		container.querySelector<HTMLButtonElement>(state.page === 0 ? '[data-action="next-page"]' : '[data-action="previous-page"]')?.focus();
	});
	const pageSize = context.getPageSize();
	const start = state.page * pageSize;
	for (const item of resultItems.slice(start, start + pageSize)) {
		const li = document.createElement('li');
		const title = document.createElement('div');
		const outcome = document.createElement('span');
		outcome.className = 'tm-result-outcome';
		outcome.textContent = context.getOutcomeLabel(item.outcome);
		const handle = document.createElement('span');
		handle.textContent = ` ${item.handle}`;
		title.append(outcome, handle);
		li.appendChild(title);
		if (item.uid) li.appendChild(context.createMetaLine(t('metaUid', item.uid)));
		if (item.resolvedUid && item.resolvedUid !== item.uid) li.appendChild(context.createMetaLine(t('metaResolvedUid', item.resolvedUid)));
		if (item.message) li.appendChild(context.createMetaLine(item.message));
		list.appendChild(li);
	}
	details.append(summary, controls, list, pagination);
	container.appendChild(details);
}

export function showManagerPairResultDialog(stats: PairRunStats, context: ManagerPairResultContext): void {
	const body = document.createElement('div');
	renderManagerPairResultList(body, stats, context);
	Dialog.show({
		title: t('pairResultDialogTitle'),
		body,
		buttons: [{ label: t('close'), value: false, primary: true }],
		onRefresh: (ctx: any) => {
			ctx.setTitle(t('pairResultDialogTitle'));
			ctx.buttons[0].textContent = t('close');
			renderManagerPairResultList(body, stats, context);
		}
	});
}
