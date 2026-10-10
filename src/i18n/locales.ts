export const LOCALES = [
	{ code: 'en-us', name: 'English (US)', readme: 'README.md', contributors: [] },
	{ code: 'ko-kr', name: '한국어', readme: 'docs/ko-kr/README.md', contributors: ['Mango-Clark'] },
	{ code: 'ja-jp', name: '日本語', readme: 'docs/ja-jp/README.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'de-de', name: 'Deutsch', readme: 'docs/de-de/README.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'zh-cn', name: '简体中文', readme: 'docs/zh-cn/README.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'zh-tw', name: '繁體中文', readme: 'docs/zh-tw/README.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'fr-fr', name: 'Français', readme: 'docs/fr-fr/README.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'pt-br', name: 'Português (Brasil)', readme: 'docs/pt-br/README.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'ru-ru', name: 'Русский', readme: 'docs/ru-ru/README.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'id-id', name: 'Bahasa Indonesia', readme: 'docs/id-id/README.md', contributors: ['GPT-6.1 Sol'] }
] as const;

export type Locale = typeof LOCALES[number]['code'];
export const DEFAULT_LOCALE: Locale = 'en-us';

// Match external browser preferences; declared locale identifiers remain unchanged.
export const matchBrowserLocale = (value: unknown): Locale | null => {
	if (typeof value !== 'string') return null;
	const tag = value.toLowerCase();
	const exact = LOCALES.find(locale => locale.code === tag);
	if (exact) return exact.code;
	const [language, ...parts] = tag.split('-');
	if (language === 'zh') {
		if (parts.includes('hant')) return 'zh-tw';
		if (parts.includes('hans')) return 'zh-cn';
		return parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-tw' : 'zh-cn';
	}
	return LOCALES.find(locale => locale.code.split('-')[0] === language)?.code || null;
};

export const matchSavedLocale = (value: unknown): Locale | null => {
	if (value === 'en') return 'en-us';
	if (value === 'ko') return 'ko-kr';
	return LOCALES.find(locale => locale.code === value)?.code || null;
};
