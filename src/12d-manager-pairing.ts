import { t, type PairOutcome, type PairRunStats } from './02-utils-i18n.ts';

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
