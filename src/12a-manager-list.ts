import { t } from './02-utils-i18n.ts';

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
