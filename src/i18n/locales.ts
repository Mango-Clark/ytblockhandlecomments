export const LOCALES = [
	{ code: 'en-us', name: 'English (US)', readme: 'README.md', contributors: [] },
	{ code: 'ko-kr', name: '한국어', readme: 'README.ko.md', contributors: ['Mango-Clark'] },
	{ code: 'ja-jp', name: '日本語', readme: 'README.ja-jp.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'de-de', name: 'Deutsch', readme: 'README.de-de.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'zh-cn', name: '简体中文', readme: 'README.zh-cn.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'zh-tw', name: '繁體中文', readme: 'README.zh-tw.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'fr-fr', name: 'Français', readme: 'README.fr-fr.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'pt-br', name: 'Português (Brasil)', readme: 'README.pt-br.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'ru-ru', name: 'Русский', readme: 'README.ru-ru.md', contributors: ['GPT-6.1 Sol'] },
	{ code: 'id-id', name: 'Bahasa Indonesia', readme: 'README.id-id.md', contributors: ['GPT-6.1 Sol'] }
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
