
	/* ----------------------------------------------------------
	 * 1. Utilities and i18n
	 * ---------------------------------------------------------- */
	type LooseObject = { [key: string]: any };
	type BlockItemType = 'handle' | 'id' | 'regex';
	type BlockItem = { type: BlockItemType; value: string; flags?: string };
	type PairStatus = 'verified' | 'stale' | 'mismatch' | 'unverified';
	type PairRecord = {
		handle: string;
		uid: string;
		verifiedAt: number | null;
		status: PairStatus;
		source: string;
		lastResolvedUid: string | null;
		lastError: string | null;
	};
	type PairOutcome = 'created' | 'updated' | 'mismatch' | 'failed' | 'skipped';
	type PairRunItem = {
		handle: string;
		outcome: PairOutcome;
		uid?: string;
		resolvedUid?: string;
		message?: string;
	};
	type PairRunStats = {
		created: number;
		refreshed: number;
		mismatches: number;
		failed: number;
		addedIds: number;
		skipped: number;
		items: PairRunItem[];
	};
	type PairSummary = {
		handles: number;
		paired: number;
		handleOnly: number;
		stale: number;
		mismatch: number;
		unverified: number;
		pairNeeded: number;
	};
	type ApiTestCategory = 'ok' | 'invalid' | 'quota' | 'forbidden' | 'network' | 'unknown';
	type ApiTestResult = {
		checkedAt: number;
		ok: boolean;
		category: ApiTestCategory;
		httpStatus: number | null;
		message: string;
	};
	type RegexSpec = { pattern: string; flags: string };
	type DialogButton = { label: string; value: any; primary?: boolean };
	type DialogRefreshContext = {
		dialog: HTMLElement;
		header: HTMLElement;
		content: HTMLElement;
		footer: HTMLElement;
		buttons: HTMLButtonElement[];
		setTitle: (nextTitle: string) => void;
		setBody: (nextBody: Node | string) => void;
	};
	type I18nMessage = string | ((...args: any[]) => string);
	type I18nBundle = { [key: string]: I18nMessage };
	type ManagerSearchRecord = {
		index: number;
		item: BlockItem;
		label: string;
		labelNorm: string;
	};
	type ManagerSearchIndex = {
		records: ManagerSearchRecord[];
		firstCharBuckets: Map<string, number[]>;
		bigramIndex: Map<string, number[]>;
	};
	type AppLike = LooseObject;
	type StorageLike = LooseObject;
	type PairStoreLike = LooseObject;
	type ApiConfigLike = LooseObject;
	type SettingsLike = LooseObject;
	type CommentBlockMode = 'hide' | 'placeholder' | 'placeholder-reveal';

	const isNonNull = <T>(value: T | null | undefined): value is T => value != null;
	const sanitizeHandle = (h: any): string | null => {
		if (!h) return null;
		h = String(h).trim();
		if (!h.startsWith('@')) return null;
		return h;
	};
	const norm = (h: any): string | null => {
		const handle = sanitizeHandle(h);
		return handle ? handle.toLowerCase() : null;
	};
	const getHandleCompareKey = (h: any, caseSensitive = false): string | null => {
		const handle = sanitizeHandle(h);
		if (!handle) return null;
		return caseSensitive ? handle : handle.toLowerCase();
	};
	const getItemKey = (item: BlockItem | null | undefined): string | null => {
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
	const decodeMaybe = (value: string): string => {
		try { return decodeURIComponent(value); } catch { return value; }
	};
	const findHandleItem = (items: BlockItem[], handle: any, caseSensitive = false): BlockItem | null => {
		const key = getHandleCompareKey(handle, caseSensitive);
		if (!key) return null;
		return (items || []).find(item =>
			item?.type === 'handle' && getHandleCompareKey(item.value, caseSensitive) === key
		) || null;
	};
	const isChannelId = (value: any): boolean => /^UC[0-9A-Za-z_-]{10,}$/.test(String(value || '').trim());
	const SAFE_REGEX_MAX_PATTERN = 256;
	const SAFE_REGEX_MAX_TARGET = 128;
	const SAFE_REGEX_MAX_RUNTIME_MS = 5;
	const SAFE_REGEX_FLAGS = /^[gimsuy]*$/;
	const REGEX_MATCH_INITIAL_LIMIT = 20;
	const REGEX_MATCH_PAGE_SIZE = 50;
	const UNSAFE_REGEX_PATTERNS = [
		/\((?:\\.|[^()\\])*(?:[+*?]|\{\d*,?\d*\})(?:\\.|[^()\\])*\)(?:[+*?]|\{)/,
		/\((?:\\.|[^()\\])+\|(?:\\.|[^()\\])+\)(?:[+*?]|\{)/,
		/(?:\.\*){2,}/,
		/(?:\[[^\]]+\][+*]){2,}/
	];
	const validateRegexSpec = (pattern: any, flags = ''): RegexSpec | null => {
		const value = String(pattern || '');
		const flagText = String(flags || '');
		if (!value || value.length > SAFE_REGEX_MAX_PATTERN) return null;
		if (flagText.length > 6 || !SAFE_REGEX_FLAGS.test(flagText) || new Set(flagText).size !== flagText.length) return null;
		if (UNSAFE_REGEX_PATTERNS.some(rx => rx.test(value))) return null;
		try {
			new RegExp(value, flagText);
			return { pattern: value, flags: flagText };
		} catch {
			return null;
		}
	};
	const parseRegexLiteral = (text: any): RegexSpec | null => {
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
	const exportRegexLiteral = (item: BlockItem): string => `/${String(item.value || '').replace(/\//g, '\\/')}/${item.flags || ''}`;
	const safeRegexTest = (rx: RegExp | null | undefined, value: any): boolean => {
		if (!rx || !value) return false;
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
	const COMMENT_SELECTOR = 'ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model';
	const HIDEABLE_COMMENT_SELECTOR = 'ytd-comment-renderer, ytd-comment-view-model';
	const COMMENTS_HOST_SELECTOR = 'ytd-comments#comments, ytd-comments';
	const WATCH_ROOT_SELECTOR = 'ytd-watch-flexy, ytd-watch-grid, ytd-page-manager';
	const SHORTS_ROOT_SELECTOR = 'ytd-reel-video-renderer, ytd-shorts, ytd-app, ytd-page-manager';
	const PAIR_STALE_MS = 7 * 24 * 60 * 60 * 1000;
	const PAIR_NOTICE_COOLDOWN_MS = PAIR_STALE_MS;
	const FALLBACK_SCRIPT_VERSION = '0.9.0';
	const getScriptVersion = () => {
		try {
			if (typeof GM_info === 'object' && GM_info?.script?.version) return GM_info.script.version;
		} catch { }
		return FALLBACK_SCRIPT_VERSION;
	};

	const I18N: { ko: I18nBundle; en: I18nBundle } = {
		ko: I18N_KO,
		en: I18N_EN
	};
	const getLang = () => {
		try { return (GM_getValue('lang') || navigator.language || 'ko').startsWith('ko') ? 'ko' : 'en'; } catch { return 'ko'; }
	};
	const t = (key: string, ...args: any[]): string => {
		const lang = getLang();
		const val = I18N[lang][key];
		return typeof val === 'function' ? val(...args) : val;
	};
	const formatDateTime = (ts: any): string | null => {
		if (!Number.isFinite(ts) || ts <= 0) return null;
		try {
			return new Date(ts).toLocaleString(getLang() === 'ko' ? 'ko-KR' : 'en-US');
		} catch {
			return new Date(ts).toISOString();
		}
	};
	const makePlainTextNode = (value: any): HTMLElement => {
		const div = document.createElement('div');
		div.textContent = String(value ?? '');
		return div;
	};
	const binaryHas = (arr: string[] | number[], value: any): boolean => {
		let lo = 0, hi = arr.length - 1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			if (arr[mid] === value) return true;
			if (arr[mid] < value) lo = mid + 1;
			else hi = mid - 1;
		}
		return false;
	};
	const intersectSortedPostings = (lists: number[][]): number[] => {
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
	const getSearchBigrams = (query: any): string[] => {
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
	const buildManagerSearchIndex = (items: BlockItem[]): ManagerSearchIndex => {
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
	const searchManagerIndex = (index: ManagerSearchIndex, query: any): BlockItem[] => {
		const normalized = String(query || '').trim().toLowerCase();
		if (!normalized) return index.records.map(record => record.item);
		let candidateIndexes: number[] = [];
		if (normalized.length === 1) {
			candidateIndexes = (index.firstCharBuckets.get(normalized) || []).slice();
		} else {
			const grams = getSearchBigrams(normalized);
			const postings = grams.map(gram => index.bigramIndex.get(gram) || []);
			candidateIndexes = intersectSortedPostings(postings);
		}
		if (!candidateIndexes.length) return [];
		return candidateIndexes
			.map(idx => index.records[idx])
			.filter(record => record.labelNorm.includes(normalized))
			.map(record => record.item);
	};
	const getApiTestCategoryLabel = (category: ApiTestCategory | string): string => {
		switch (category) {
			case 'ok': return t('apiKeyTestOk');
			case 'invalid': return t('apiKeyTestInvalid');
			case 'quota': return t('apiKeyTestQuota');
			case 'forbidden': return t('apiKeyTestForbidden');
			case 'network': return t('apiKeyTestNetwork');
			default: return t('apiKeyTestUnknown');
		}
	};

