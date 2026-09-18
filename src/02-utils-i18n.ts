import { I18N_EN } from './i18n/en.ts';
import { I18N_KO } from './i18n/ko.ts';

	/* ----------------------------------------------------------
	 * 1. Utilities and i18n
	 * ---------------------------------------------------------- */
	export type LooseObject = { [key: string]: any };
	export type BlockItemType = 'handle' | 'id' | 'regex';
	export type BlockItem = { type: BlockItemType; value: string; flags?: string };
	export type PairStatus = 'verified' | 'stale' | 'mismatch' | 'unverified';
	export type PairRecord = {
		handle: string;
		uid: string;
		verifiedAt: number | null;
		status: PairStatus;
		source: string;
		lastResolvedUid: string | null;
		lastError: string | null;
	};
	export type PairOutcome = 'created' | 'updated' | 'mismatch' | 'failed' | 'skipped';
	export type PairRunItem = {
		handle: string;
		outcome: PairOutcome;
		uid?: string;
		resolvedUid?: string;
		message?: string;
	};
	export type PairRunStats = {
		created: number;
		refreshed: number;
		mismatches: number;
		failed: number;
		addedIds: number;
		skipped: number;
		items: PairRunItem[];
	};
	export type PairSummary = {
		handles: number;
		paired: number;
		handleOnly: number;
		stale: number;
		mismatch: number;
		unverified: number;
		pairNeeded: number;
	};
	export type ApiTestCategory = 'ok' | 'invalid' | 'quota' | 'forbidden' | 'network' | 'unknown';
	export type ApiTestResult = {
		checkedAt: number;
		ok: boolean;
		category: ApiTestCategory;
		httpStatus: number | null;
		message: string;
	};
	export type RegexSpec = { pattern: string; flags: string };
	export type DialogButton = { label: string; value: any; primary?: boolean; danger?: boolean };
	export type DialogRefreshContext = {
		reason?: 'all' | 'storage';
		dialog: HTMLElement;
		header: HTMLElement;
		content: HTMLElement;
		footer: HTMLElement;
		buttons: HTMLButtonElement[];
		setTitle: (nextTitle: string) => void;
		setBody: (nextBody: Node | string) => void;
	};
	export type I18nMessage = string | ((...args: any[]) => string);
	export type I18nBundle = { [key: string]: I18nMessage };
	export type ManagerSearchRecord = {
		index: number;
		item: BlockItem;
		label: string;
		labelNorm: string;
	};
	export type ManagerSearchIndex = {
		records: ManagerSearchRecord[];
		firstCharBuckets: Map<string, number[]>;
		bigramIndex: Map<string, number[]>;
	};
	export type AppLike = LooseObject;
	export type StorageLike = LooseObject;
	export type PairStoreLike = LooseObject;
	export type ApiConfigLike = LooseObject;
	export type SettingsLike = LooseObject;
	export type CommentBlockMode = 'hide' | 'placeholder' | 'placeholder-reveal';

	export const isNonNull = <T>(value: T | null | undefined): value is T => value != null;
	export const sanitizeHandle = (h: any): string | null => {
		if (!h) return null;
		h = String(h).trim();
		if (!h.startsWith('@')) return null;
		return h;
	};
	export const norm = (h: any): string | null => {
		const handle = sanitizeHandle(h);
		return handle ? handle.toLowerCase() : null;
	};
	export const getHandleCompareKey = (h: any, caseSensitive = false): string | null => {
		const handle = sanitizeHandle(h);
		if (!handle) return null;
		return caseSensitive ? handle : handle.toLowerCase();
	};
	export const getItemKey = (item: BlockItem | null | undefined): string | null => {
		if (!item || !item.type) return null;
		if (item.type === 'handle') {
			const handle = sanitizeHandle(item.value);
			return handle ? `h:${handle}` : null;
		}
		if (item.type === 'id') {
			const id = String(item.value || '').trim();
			return isChannelId(id) ? `i:${id}` : null;
		}
		return item.type === 'regex' ? `r:${String(item.value)}/${item.flags || ''}` : null;
	};
	export const decodeMaybe = (value: string): string => {
		try { return decodeURIComponent(value); } catch { return value; }
	};
	export const findHandleItem = (items: BlockItem[], handle: any, caseSensitive = false): BlockItem | null => {
		const key = getHandleCompareKey(handle, caseSensitive);
		if (!key) return null;
		return (items || []).find(item =>
			item?.type === 'handle' && getHandleCompareKey(item.value, caseSensitive) === key
		) || null;
	};
	export const isChannelId = (value: any): boolean => /^UC[0-9A-Za-z_-]{10,}$/.test(String(value || '').trim());
	export const SAFE_REGEX_MAX_PATTERN = 256;
	export const SAFE_REGEX_MAX_TARGET = 128;
	export const SAFE_REGEX_MAX_RUNTIME_MS = 5;
	export const SAFE_REGEX_FLAGS = /^[gimsuy]*$/;
	export const REGEX_MATCH_INITIAL_LIMIT = 20;
	export const REGEX_MATCH_PAGE_SIZE = 50;
	// Bound possible backtracking paths before native execution. A post-test timer
	// cannot interrupt RegExp.test(), even when the target is only 128 characters.
	const SAFE_REGEX_MAX_PATHS = 4096;
	const SAFE_REGEX_MAX_EXPANDED_SIZE = 1024;
	type RegexCost = { paths: number; size: number; minWidth: number };
	const checkRegexComplexity = (pattern: string, flags: string): void => {
		let index = 0;
		const reject = (): never => { throw new Error('Unsupported or excessive regex complexity'); };
		const bounded = (cost: RegexCost): RegexCost => {
			if (cost.paths > SAFE_REGEX_MAX_PATHS || cost.size > SAFE_REGEX_MAX_EXPANDED_SIZE) reject();
			return cost;
		};
		const expression = (): RegexCost => {
			let paths = 0, size = 0, minWidth = Infinity;
			let sequence: RegexCost = { paths: 1, size: 0, minWidth: 0 };
			while (index < pattern.length && pattern[index] !== ')') {
				if (pattern[index] === '|') {
					paths += sequence.paths;
					size += sequence.size;
					minWidth = Math.min(minWidth, sequence.minWidth);
					sequence = { paths: 1, size: 0, minWidth: 0 };
					index += 1;
					continue;
				}
				const ch = pattern[index++];
				let atom: RegexCost = { paths: 1, size: 1, minWidth: 1 };
				if (ch === '(') {
					if (pattern[index] === '?') {
						// Lookarounds and named captures/backreferences are outside this subset.
						if (pattern.slice(index, index + 2) !== '?:') reject();
						index += 2;
					}
					atom = expression();
					if (pattern[index++] !== ')') reject();
				} else if (ch === '[') {
					while (index < pattern.length && pattern[index] !== ']') {
						if (pattern[index++] === '\\') index += 1;
					}
					if (pattern[index++] !== ']') reject();
				} else if (ch === '\\') {
					const escape = /^(?:[dDsSwWbBfnrtv]|0(?!\d)|c[A-Za-z]|x[\da-fA-F]{2}|u[\da-fA-F]{4}|[^A-Za-z0-9])/.exec(pattern.slice(index));
					const unicode = flags.includes('u')
						? /^(?:u\{[\da-fA-F]+\}|[pP]\{[A-Za-z_=]+\})/.exec(pattern.slice(index)) : null;
					const token = unicode?.[0] || escape?.[0] || reject();
					index += token.length;
					if (token === 'b' || token === 'B') atom.minWidth = 0;
				} else if (ch === '^' || ch === '$') atom.minWidth = 0;
				else if ('*+?{}'.includes(ch)) reject();

				const quantifier = /^(?:[?*+]|\{(\d+)(?:(,)(\d*))?\})/.exec(pattern.slice(index));
				if (quantifier) {
					index += quantifier[0].length;
					if (pattern[index] === '?') index += 1;
					const text = quantifier[0];
					const min = text === '+' ? 1 : text.startsWith('{') ? Number(quantifier[1]) : 0;
					const max = text === '?' ? 1 : text.startsWith('{')
						? (quantifier[2] ? (quantifier[3] ? Number(quantifier[3]) : SAFE_REGEX_MAX_TARGET) : min)
						: SAFE_REGEX_MAX_TARGET;
					if (min > max || max > SAFE_REGEX_MAX_TARGET || (max > 1 && atom.minWidth === 0)) reject();
					// Repeating alternatives or variable repetitions multiplies backtracking
					// work across every handle, even for a fixed count within the path budget.
					if (max > 1 && atom.paths > 1) reject();
					let repeatedPaths = 0, power = 1;
					for (let count = 0; count <= max; count++) {
						if (count >= min) repeatedPaths += power;
						if (repeatedPaths > SAFE_REGEX_MAX_PATHS || power > SAFE_REGEX_MAX_PATHS) reject();
						power *= atom.paths;
					}
					atom = bounded({ paths: repeatedPaths, size: 1 + atom.size * max, minWidth: atom.minWidth * min });
				}
				sequence = bounded({ paths: sequence.paths * atom.paths, size: sequence.size + atom.size, minWidth: sequence.minWidth + atom.minWidth });
			}
			return bounded({ paths: paths + sequence.paths, size: size + sequence.size, minWidth: Math.min(minWidth, sequence.minWidth) });
		};
		expression();
		if (index !== pattern.length) reject();
	};
	export const validateRegexSpec = (pattern: any, flags = ''): RegexSpec | null => {
		const value = String(pattern || '');
		const flagText = String(flags || '');
		if (!value || value.length > SAFE_REGEX_MAX_PATTERN) return null;
		if (flagText.length > 6 || !SAFE_REGEX_FLAGS.test(flagText) || new Set(flagText).size !== flagText.length) return null;
		try {
			checkRegexComplexity(value, flagText);
			new RegExp(value, flagText);
			return { pattern: value, flags: flagText };
		} catch {
			return null;
		}
	};
	export const parseRegexLiteral = (text: any): RegexSpec | null => {
		const s = String(text || '').trim();
		if (!s.startsWith('/')) return null;
		let escaped = false;
		for (let i = s.length - 1; i > 0; i--) {
			const ch = s[i];
			if (ch === '/' && !escaped) return { pattern: s.slice(1, i).replace(/\\\//g, '/'), flags: s.slice(i + 1) };
			escaped = ch === '\\' && !escaped;
			if (ch !== '\\') escaped = false;
		}
		return null;
	};
	export const exportRegexLiteral = (item: BlockItem): string => `/${String(item.value || '').replace(/\//g, '\\/')}/${item.flags || ''}`;
	// RegExp.source escapes literal slashes and line terminators. Undo those
	// spellings before applying the input-length limit, consuming other escapes
	// as pairs so a literal backslash followed by n, r, or u2028 stays literal.
	const regexSourceToPattern = (source: string): string => source.replace(/\\(u202[89]|[\s\S])/g, (escape, token: string) => {
		if (token === '/') return '/';
		if (token === 'n') return '\n';
		if (token === 'r') return '\r';
		if (token === 'u2028') return '\u2028';
		if (token === 'u2029') return '\u2029';
		return escape;
	});
	const regexSafetyCache = new WeakMap<RegExp, boolean>();
	export const safeRegexTest = (rx: RegExp | null | undefined, value: any): boolean => {
		if (!rx || !value) return false;
		if (!regexSafetyCache.has(rx)) regexSafetyCache.set(rx, !!validateRegexSpec(regexSourceToPattern(rx.source), rx.flags));
		if (!regexSafetyCache.get(rx)) return false;
		const target = String(value).slice(0, SAFE_REGEX_MAX_TARGET);
		const startedAt = performance.now();
		try {
			rx.lastIndex = 0;
			const matched = rx.test(target);
			return (performance.now() - startedAt) <= SAFE_REGEX_MAX_RUNTIME_MS && matched;
		} catch {
			return false;
		}
	};
	export const COMMENT_SELECTOR = 'ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model';
	export const HIDEABLE_COMMENT_SELECTOR = 'ytd-comment-renderer, ytd-comment-view-model';
	export const COMMENTS_HOST_SELECTOR = 'ytd-comments#comments, ytd-comments';
	export const WATCH_ROOT_SELECTOR = 'ytd-watch-flexy, ytd-watch-grid';
	export const SHORTS_ROOT_SELECTOR = 'ytd-reel-video-renderer, ytd-shorts';
	export const PAIR_STALE_MS = 7 * 24 * 60 * 60 * 1000;
	export const PAIR_NOTICE_COOLDOWN_MS = PAIR_STALE_MS;
	export const FALLBACK_SCRIPT_VERSION = '{{version}}';
	export const getScriptVersion = () => {
		try {
			if (typeof GM_info === 'object' && GM_info?.script?.version) return GM_info.script.version;
		} catch { }
		return FALLBACK_SCRIPT_VERSION;
	};

	export const I18N: { ko: I18nBundle; en: I18nBundle } = {
		ko: I18N_KO,
		en: I18N_EN
	};
	export const getLang = () => {
		try { return (GM_getValue('lang') || navigator.language || 'ko').startsWith('ko') ? 'ko' : 'en'; } catch { return 'ko'; }
	};
	export const t = (key: string, ...args: any[]): string => {
		const lang = getLang();
		const val = I18N[lang][key];
		return typeof val === 'function' ? val(...args) : val;
	};
	export const formatDateTime = (ts: any): string | null => {
		if (!Number.isFinite(ts) || ts <= 0) return null;
		try {
			return new Date(ts).toLocaleString(getLang() === 'ko' ? 'ko-KR' : 'en-US');
		} catch {
			return new Date(ts).toISOString();
		}
	};
	export const makePlainTextNode = (value: any): HTMLElement => {
		const div = document.createElement('div');
		div.textContent = String(value ?? '');
		return div;
	};
	export const binaryHas = (arr: string[] | number[], value: any): boolean => {
		let lo = 0, hi = arr.length - 1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			if (arr[mid] === value) return true;
			if (arr[mid] < value) lo = mid + 1;
			else hi = mid - 1;
		}
		return false;
	};
	export const intersectSortedPostings = (lists: number[][]): number[] => {
		if (!lists.length) return [];
		const sortedLists = lists.filter(Boolean).sort((a, b) => a.length - b.length);
		if (!sortedLists.length) return [];
		let result = sortedLists[0].slice();
		for (let i = 1; i < sortedLists.length; i++) {
			const next = sortedLists[i];
			result = result.filter(value => binaryHas(next, value));
			if (!result.length) break;
		}
		return result;
	};
	export const getSearchBigrams = (query: any): string[] => {
		const normalized = String(query || '').trim().toLowerCase();
		if (!normalized) return [];
		if (normalized.length < 2) return [normalized];
		const grams: string[] = [];
		const seen = new Set<string>();
		for (let i = 0; i < normalized.length - 1; i++) {
			const gram = normalized.slice(i, i + 2);
			if (seen.has(gram)) continue;
			seen.add(gram);
			grams.push(gram);
		}
		return grams;
	};
	export const buildManagerSearchIndex = (items: BlockItem[]): ManagerSearchIndex => {
		const records = (items || []).map((item, index) => {
			const label = item?.type === 'regex' ? `/${item.value}/${item.flags || ''}` : String(item?.value || '');
			return {
				index,
				item,
				label,
				labelNorm: label.toLowerCase()
			};
		});
		const firstCharBuckets = new Map<string, number[]>();
		const bigramIndex = new Map<string, number[]>();
		for (const record of records) {
			for (const ch of new Set<string>(record.labelNorm.split(''))) {
				if (!ch.trim()) continue;
				if (!firstCharBuckets.has(ch)) firstCharBuckets.set(ch, []);
				const bucket = firstCharBuckets.get(ch);
				if (bucket) bucket.push(record.index);
			}
			for (const gram of getSearchBigrams(record.labelNorm)) {
				if (!bigramIndex.has(gram)) bigramIndex.set(gram, []);
				const bucket = bigramIndex.get(gram);
				if (bucket) bucket.push(record.index);
			}
		}
		return { records, firstCharBuckets, bigramIndex };
	};
	export const searchManagerIndex = (index: ManagerSearchIndex, query: any): BlockItem[] => {
		const normalized = String(query || '').trim().toLowerCase();
		if (!normalized) return index.records.map(record => record.item);
		const candidateIndexes = normalized.length === 1
			? (index.firstCharBuckets.get(normalized) || []).slice()
			: (() => {
			const grams = getSearchBigrams(normalized);
			const postings = grams.map(gram => index.bigramIndex.get(gram) || []);
			return intersectSortedPostings(postings);
		})();
		if (!candidateIndexes.length) return [];
		return candidateIndexes
			.map(idx => index.records[idx])
			.filter(record => record.labelNorm.includes(normalized))
			.map(record => record.item);
	};
	export const getApiTestCategoryLabel = (category: ApiTestCategory | string): string => {
		switch (category) {
			case 'ok': return t('apiKeyTestOk');
			case 'invalid': return t('apiKeyTestInvalid');
			case 'quota': return t('apiKeyTestQuota');
			case 'forbidden': return t('apiKeyTestForbidden');
			case 'network': return t('apiKeyTestNetwork');
			default: return t('apiKeyTestUnknown');
		}
	};
