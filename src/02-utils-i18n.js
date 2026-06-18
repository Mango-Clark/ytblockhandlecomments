	/* ----------------------------------------------------------
	 * 1. Utilities and i18n
	 * ---------------------------------------------------------- */
	const sanitizeHandle = (h) => {
		if (!h) return null;
		h = String(h).trim();
		if (!h.startsWith('@')) return null;
		return h;
	};
	const norm = (h) => {
		const handle = sanitizeHandle(h);
		return handle ? handle.toLowerCase() : null;
	};
	const getHandleCompareKey = (h, caseSensitive = false) => {
		const handle = sanitizeHandle(h);
		if (!handle) return null;
		return caseSensitive ? handle : handle.toLowerCase();
	};
	const getItemKey = (item) => {
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
	const decodeMaybe = (value) => {
		try { return decodeURIComponent(value); } catch { return value; }
	};
	const findHandleItem = (items, handle, caseSensitive = false) => {
		const key = getHandleCompareKey(handle, caseSensitive);
		if (!key) return null;
		return (items || []).find(item =>
			item?.type === 'handle' && getHandleCompareKey(item.value, caseSensitive) === key
		) || null;
	};
	const isChannelId = (value) => /^UC[0-9A-Za-z_-]{10,}$/.test(String(value || '').trim());
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
	const validateRegexSpec = (pattern, flags = '') => {
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
	const parseRegexLiteral = (text) => {
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
	const exportRegexLiteral = (item) => `/${String(item.value || '').replace(/\//g, '\\/')}/${item.flags || ''}`;
	const safeRegexTest = (rx, value) => {
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
	const COMMENTS_HOST_SELECTOR = 'ytd-comments#comments, ytd-comments';
	const WATCH_ROOT_SELECTOR = 'ytd-watch-flexy, ytd-watch-grid, ytd-page-manager';
	const SHORTS_ROOT_SELECTOR = 'ytd-reel-video-renderer, ytd-shorts, ytd-app, ytd-page-manager';
	const PAIR_STALE_MS = 7 * 24 * 60 * 60 * 1000;
	const PAIR_NOTICE_COOLDOWN_MS = PAIR_STALE_MS;
	const FALLBACK_SCRIPT_VERSION = '0.6.0';
	const getScriptVersion = () => {
		try {
			if (typeof GM_info === 'object' && GM_info?.script?.version) return GM_info.script.version;
		} catch { }
		return FALLBACK_SCRIPT_VERSION;
	};

	const I18N = {
		ko: {
			block: '차단',
			unblock: '차단 해제',
			confirmBlock: '🛑 차단할까요?',
			confirmUnblock: '❌ 차단을 해제할까요?',
			manageTitle: (n) => `차단된 채널 (${n})`,
			import: '가져오기',
			export: '내보내기',
			close: '닫기',
			removed: (h) => `${h} 해제`,
			added: (h) => `${h} 차단`,
			clear: '초기화',
			confirmClear: '모든 차단 핸들을 초기화할까요?',
			menuManage: '🔍 차단 목록 관리',
			menuClear: '🗑️ 차단 목록 초기화',
			versionTitle: '스크립트 정보',
			versionValue: (version) => `버전: ${version}`,
			syncToast: '차단 목록이 다른 탭과 동기화되었습니다.',
			pairSyncToast: 'UID pair 설정이 다른 탭과 동기화되었습니다.',
			exportHint: 'JSON 또는 라인별 텍스트로 복사하세요.',
			json: 'JSON',
			text: '텍스트',
			importTitle: '차단 목록 가져오기',
			importPlaceholder: 'JSON 또는 @handle/정규식 라인별/쉼표 구분',
			importBtn: '가져오기',
			importedCount: (n) => `${n}개 항목 가져옴`,
			menuHide: '이 채널의 댓글 숨김',
			menuUnhide: '이 채널 댓글 숨김 해제',
			addRegex: '정규식 추가',
			patternLabel: '패턴',
			flagsLabel: '플래그',
			addBtn: '추가',
			invalidRegex: '유효하지 않은 정규식',
			addedRegex: '정규식을 추가했습니다',
			exists: '이미 존재합니다',
			testRegex: '정규식 만들기/테스트',
			uidDetectionLabel: 'UID 기반 감지',
			uidDetectionHelp: '핸들 차단은 항상 유지하고, UID 일치 검사만 추가로 켭니다.',
			apiKeyTitle: 'YouTube Data API v3',
			apiKeyLabel: 'API 키',
			apiKeyHelp: 'channels.list(forHandle) 호출에 사용합니다. 로컬에만 저장되며 import/export에 포함되지 않습니다.',
			apiKeyPlaceholder: 'API key를 입력하세요',
			apiKeySave: 'API 키 저장',
			apiKeyTest: 'API 키 테스트',
			apiKeyClear: 'API 키 삭제',
			apiKeySaved: 'API 키를 저장했습니다',
			apiKeyCleared: 'API 키를 삭제했습니다',
			apiKeyStatusMissing: 'API 키가 없습니다. Pair 생성/갱신 전에 저장해야 합니다.',
			apiKeyStatusSaved: (masked) => `저장된 키: ${masked}`,
			apiKeyRequired: 'Pair 생성/갱신에는 YouTube Data API v3 API 키가 필요합니다.',
			apiKeyTestIdle: '아직 API 키 테스트 기록이 없습니다.',
			apiKeyTestRunning: 'API 키를 테스트하는 중입니다...',
			apiKeyTestLabel: '마지막 테스트',
			apiKeyTestResult: (category, message, statusText) => `${category}${statusText ? ` (${statusText})` : ''}: ${message}`,
			apiKeyTestOk: '정상',
			apiKeyTestInvalid: '잘못된 키',
			apiKeyTestQuota: 'quota 초과',
			apiKeyTestForbidden: '권한 거부',
			apiKeyTestNetwork: '네트워크 실패',
			apiKeyTestUnknown: '알 수 없음',
			apiQuotaGuidanceTitle: 'Quota 안내',
			apiQuotaGuidance: ({ count, reset }) =>
				`반복 quota 실패 ${count}회. Google Cloud Console에서 YouTube Data API 할당량을 확인하고, 필요하면 quota reset 이후(${reset}) 다시 테스트하세요.`,
			pairCreate: 'Pair 생성',
			pairUpdate: 'Update Pair',
			pairWorking: '처리 중...',
			pairSummary: 'Pair 상태',
			pairLastCheck: (s) => s ? `마지막 검사: ${s}` : '아직 검사 기록 없음',
			pairSummaryHandles: '핸들',
			pairSummaryPaired: 'paired',
			pairSummaryNeeded: 'pair 필요',
			pairSummaryStale: 'stale',
			pairSummaryMismatch: 'mismatch',
			pairSummaryUnverified: 'unverified',
			badgeHandleOnly: 'handle-only',
			badgePaired: 'paired',
			badgeStale: 'stale',
			badgeMismatch: 'mismatch',
			badgeUnverified: 'unverified',
			badgeUid: 'uid-rule',
			badgeRegex: 'regex',
			metaUid: (uid) => `UID: ${uid}`,
			metaVerifiedAt: (s) => `마지막 검증: ${s}`,
			metaResolvedUid: (uid) => `최신 조회 UID: ${uid}`,
			metaSource: (source) => `source: ${source}`,
			metaError: (msg) => `오류: ${msg}`,
			pairBannerTitle: 'UID pair 확인이 필요합니다.',
			pairBannerBody: (stale, mismatch) =>
				`stale ${stale}건, mismatch ${mismatch}건이 있어 Update Pair가 필요합니다.`,
			updateNow: '지금 업데이트',
			later: '나중에',
			pairResult: ({ created, refreshed, mismatches, failed, addedIds, skipped }) =>
				`생성 ${created} / 갱신 ${refreshed} / mismatch ${mismatches} / 실패 ${failed} / UID 추가 ${addedIds} / skip ${skipped || 0}`,
			pairSkippedFresh: '아직 갱신 주기 내에 있어 API 조회를 건너뜀',
			pairUidReplaced: 'mismatch 감지 후 UID 규칙을 교체했습니다',
			pairResultDetails: '최근 Pair 실행 결과',
			pairResultEmpty: '아직 Pair 실행 기록이 없습니다.',
			pairResultDialogTitle: 'Pair 실행 상세',
			pairOutcomeCreated: '생성',
			pairOutcomeUpdated: '갱신',
			pairOutcomeMismatch: 'mismatch',
			pairOutcomeFailed: '실패',
			pairOutcomeSkipped: 'skip',
			pairResultFilterLabel: '결과 필터',
			pairResultFilterAll: '전체',
			pairResultSortLabel: '정렬',
			pairResultSortOriginal: '실행 순서',
			pairResultSortOutcome: '결과별',
			pairResultSortHandle: 'handle',
			pairResultCopyFailed: '실패 handle 복사',
			pairResultExportFailed: '실패 handle 내보내기',
			pairResultFailedTitle: '실패 handle',
			pairResultFailedEmpty: '실패한 handle이 없습니다.',
			pairResultFailedCopied: (n) => `${n}개 실패 handle을 복사했습니다`,
			pairResultSummary: ({ selected, visible, total }) => `선택 ${selected} / 표시 ${visible} / 전체 ${total}`,
			pairLookupFailed: 'UID 조회 실패',
			pairLookupNoUid: 'UID를 찾지 못했습니다.',
			handleCaseLabel: 'Handle 대소문자 구분',
			handleCaseHelp: '꺼져 있으면 소문자 기준으로 비교하고, 켜져 있으면 정확한 대소문자로 비교합니다.',
			handleCaseLegacy: '기존 handle은 소문자로 저장됐을 수 있어 exact 보장은 새로 추가하거나 다시 저장한 항목부터 적용됩니다.',
			typeFilterLabel: '타입',
			typeAll: 'all',
			typeHandle: 'handle',
			typeId: 'id',
			typeRegex: 'regex',
			searchLabel: '검색',
			searchPlaceholder: 'handle, id, regex 검색',
			searchNoMatches: '검색 결과가 없습니다.',
			tagFilterLabel: '태그',
			selectVisible: '현재 목록 전체 선택',
			selectedCount: (n) => `선택 ${n}개`,
			bulkActionLabel: '일괄 작업',
			bulkDelete: '선택 삭제',
			bulkCreatePairs: '선택 handle Pair 생성',
			bulkUpdatePairs: '선택 handle Pair 갱신',
			execute: '실행',
			clearSelection: '선택 해제',
			bulkDeleteResult: (n) => `${n}개 항목을 삭제했습니다`,
			bulkHandleRequired: '선택된 handle이 없습니다.',
			regexMatchedCount: (n) => `매칭 handle ${n}개`,
			regexSelectMatches: '매칭 handle 선택',
			regexExpand: '펼치기',
			regexCollapse: '접기',
			regexShowAll: '전체 보기',
			regexShowMore: (shown, total) => `${shown}/${total}개 표시, 더 보기`,
			regexShowLess: '접기',
			regexNoMatches: '현재 매칭되는 handle이 없습니다.',
			regexSelectedMatches: (n) => `${n}개 handle을 선택했습니다`,
			noFilteredEntries: '현재 필터에 맞는 항목이 없습니다.',
			noEntries: '—'
		},
		en: {
			block: 'Block',
			unblock: 'Unblock',
			confirmBlock: '🛑 Block this channel?',
			confirmUnblock: '❌ Unblock this channel?',
			manageTitle: (n) => `Blocked channels (${n})`,
			import: 'Import',
			export: 'Export',
			close: 'Close',
			removed: (h) => `Unblocked ${h}`,
			added: (h) => `Blocked ${h}`,
			clear: 'Reset',
			confirmClear: 'Reset all blocked entries?',
			menuManage: '🔍 Manage block list',
			menuClear: '🗑️ Clear block list',
			versionTitle: 'Script Info',
			versionValue: (version) => `Version: ${version}`,
			syncToast: 'Block list synced from another tab.',
			pairSyncToast: 'UID pair settings synced from another tab.',
			exportHint: 'Copy as JSON or line text.',
			json: 'JSON',
			text: 'Text',
			importTitle: 'Import block list',
			importPlaceholder: 'JSON or @handle/regex per line/comma',
			importBtn: 'Import',
			importedCount: (n) => `Imported ${n} entries`,
			menuHide: 'Hide comments from this channel',
			menuUnhide: "Unhide this channel's comments",
			addRegex: 'Add Regex',
			patternLabel: 'Pattern',
			flagsLabel: 'Flags',
			addBtn: 'Add',
			invalidRegex: 'Invalid regex',
			addedRegex: 'Regex added',
			exists: 'Already exists',
			testRegex: 'Build/Test Regex',
			uidDetectionLabel: 'UID Detection',
			uidDetectionHelp: 'Handle blocking always stays on. This only adds UID matching.',
			apiKeyTitle: 'YouTube Data API v3',
			apiKeyLabel: 'API Key',
			apiKeyHelp: 'Used for channels.list(forHandle). Stored locally only and excluded from import/export.',
			apiKeyPlaceholder: 'Enter your API key',
			apiKeySave: 'Save API Key',
			apiKeyTest: 'Test API Key',
			apiKeyClear: 'Clear API Key',
			apiKeySaved: 'API key saved',
			apiKeyCleared: 'API key cleared',
			apiKeyStatusMissing: 'No API key saved. Save one before running pair actions.',
			apiKeyStatusSaved: (masked) => `Saved key: ${masked}`,
			apiKeyRequired: 'A YouTube Data API v3 API key is required for pair creation and updates.',
			apiKeyTestIdle: 'No API key test has run yet.',
			apiKeyTestRunning: 'Testing the API key...',
			apiKeyTestLabel: 'Last test',
			apiKeyTestResult: (category, message, statusText) => `${category}${statusText ? ` (${statusText})` : ''}: ${message}`,
			apiKeyTestOk: 'OK',
			apiKeyTestInvalid: 'Invalid key',
			apiKeyTestQuota: 'Quota exceeded',
			apiKeyTestForbidden: 'Forbidden',
			apiKeyTestNetwork: 'Network failure',
			apiKeyTestUnknown: 'Unknown',
			apiQuotaGuidanceTitle: 'Quota guidance',
			apiQuotaGuidance: ({ count, reset }) =>
				`Repeated quota failures: ${count}. Check YouTube Data API quota in Google Cloud Console, then test again after the quota reset window (${reset}).`,
			pairCreate: 'Create Pair',
			pairUpdate: 'Update Pair',
			pairWorking: 'Working...',
			pairSummary: 'Pair Status',
			pairLastCheck: (s) => s ? `Last check: ${s}` : 'No pair check has run yet.',
			pairSummaryHandles: 'Handles',
			pairSummaryPaired: 'Paired',
			pairSummaryNeeded: 'Pair needed',
			pairSummaryStale: 'Stale',
			pairSummaryMismatch: 'Mismatch',
			pairSummaryUnverified: 'Unverified',
			badgeHandleOnly: 'handle-only',
			badgePaired: 'paired',
			badgeStale: 'stale',
			badgeMismatch: 'mismatch',
			badgeUnverified: 'unverified',
			badgeUid: 'uid-rule',
			badgeRegex: 'regex',
			metaUid: (uid) => `UID: ${uid}`,
			metaVerifiedAt: (s) => `Last verified: ${s}`,
			metaResolvedUid: (uid) => `Latest UID: ${uid}`,
			metaSource: (source) => `Source: ${source}`,
			metaError: (msg) => `Error: ${msg}`,
			pairBannerTitle: 'UID pair review required.',
			pairBannerBody: (stale, mismatch) =>
				`${stale} stale pair(s) and ${mismatch} mismatch pair(s) need an update.`,
			updateNow: 'Update Now',
			later: 'Later',
			pairResult: ({ created, refreshed, mismatches, failed, addedIds, skipped }) =>
				`Created ${created} / Refreshed ${refreshed} / Mismatch ${mismatches} / Failed ${failed} / Added UID ${addedIds} / Skipped ${skipped || 0}`,
			pairSkippedFresh: 'Skipped API lookup because the pair is still within the refresh interval',
			pairUidReplaced: 'Replaced the UID rule after a mismatch',
			pairResultDetails: 'Last Pair Run',
			pairResultEmpty: 'No pair run has completed yet.',
			pairResultDialogTitle: 'Pair Run Details',
			pairOutcomeCreated: 'created',
			pairOutcomeUpdated: 'updated',
			pairOutcomeMismatch: 'mismatch',
			pairOutcomeFailed: 'failed',
			pairOutcomeSkipped: 'skipped',
			pairResultFilterLabel: 'Result filter',
			pairResultFilterAll: 'All',
			pairResultSortLabel: 'Sort',
			pairResultSortOriginal: 'Run order',
			pairResultSortOutcome: 'Outcome',
			pairResultSortHandle: 'Handle',
			pairResultCopyFailed: 'Copy failed handles',
			pairResultExportFailed: 'Export failed handles',
			pairResultFailedTitle: 'Failed handles',
			pairResultFailedEmpty: 'No failed handles.',
			pairResultFailedCopied: (n) => `Copied ${n} failed handle(s)`,
			pairResultSummary: ({ selected, visible, total }) => `Selected ${selected} / Visible ${visible} / Total ${total}`,
			pairLookupFailed: 'UID lookup failed',
			pairLookupNoUid: 'Could not find a UID.',
			handleCaseLabel: 'Handle Case Sensitive',
			handleCaseHelp: 'Off compares normalized lowercase handles. On compares exact handle casing.',
			handleCaseLegacy: 'Older handles may have been stored in lowercase, so exact matching is guaranteed only after re-saving or newly adding them.',
			typeFilterLabel: 'Type',
			typeAll: 'all',
			typeHandle: 'handle',
			typeId: 'id',
			typeRegex: 'regex',
			searchLabel: 'Search',
			searchPlaceholder: 'Search handle, id, regex',
			searchNoMatches: 'No search results.',
			tagFilterLabel: 'Tags',
			selectVisible: 'Select all visible',
			selectedCount: (n) => `Selected ${n}`,
			bulkActionLabel: 'Bulk Action',
			bulkDelete: 'Delete selected',
			bulkCreatePairs: 'Create pair for selected handles',
			bulkUpdatePairs: 'Update pair for selected handles',
			execute: 'Run',
			clearSelection: 'Clear selection',
			bulkDeleteResult: (n) => `Deleted ${n} item(s)`,
			bulkHandleRequired: 'No selected handle entries.',
			regexMatchedCount: (n) => `${n} matched handle(s)`,
			regexSelectMatches: 'Select matching handles',
			regexExpand: 'Expand',
			regexCollapse: 'Collapse',
			regexShowAll: 'Show all',
			regexShowMore: (shown, total) => `Show more (${shown}/${total})`,
			regexShowLess: 'Show less',
			regexNoMatches: 'No blocked handles currently match this regex.',
			regexSelectedMatches: (n) => `Selected ${n} matching handle(s)`,
			noFilteredEntries: 'No entries match the current filters.',
			noEntries: '—'
		}
	};
	const getLang = () => {
		try { return (GM_getValue('lang') || navigator.language || 'ko').startsWith('ko') ? 'ko' : 'en'; } catch { return 'ko'; }
	};
	const t = (key, ...args) => {
		const lang = getLang();
		const val = I18N[lang][key];
		return typeof val === 'function' ? val(...args) : val;
	};
	const formatDateTime = (ts) => {
		if (!Number.isFinite(ts) || ts <= 0) return null;
		try {
			return new Date(ts).toLocaleString(getLang() === 'ko' ? 'ko-KR' : 'en-US');
		} catch {
			return new Date(ts).toISOString();
		}
	};
	const makePlainTextNode = (value) => {
		const div = document.createElement('div');
		div.textContent = String(value ?? '');
		return div;
	};
	const binaryHas = (arr, value) => {
		let lo = 0, hi = arr.length - 1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			if (arr[mid] === value) return true;
			if (arr[mid] < value) lo = mid + 1;
			else hi = mid - 1;
		}
		return false;
	};
	const intersectSortedPostings = (lists) => {
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
	const getSearchBigrams = (query) => {
		const normalized = String(query || '').trim().toLowerCase();
		if (!normalized) return [];
		if (normalized.length < 2) return [normalized];
		const grams = [];
		const seen = new Set();
		for (let i = 0; i < normalized.length - 1; i++) {
			const gram = normalized.slice(i, i + 2);
			if (seen.has(gram)) continue;
			seen.add(gram);
			grams.push(gram);
		}
		return grams;
	};
	const buildManagerSearchIndex = (items) => {
		const records = (items || []).map((item, index) => {
			const label = item?.type === 'regex' ? `/${item.value}/${item.flags || ''}` : String(item?.value || '');
			return {
				index,
				item,
				label,
				labelNorm: label.toLowerCase()
			};
		});
		const firstCharBuckets = new Map();
		const bigramIndex = new Map();
		for (const record of records) {
			for (const ch of new Set(record.labelNorm.split(''))) {
				if (!ch.trim()) continue;
				if (!firstCharBuckets.has(ch)) firstCharBuckets.set(ch, []);
				firstCharBuckets.get(ch).push(record.index);
			}
			for (const gram of getSearchBigrams(record.labelNorm)) {
				if (!bigramIndex.has(gram)) bigramIndex.set(gram, []);
				bigramIndex.get(gram).push(record.index);
			}
		}
		return { records, firstCharBuckets, bigramIndex };
	};
	const searchManagerIndex = (index, query) => {
		const normalized = String(query || '').trim().toLowerCase();
		if (!normalized) return index.records.map(record => record.item);
		let candidateIndexes = [];
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
	const getApiTestCategoryLabel = (category) => {
		switch (category) {
			case 'ok': return t('apiKeyTestOk');
			case 'invalid': return t('apiKeyTestInvalid');
			case 'quota': return t('apiKeyTestQuota');
			case 'forbidden': return t('apiKeyTestForbidden');
			case 'network': return t('apiKeyTestNetwork');
			default: return t('apiKeyTestUnknown');
		}
	};

