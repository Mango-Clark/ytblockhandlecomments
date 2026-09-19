import { exportRegexLiteral, isChannelId, parseRegexLiteral, type BlockItem } from './02-utils-i18n.ts';

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

export function parseManagerImport(text: string): BlockItem[] {
	const rawText = String(text || '').trim();
	if (!rawText) return [];
	try {
		const value = JSON.parse(rawText);
		if (value && Array.isArray(value.items)) return value.items;
		if (value && Array.isArray(value.handles)) return value.handles.map((handle: any) => ({ type: 'handle', value: handle }));
		return [];
	} catch { }
	const parts = rawText.split(/\n+/).flatMap(line => {
		const trimmed = line.trim();
		const literal = parseRegexLiteral(trimmed);
		return literal ? [trimmed] : trimmed.split(',');
	});
	return parts.map(value => value.trim()).filter(Boolean).map(value => {
		if (value.startsWith('@')) return { type: 'handle', value };
		const literal = parseRegexLiteral(value);
		if (literal) return { type: 'regex', value: literal.pattern, flags: literal.flags };
		if (isChannelId(value)) return { type: 'id', value };
		return { type: 'handle', value };
	});
}

export function persistManagerImport(storage: any, importedItems: BlockItem[]) {
	const before = storage.all().length;
	const nextItems = [...storage.all(), ...importedItems];
	const persistence = storage.setAllResult
		? storage.setAllResult(nextItems)
		: (() => {
			const value = storage.setAll(nextItems);
			return { ok: !storage.getLastSaveError?.(), value };
		})();
	return { ok: !!persistence.ok, count: persistence.ok ? persistence.value.length - before : 0 };
}
