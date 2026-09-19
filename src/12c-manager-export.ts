import { exportRegexLiteral, type BlockItem } from './02-utils-i18n.ts';

export function createManagerExport(items: BlockItem[]): { json: string; text: string } {
	return {
		json: JSON.stringify({ version: 2, exportedAt: Date.now(), items }, null, 2),
		text: items.map(item => item.type === 'regex' ? exportRegexLiteral(item) : item.value).join('\n')
	};
}

export function downloadManagerExport(filename: string, content: string, type: string): void {
	const blob = new Blob([content], { type: `${type};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
