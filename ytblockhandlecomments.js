// ==UserScript==
// @name         YouTube Comment Blocker
// @namespace    YouTube_Comment_Blocker
// @version      0.4.0-pre1
// @description  Block/unblock comment handles via right-click. Optional UID pairing via YouTube Data API, real-time hiding, custom popup, and block list management.
// @homepage     https://github.com/Mango-Clark/ytblockhandlecomments/
// @updateURL    https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
// @downloadURL  https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
// @author       Mango_Clark
// @match        https://www.youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==
(() => {
	'use strict';

	/* ----------------------------------------------------------
	 * 0. Global styles
	 * ---------------------------------------------------------- */
	const style = document.createElement('style');
	style.textContent = `
    .tm-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#323232;color:#fff;padding:8px 16px;border-radius:6px;opacity:0;transition:opacity .2s ease;z-index:10000;font-size:15px;pointer-events:none}
    .tm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:10000}
    .tm-dialog{background:#fff;color:#000;padding:24px 28px;border-radius:12px;width:min(820px,92vw);max-width:820px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-height:84vh;display:flex;flex-direction:column;font-size:14px}
    .tm-dialog header{margin:0 0 14px 0;font-size:18px;font-weight:700}
    .tm-dialog .tm-content{flex:1 1 auto;overflow:auto;min-height:0}
    .tm-dialog footer{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}
    .tm-dialog button{padding:10px 16px;border:none;border-radius:8px;font-size:14px;cursor:pointer}
    .tm-dialog button.primary{background:#065fd4;color:#fff}
    .tm-dialog button.secondary{background:#eee;color:#000}
    .tm-dialog button[disabled]{opacity:.6;cursor:wait}
    .tm-dialog textarea{width:100%;height:260px;resize:vertical;margin-top:8px;font-family:monospace;font-size:14px}
    .tm-block-list{list-style:none;padding:0;margin:0}
    .tm-block-list li{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;gap:12px;word-break:break-word;border-bottom:1px solid #ececec}
    .tm-block-list li:last-child{border-bottom:none}
    .tm-block-list li button{padding:4px 12px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#d32f2f;color:#fff;flex:0 0 auto}
    .tm-block-main{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 auto}
    .tm-block-label{font-weight:600;word-break:break-all}
    .tm-block-badges{display:flex;gap:6px;flex-wrap:wrap}
    .tm-badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:600;background:#f1f3f4;color:#333}
    .tm-badge.handle-only{background:#fff4d6;color:#8a5b00}
    .tm-badge.paired{background:#e3f5ea;color:#1d6f42}
    .tm-badge.stale{background:#ffe5cc;color:#a45100}
    .tm-badge.mismatch{background:#fde2e1;color:#b42318}
    .tm-badge.unverified{background:#ecebff;color:#5243aa}
    .tm-badge.uid{background:#e4f0ff;color:#0b57d0}
    .tm-badge.regex{background:#ececec;color:#444}
    .tm-block-meta{font-size:12px;line-height:1.5;color:#5f6368}
    .tm-section{border:1px solid #e5e5e5;border-radius:12px;padding:14px 16px;margin-bottom:14px}
    .tm-section h3{margin:0 0 10px 0;font-size:15px}
    .tm-toggle-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .tm-toggle-row label{display:flex;align-items:center;gap:8px;font-weight:600}
    .tm-toggle-row p{margin:6px 0 0 0;font-size:12px;color:#5f6368}
    .tm-inline-actions{display:flex;gap:8px;flex-wrap:wrap}
    .tm-inline-actions button{padding:8px 12px;font-size:13px}
    .tm-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
    .tm-summary-card{border-radius:10px;background:#f8f9fa;padding:10px 12px}
    .tm-summary-card strong{display:block;font-size:18px}
    .tm-summary-card span{font-size:12px;color:#5f6368}
    .tm-regex-bar{position:sticky;top:0;z-index:1;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:12px 14px;margin-bottom:14px}
    .tm-regex-bar header{margin:0;font-size:16px;font-weight:700}
    .tm-regex-bar .row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .tm-regex-bar .controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .tm-regex-bar input,.tm-section input{padding:7px 10px;border:1px solid #d0d7de;border-radius:8px}
    .tm-banner{position:fixed;top:18px;right:18px;z-index:9999;max-width:min(420px,calc(100vw - 36px));background:#fff7e6;color:#3d2f00;border:1px solid #ffd27a;border-radius:14px;box-shadow:0 12px 24px rgba(0,0,0,.18);padding:14px 16px}
    .tm-banner strong{display:block;margin-bottom:6px}
    .tm-banner p{margin:0;font-size:13px;line-height:1.45}
    .tm-banner .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .tm-banner .actions button{padding:8px 12px;border:none;border-radius:8px;cursor:pointer;font-size:13px}
    .tm-banner .actions .primary{background:#065fd4;color:#fff}
    .tm-banner .actions .secondary{background:#fff;color:#3d2f00;border:1px solid #ffd27a}
    .tm-muted{font-size:12px;color:#5f6368}
    .tm-hidden{display:none !important}
    @media (max-width: 640px){
      .tm-dialog{padding:18px}
      .tm-block-list li{flex-direction:column}
      .tm-block-list li button{align-self:flex-end}
      .tm-banner{left:12px;right:12px;top:auto;bottom:72px;max-width:none}
    }
    @media (prefers-color-scheme: dark){
      .tm-dialog{background:#1f1f1f;color:#fff}
      .tm-dialog button.secondary{background:#333;color:#fff}
      .tm-section,.tm-regex-bar{background:#1f1f1f;border-color:#444}
      .tm-summary-card{background:#2a2a2a}
      .tm-block-list li{border-color:#333}
      .tm-block-meta,.tm-toggle-row p,.tm-summary-card span,.tm-muted{color:#c7c7c7}
      .tm-badge{background:#303134;color:#f1f3f4}
      .tm-badge.handle-only{background:#4b3900;color:#ffd76a}
      .tm-badge.paired{background:#143823;color:#87d7a6}
      .tm-badge.stale{background:#4b2c00;color:#ffbe76}
      .tm-badge.mismatch{background:#4a1e1e;color:#ff8a80}
      .tm-badge.unverified{background:#2e2559;color:#c7b9ff}
      .tm-badge.uid{background:#16325c;color:#9bc2ff}
      .tm-banner{background:#2a2416;color:#ffe8ad;border-color:#8e6c25}
      .tm-banner .actions .secondary{background:#2a2416;color:#ffe8ad;border-color:#8e6c25}
      .tm-regex-bar input{background:#111;color:#fff;border-color:#555}
    }
  `;
	document.head.appendChild(style);

	/* ----------------------------------------------------------
	 * 1. Utilities and i18n
	 * ---------------------------------------------------------- */
	const norm = (h) => {
		if (!h) return null;
		h = h.trim();
		if (!h.startsWith('@')) return null;
		return h.toLowerCase();
	};
	const isChannelId = (value) => /^UC[0-9A-Za-z_-]{10,}$/.test(String(value || '').trim());
	const COMMENT_SELECTOR = 'ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model';
	const COMMENTS_HOST_SELECTOR = 'ytd-comments#comments, ytd-comments';
	const WATCH_ROOT_SELECTOR = 'ytd-watch-flexy, ytd-watch-grid, ytd-page-manager';
	const PAIR_STALE_MS = 7 * 24 * 60 * 60 * 1000;
	const PAIR_NOTICE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
			apiKeyClear: 'API 키 삭제',
			apiKeySaved: 'API 키를 저장했습니다',
			apiKeyCleared: 'API 키를 삭제했습니다',
			apiKeyStatusMissing: 'API 키가 없습니다. Pair 생성/갱신 전에 저장해야 합니다.',
			apiKeyStatusSaved: (masked) => `저장된 키: ${masked}`,
			apiKeyRequired: 'Pair 생성/갱신에는 YouTube Data API v3 API 키가 필요합니다.',
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
			pairResult: ({ created, refreshed, mismatches, failed, addedIds }) =>
				`생성 ${created} / 갱신 ${refreshed} / mismatch ${mismatches} / 실패 ${failed} / UID 추가 ${addedIds}`,
			pairLookupFailed: 'UID 조회 실패',
			pairLookupNoUid: 'UID를 찾지 못했습니다.',
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
			apiKeyClear: 'Clear API Key',
			apiKeySaved: 'API key saved',
			apiKeyCleared: 'API key cleared',
			apiKeyStatusMissing: 'No API key saved. Save one before running pair actions.',
			apiKeyStatusSaved: (masked) => `Saved key: ${masked}`,
			apiKeyRequired: 'A YouTube Data API v3 API key is required for pair creation and updates.',
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
			pairResult: ({ created, refreshed, mismatches, failed, addedIds }) =>
				`Created ${created} / Refreshed ${refreshed} / Mismatch ${mismatches} / Failed ${failed} / Added UID ${addedIds}`,
			pairLookupFailed: 'UID lookup failed',
			pairLookupNoUid: 'Could not find a UID.',
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

	/* ----------------------------------------------------------
	 * 2. Storage V2 (id/handle/regex) + migration
	 * ---------------------------------------------------------- */
	class StorageV2 {
		// v2 schema: { version: 2, updatedAt: number, items: Array<{type:'id'|'handle'|'regex', value:string, flags?:string}> }
		constructor() {
			this.KEY_LEGACY = 'blockedHandles';
			this.KEY_V1 = 'blockedHandles_v1';
			this.KEY_V2 = 'blocked_v2';
			this._items = this._init();
		}
		_getGM(key, def) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key, val) { try { GM_setValue(key, val); } catch { } }

		_loadLegacy() {
			const raw = this._getGM(this.KEY_LEGACY, []);
			let handles = [];
			if (Array.isArray(raw)) handles = raw;
			else if (typeof raw === 'string') handles = raw.split(/\s*[,\n]\s*/);
			return handles.map(norm).filter(Boolean).map(h => ({ type: 'handle', value: h }));
		}
		_loadV1() {
			const v = this._getGM(this.KEY_V1, null);
			if (!v || typeof v !== 'object' || v.version !== 1 || !Array.isArray(v.handles)) return [];
			return v.handles.map(norm).filter(Boolean).map(h => ({ type: 'handle', value: h }));
		}
		_loadV2() {
			const v = this._getGM(this.KEY_V2, null);
			if (!v || typeof v !== 'object' || v.version !== 2 || !Array.isArray(v.items)) return [];
			return v.items.filter(it => it && typeof it.value === 'string' && ['id', 'handle', 'regex'].includes(it.type));
		}
		_saveV2(items) {
			const normed = [];
			for (const it of items) {
				if (!it || !it.value) continue;
				if (it.type === 'handle') {
					const h = norm(it.value); if (!h) continue; normed.push({ type: 'handle', value: h });
				} else if (it.type === 'id') {
					const id = String(it.value).trim(); if (!isChannelId(id)) continue; normed.push({ type: 'id', value: id });
				} else if (it.type === 'regex') {
					try { const p = String(it.value); const flags = (it.flags || ''); new RegExp(p, flags); normed.push({ type: 'regex', value: p, flags }); } catch { }
				}
			}
			// dedupe
			const unique = [];
			const seen = new Set();
			for (const it of normed) {
				const key = it.type === 'handle' ? `h:${it.value}` : it.type === 'id' ? `i:${it.value}` : `r:${it.value}/${it.flags || ''}`;
				if (seen.has(key)) continue; seen.add(key); unique.push(it);
			}
			if (this._arraysEqual(this._items, unique)) { this._items = unique; return unique; }
			this._setGM(this.KEY_V2, { version: 2, updatedAt: Date.now(), items: unique });
			this._items = unique; return unique;
		}

		setAllLocal(items) { this._items = items.slice(); return this._items; }

		_arraysEqual(a, b) {
			if (a === b) return true;
			if (!Array.isArray(a) || !Array.isArray(b)) return false;
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) {
				const A = a[i], B = b[i];
				if (!A || !B || A.type !== B.type || A.value !== B.value || (A.flags || '') !== (B.flags || '')) return false;
			}
			return true;
		}
		_init() {
			const merged = [...this._loadV2(), ...this._loadV1(), ...this._loadLegacy()];
			return this._saveV2(merged);
		}
		all() { return this._items.slice(); }
		setAll(items) { return this._saveV2(items); }
		addHandle(h) { const v = norm(h); if (!v) return false; return !!this._saveV2([...this._items, { type: 'handle', value: v }]); }
		addId(id) { id = (id || '').trim(); if (!isChannelId(id)) return false; return !!this._saveV2([...this._items, { type: 'id', value: id }]); }
		addRegex(pattern, flags = '') { try { new RegExp(pattern, flags); } catch { return false; } return !!this._saveV2([...this._items, { type: 'regex', value: pattern, flags }]); }
		remove(item) {
			const key = item.type === 'handle' ? `h:${norm(item.value)}` : item.type === 'id' ? `i:${(item.value || '').trim()}` : `r:${String(item.value)}/${item.flags || ''}`;
			return !!this._saveV2(this._items.filter(it => {
				const k = it.type === 'handle' ? `h:${it.value}` : it.type === 'id' ? `i:${it.value}` : `r:${it.value}/${it.flags || ''}`;
				return k !== key;
			}));
		}
		clear() { this._saveV2([]); }
	}

	/* ----------------------------------------------------------
	 * 3. Pair metadata storage
	 * ---------------------------------------------------------- */
	class PairMetaStorage {
		constructor() {
			this.KEY = 'pair_meta_v1';
			this._state = this._init();
		}
		_getGM(key, def) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key, val) { try { GM_setValue(key, val); } catch { } }
		_defaultState() {
			return {
				version: 1,
				enableUidDetection: false,
				lastPairCheckAt: null,
				pairNotificationDismissedAt: null,
				pairs: []
			};
		}
		_normalizeStatus(pair, now = Date.now()) {
			if (pair.status === 'mismatch') return 'mismatch';
			if (pair.status === 'unverified') return 'unverified';
			if (!pair.uid) return 'unverified';
			if (!Number.isFinite(pair.verifiedAt) || pair.verifiedAt <= 0) return 'unverified';
			return now - pair.verifiedAt >= PAIR_STALE_MS ? 'stale' : 'verified';
		}
		_normalizePair(raw, now = Date.now()) {
			const handle = norm(raw?.handle);
			if (!handle) return null;
			const uid = isChannelId(raw?.uid) ? String(raw.uid).trim() : '';
			const verifiedAt = Number.isFinite(raw?.verifiedAt) && raw.verifiedAt > 0 ? raw.verifiedAt : null;
			const source = typeof raw?.source === 'string' && raw.source.trim() ? raw.source.trim() : 'unknown';
			const lastResolvedUid = isChannelId(raw?.lastResolvedUid) ? String(raw.lastResolvedUid).trim() : null;
			const lastError = typeof raw?.lastError === 'string' && raw.lastError.trim() ? raw.lastError.trim() : null;
			const normalized = {
				handle,
				uid,
				verifiedAt,
				status: raw?.status || (uid ? 'verified' : 'unverified'),
				source,
				lastResolvedUid,
				lastError
			};
			normalized.status = this._normalizeStatus(normalized, now);
			return normalized;
		}
		_normalizeState(raw) {
			const src = raw && typeof raw === 'object' ? raw : {};
			const next = {
				version: 1,
				enableUidDetection: !!src.enableUidDetection,
				lastPairCheckAt: Number.isFinite(src.lastPairCheckAt) ? src.lastPairCheckAt : null,
				pairNotificationDismissedAt: Number.isFinite(src.pairNotificationDismissedAt)
					? src.pairNotificationDismissedAt
					: null,
				pairs: []
			};
			const dedup = new Map();
			for (const pair of Array.isArray(src.pairs) ? src.pairs : []) {
				const normalized = this._normalizePair(pair);
				if (normalized) dedup.set(normalized.handle, normalized);
			}
			next.pairs = Array.from(dedup.values());
			return next;
		}
		_init() {
			return this._normalizeState(this._getGM(this.KEY, null));
		}
		_statesEqual(a, b) {
			if (a === b) return true;
			if (!a || !b) return false;
			if (a.enableUidDetection !== b.enableUidDetection) return false;
			if ((a.lastPairCheckAt || null) !== (b.lastPairCheckAt || null)) return false;
			if ((a.pairNotificationDismissedAt || null) !== (b.pairNotificationDismissedAt || null)) return false;
			if (!Array.isArray(a.pairs) || !Array.isArray(b.pairs) || a.pairs.length !== b.pairs.length) return false;
			for (let i = 0; i < a.pairs.length; i++) {
				const A = a.pairs[i];
				const B = b.pairs[i];
				if (!A || !B) return false;
				if (
					A.handle !== B.handle ||
					A.uid !== B.uid ||
					(A.verifiedAt || null) !== (B.verifiedAt || null) ||
					A.status !== B.status ||
					A.source !== B.source ||
					(A.lastResolvedUid || null) !== (B.lastResolvedUid || null) ||
					(A.lastError || null) !== (B.lastError || null)
				) return false;
			}
			return true;
		}
		_saveState(nextState) {
			const normalized = this._normalizeState(nextState);
			if (this._statesEqual(this._state, normalized)) {
				this._state = normalized;
				return this.getState();
			}
			this._state = normalized;
			this._setGM(this.KEY, this._state);
			return this.getState();
		}
		getState() {
			return { ...this._state, pairs: this._state.pairs.map(pair => ({ ...pair })) };
		}
		setAllLocal(state) {
			this._state = this._normalizeState(state);
			return this.getState();
		}
		refreshStatuses() {
			return this._saveState(this._state);
		}
		isUidDetectionEnabled() {
			return !!this._state.enableUidDetection;
		}
		setUidDetectionEnabled(enabled) {
			return this._saveState({ ...this._state, enableUidDetection: !!enabled });
		}
		getLastPairCheckAt() {
			return this._state.lastPairCheckAt;
		}
		setLastPairCheckAt(ts) {
			return this._saveState({ ...this._state, lastPairCheckAt: Number.isFinite(ts) ? ts : null });
		}
		getNotificationDismissedAt() {
			return this._state.pairNotificationDismissedAt;
		}
		dismissNotification(ts = Date.now()) {
			return this._saveState({
				...this._state,
				pairNotificationDismissedAt: Number.isFinite(ts) ? ts : Date.now()
			});
		}
		allPairs() {
			return this._state.pairs.map(pair => ({ ...pair }));
		}
		getPair(handle) {
			const normalized = norm(handle);
			if (!normalized) return null;
			return this._state.pairs.find(pair => pair.handle === normalized) || null;
		}
		upsertPair(pair) {
			const normalized = this._normalizePair(pair);
			if (!normalized) return this.getState();
			const nextPairs = this._state.pairs.filter(item => item.handle !== normalized.handle);
			nextPairs.push(normalized);
			return this._saveState({ ...this._state, pairs: nextPairs });
		}
		removePair(handle) {
			const normalized = norm(handle);
			if (!normalized) return this.getState();
			return this._saveState({
				...this._state,
				pairs: this._state.pairs.filter(pair => pair.handle !== normalized)
			});
		}
		clearPairs() {
			return this._saveState({ ...this._state, pairs: [] });
		}
	}

	/* ----------------------------------------------------------
	 * 4. API config storage
	 * ---------------------------------------------------------- */
	class ApiConfigStorage {
		constructor() {
			this.KEY = 'youtube_data_api_v3_config';
			this._state = this._init();
		}
		_getGM(key, def) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key, val) { try { GM_setValue(key, val); } catch { } }
		_defaultState() {
			return { version: 1, apiKey: '' };
		}
		_normalizeState(raw) {
			const src = raw && typeof raw === 'object' ? raw : {};
			return {
				version: 1,
				apiKey: typeof src.apiKey === 'string' ? src.apiKey.trim() : ''
			};
		}
		_init() {
			return this._normalizeState(this._getGM(this.KEY, null));
		}
		getState() {
			return { ...this._state };
		}
		setAllLocal(state) {
			this._state = this._normalizeState(state);
			return this.getState();
		}
		_saveState(nextState) {
			const normalized = this._normalizeState(nextState);
			if (this._state.apiKey === normalized.apiKey) {
				this._state = normalized;
				return this.getState();
			}
			this._state = normalized;
			this._setGM(this.KEY, this._state);
			return this.getState();
		}
		hasApiKey() {
			return !!this._state.apiKey;
		}
		getApiKey() {
			return this._state.apiKey;
		}
		setApiKey(apiKey) {
			return this._saveState({ ...this._state, apiKey: String(apiKey || '').trim() });
		}
		clearApiKey() {
			return this._saveState({ ...this._state, apiKey: '' });
		}
		getMaskedApiKey() {
			const key = this.getApiKey();
			if (!key) return '';
			if (key.length <= 8) return '•'.repeat(key.length);
			return `${key.slice(0, 4)}...${key.slice(-4)}`;
		}
	}

	/* ----------------------------------------------------------
	 * 5. Pair resolution and policy
	 * ---------------------------------------------------------- */
	class PairService {
		constructor(storage, pairStore, apiConfig) {
			this.storage = storage;
			this.pairStore = pairStore;
			this.apiConfig = apiConfig;
			this._busy = false;
		}
		getBlockedHandles() {
			return this.storage.all().filter(item => item.type === 'handle').map(item => item.value);
		}
		hasBlockedId(uid) {
			return this.storage.all().some(item => item.type === 'id' && item.value === uid);
		}
		getHandleStatus(handle) {
			const pair = this.pairStore.getPair(handle);
			if (!pair) return { code: 'handle-only', pair: null };
			if (pair.status === 'mismatch') return { code: 'mismatch', pair };
			if (pair.status === 'unverified' || !pair.uid) return { code: 'unverified', pair };
			if (!this.hasBlockedId(pair.uid)) return { code: 'handle-only', pair };
			if (pair.status === 'stale') return { code: 'stale', pair };
			return { code: 'paired', pair };
		}
		getSummary() {
			this.pairStore.refreshStatuses();
			const summary = {
				handles: 0,
				paired: 0,
				handleOnly: 0,
				stale: 0,
				mismatch: 0,
				unverified: 0,
				pairNeeded: 0
			};
			for (const handle of this.getBlockedHandles()) {
				summary.handles += 1;
				const status = this.getHandleStatus(handle).code;
				if (status === 'paired') summary.paired += 1;
				else if (status === 'stale') summary.stale += 1;
				else if (status === 'mismatch') summary.mismatch += 1;
				else if (status === 'unverified') summary.unverified += 1;
				else summary.handleOnly += 1;
			}
			summary.pairNeeded = summary.handleOnly + summary.unverified;
			return summary;
		}
		shouldNotify() {
			if (!this.pairStore.isUidDetectionEnabled()) return false;
			const summary = this.getSummary();
			if (!summary.stale && !summary.mismatch) return false;
			const dismissedAt = this.pairStore.getNotificationDismissedAt();
			return !dismissedAt || (Date.now() - dismissedAt) >= PAIR_NOTICE_COOLDOWN_MS;
		}
		dismissNotification() {
			this.pairStore.dismissNotification();
		}
		removeHandleArtifacts(handle) {
			const pair = this.pairStore.getPair(handle);
			if (pair?.uid) this.storage.remove({ type: 'id', value: pair.uid });
			this.pairStore.removePair(handle);
		}
		clearPairArtifacts() {
			this.pairStore.clearPairs();
		}
		async createMissingPairs() {
			const handles = this.getBlockedHandles().filter(handle => {
				const code = this.getHandleStatus(handle).code;
				return code === 'handle-only' || code === 'unverified';
			});
			return this._processHandles(handles);
		}
		async updatePairs({ includeMissing = true } = {}) {
			const handles = includeMissing
				? this.getBlockedHandles()
				: this.getBlockedHandles().filter(handle => !!this.pairStore.getPair(handle));
			return this._processHandles(handles);
		}
		async _processHandles(handles) {
			if (this._busy) return {
				created: 0,
				refreshed: 0,
				mismatches: 0,
				failed: 0,
				addedIds: 0,
				skipped: handles.length
			};
			this._busy = true;
			const stats = {
				created: 0,
				refreshed: 0,
				mismatches: 0,
				failed: 0,
				addedIds: 0,
				skipped: 0
			};
			const uniqueHandles = Array.from(new Set(handles.map(norm).filter(Boolean)));
			try {
				for (const handle of uniqueHandles) {
					const existing = this.pairStore.getPair(handle);
					try {
						const resolved = await this.resolveHandle(handle);
						if (existing?.uid && existing.uid !== resolved.uid) {
							this.pairStore.upsertPair({
								...existing,
								handle,
								status: 'mismatch',
								lastResolvedUid: resolved.uid,
								lastError: null,
								source: resolved.source || existing.source || 'youtube-data-api-v3'
							});
							stats.mismatches += 1;
							continue;
						}
						this.pairStore.upsertPair({
							handle,
							uid: resolved.uid,
							verifiedAt: Date.now(),
							status: 'verified',
							source: resolved.source,
							lastResolvedUid: resolved.uid,
							lastError: null
						});
						if (!this.hasBlockedId(resolved.uid) && this.storage.addId(resolved.uid)) {
							stats.addedIds += 1;
						}
						if (existing?.uid) stats.refreshed += 1;
						else stats.created += 1;
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						const fallbackStatus = existing?.uid
							? (existing.status === 'mismatch'
								? 'mismatch'
								: (existing.verifiedAt && (Date.now() - existing.verifiedAt) >= PAIR_STALE_MS
									? 'stale'
									: 'unverified'))
							: 'unverified';
						this.pairStore.upsertPair({
							...existing,
							handle,
							uid: existing?.uid || '',
							verifiedAt: existing?.verifiedAt || null,
							status: fallbackStatus,
							source: existing?.source || 'youtube-data-api-v3',
							lastResolvedUid: existing?.lastResolvedUid || null,
							lastError: message
						});
						stats.failed += 1;
					}
				}
			} finally {
				this._busy = false;
				this.pairStore.setLastPairCheckAt(Date.now());
				this.pairStore.refreshStatuses();
			}
			return stats;
		}
		async resolveHandle(handle) {
			const apiKey = this.apiConfig.getApiKey();
			if (!apiKey) throw new Error(t('apiKeyRequired'));

			const url = new URL('https://www.googleapis.com/youtube/v3/channels');
			url.searchParams.set('part', 'id');
			url.searchParams.set('forHandle', handle);
			url.searchParams.set('key', apiKey);
			url.searchParams.set('hl', getLang() === 'ko' ? 'ko' : 'en');

			const response = await fetch(url.toString(), { cache: 'no-store' });
			let payload = null;
			try { payload = await response.json(); } catch { }

			if (!response.ok) {
				const message = payload?.error?.message || `${t('pairLookupFailed')} (${response.status})`;
				throw new Error(message);
			}

			const uid = payload?.items?.[0]?.id;
			if (!isChannelId(uid)) throw new Error(t('pairLookupNoUid'));
			return { uid, source: 'youtube-data-api-v3' };
		}
	}

	/* ----------------------------------------------------------
	 * 6. Toast & Dialog (safe UI)
	 * ---------------------------------------------------------- */
	class Toast {
		static show(msg, ms = 2000) {
			const el = Object.assign(document.createElement('div'), { className: 'tm-toast' });
			el.setAttribute('aria-live', 'polite');
			el.textContent = msg;
			document.body.appendChild(el);
			requestAnimationFrame(() => el.style.opacity = '1');
			setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, ms);
		}
	}

	class Dialog {
		// Promise resolves with `value` passed to close()
		static show({ title = '', body = null, buttons = [], onBeforeClose = null }) {
			return new Promise(resolve => {
				const backdrop = Object.assign(document.createElement('div'), { className: 'tm-backdrop' });
				const dialog = Object.assign(document.createElement('div'), { className: 'tm-dialog' });
				dialog.setAttribute('role', 'dialog');
				dialog.setAttribute('aria-modal', 'true');

				const header = document.createElement('header');
				header.textContent = title;
				dialog.setAttribute('aria-label', title);

				const content = Object.assign(document.createElement('div'), { className: 'tm-content' });
				if (body instanceof Node) content.appendChild(body);
				else if (typeof body === 'string') {
					// Accept limited HTML from internal templates only
					content.insertAdjacentHTML('beforeend', body);
				}

				const footer = document.createElement('footer');
				const close = (val) => {
					try { if (onBeforeClose) val = onBeforeClose(val, dialog); } catch { }
					backdrop.remove(); document.removeEventListener('keydown', onKey);
					resolve(val);
				};

				buttons.forEach(btn => {
					const b = Object.assign(document.createElement('button'), {
						textContent: btn.label,
						className: btn.primary ? 'primary' : 'secondary'
					});
					b.addEventListener('click', () => close(btn.value));
					footer.appendChild(b);
				});

				dialog.append(header, content, footer);
				backdrop.appendChild(dialog);
				document.body.appendChild(backdrop);

				// Focus trap
				const onKey = (e) => {
					if (e.key === 'Escape') { e.preventDefault(); close(false); }
					else if (e.key === 'Enter') {
						const primary = buttons.find(b => b.primary)?.value ?? true;
						e.preventDefault(); close(primary);
					} else if (e.key === 'Tab') {
						const focusables = dialog.querySelectorAll('button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])');
						if (!focusables.length) return;
						const first = focusables[0], last = focusables[focusables.length - 1];
						if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
						else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
					}
				};
				document.addEventListener('keydown', onKey);
				backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); });

				dialog.querySelector('button')?.focus();
			});
		}
	}

	/* ----------------------------------------------------------
	 * 4. Handle extractor (robust to DOM changes)
	 * ---------------------------------------------------------- */
	class Extractor {
		// Try multiple routes to get "@handle" from a comment root
		static getHandle(root) {
			if (!root) return null;

			// 1) '#author-text > span' or '#author-handle'
			const span = root.querySelector('#author-text > span, #author-handle');
			const t = span?.textContent?.trim();
			if (t?.startsWith('@')) return norm(t);

			// 2) anchor with href '/@handle'
			const a = root.querySelector('a[href^="/@"]');
			if (a?.getAttribute) {
				const href = a.getAttribute('href') || '';
				const m = /^\/@([A-Za-z0-9._-]+)/.exec(href);
				if (m) return norm('@' + m[1]);
			}
			return null;
		}

		static getChannelId(root) {
			if (!root) return null;
			const a = root.querySelector('a[href*="/channel/UC"]');
			const href = a?.getAttribute?.('href') || '';
			const m = /\/channel\/(UC[0-9A-Za-z_-]+)/.exec(href);
			if (m) return m[1];
			return null;
		}

		static getCommentRoot(node) {
			return node?.closest?.('ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model') || null;
		}
	}

	/* ----------------------------------------------------------
	 * 5. CommentHider (scoped refresh + cached metadata)
	 * ---------------------------------------------------------- */
	class CommentHider {
		constructor(storage, pairStore) {
			this.storage = storage;
			this.pairStore = pairStore;
			this._idSet = new Set();
			this._handleSet = new Set();
			this._regexes = [];
			this._metaCache = new WeakMap();
			this._observed = new WeakSet();
			this._pending = false;
			this._pendingRoot = null;
			this._io = null;
			this._metrics = {
				mutationBatches: 0,
				fullRefreshes: 0,
				incrementalRefreshes: 0,
				scannedNodes: 0,
				lastDurationMs: 0,
				totalDurationMs: 0
			};
			this.rebuildLookup();
			try { window.__ytCommentBlockerPerf = this._metrics; } catch { }
		}
		rebuildLookup() {
			this._idSet.clear(); this._handleSet.clear(); this._regexes = [];
			const useUidDetection = this.pairStore.isUidDetectionEnabled();
			for (const it of this.storage.all()) {
				if (it.type === 'id') {
					if (useUidDetection) this._idSet.add(it.value);
				}
				else if (it.type === 'handle') this._handleSet.add(it.value);
				else if (it.type === 'regex') { try { this._regexes.push(new RegExp(it.value, it.flags || '')); } catch { } }
			}
		}
		_getDefaultRoot() {
			return document.querySelector(COMMENTS_HOST_SELECTOR);
		}
		_collectCommentNodes(root) {
			if (!root) return [];
			if (root.matches?.(COMMENT_SELECTOR)) return [root];
			if (!root.querySelectorAll) return [];
			return Array.from(root.querySelectorAll(COMMENT_SELECTOR));
		}
		_mergeRoots(a, b) {
			if (!a) return b;
			if (!b || a === b) return a;
			if (a.contains?.(b)) return a;
			if (b.contains?.(a)) return b;
			return this._getDefaultRoot() || b;
		}
		_getMeta(node) {
			const cached = this._metaCache.get(node);
			if (cached) return cached;
			const meta = {
				id: Extractor.getChannelId(node),
				handle: Extractor.getHandle(node)
			};
			this._metaCache.set(node, meta);
			return meta;
		}
		invalidateNode(node) {
			if (!node) return;
			this._metaCache.delete(node);
		}
		_matches(node) {
			const meta = this._getMeta(node);
			if (meta.id && this._idSet.has(meta.id)) return true;
			const h = meta.handle;
			if (h && this._handleSet.has(h)) return true;
			if (h) { for (const rx of this._regexes) { if (rx.test(h)) return true; } }
			return false;
		}
		applyHide(node) {
			if (!node) return;
			node.classList.toggle('tm-hidden', this._matches(node));
		}
		_connectIO() {
			if (this._io) return this._io;
			this._io = new IntersectionObserver((entries) => {
				for (const e of entries) if (e.isIntersecting) this.applyHide(e.target);
			}, { root: null, rootMargin: '0px', threshold: 0 });
			return this._io;
		}
		resetObservation() {
			if (this._io) this._io.disconnect();
			this._io = null;
			this._observed = new WeakSet();
		}
		_observeNode(node) {
			if (!node || this._observed.has(node)) return;
			this._observed.add(node);
			this._connectIO().observe(node);
		}
		_recordRefresh(kind, count, startedAt) {
			this._metrics[kind] += 1;
			this._metrics.scannedNodes += count;
			const duration = Math.round((performance.now() - startedAt) * 100) / 100;
			this._metrics.lastDurationMs = duration;
			this._metrics.totalDurationMs = Math.round((this._metrics.totalDurationMs + duration) * 100) / 100;
		}
		noteMutationBatch() {
			this._metrics.mutationBatches += 1;
		}
		refreshNodes(nodes, { invalidate = true } = {}) {
			const unique = new Set();
			for (const node of nodes || []) {
				if (node?.isConnected) unique.add(node);
			}
			if (!unique.size) return;
			const startedAt = performance.now();
			for (const node of unique) {
				if (invalidate) this.invalidateNode(node);
				this.applyHide(node);
				this._observeNode(node);
			}
			this._recordRefresh('incrementalRefreshes', unique.size, startedAt);
		}
		doRefresh(root) {
			const scope = root || this._getDefaultRoot();
			if (!scope) return;
			const nodes = this._collectCommentNodes(scope);
			if (!nodes.length) return;
			const startedAt = performance.now();
			for (const node of nodes) {
				this.applyHide(node);
				this._observeNode(node);
			}
			this._recordRefresh('fullRefreshes', nodes.length, startedAt);
		}
		refreshScheduled(root) {
			const scope = root || this._getDefaultRoot();
			if (!scope) return;
			this._pendingRoot = this._mergeRoots(this._pendingRoot, scope);
			if (this._pending) return;
			this._pending = true;
			requestAnimationFrame(() => {
				const nextRoot = this._pendingRoot || this._getDefaultRoot();
				this._pending = false;
				this._pendingRoot = null;
				if (nextRoot) this.doRefresh(nextRoot);
			});
		}
	}

	/* ----------------------------------------------------------
	 * 6. MenuEnhancer (⋯ menu item injection)
	 * ---------------------------------------------------------- */
	class MenuEnhancer {
		constructor(app) {
			this.app = app;
			this.storage = app.storage;
			this.lastHandle = null;

			document.body.addEventListener('click', e => {
				const btn = e.target.closest?.('ytd-menu-renderer yt-icon-button#button, ytd-menu-renderer #button');
				if (!btn) return;
				const comment = Extractor.getCommentRoot(btn);
				this.lastHandle = Extractor.getHandle(comment);
			}, true);

			new MutationObserver(muts => {
				for (const m of muts) {
					m.addedNodes?.forEach(n => {
						if (n.nodeType !== 1) return;
						if (!n.matches?.('ytd-menu-popup-renderer') || n.hasAttribute('tm-enhanced')) return;
						const listbox = n.querySelector?.('tp-yt-paper-listbox[role="menu"]');
						if (listbox && this.lastHandle) this._addItem(listbox, this.lastHandle);
						n.setAttribute('tm-enhanced', '');
					});
				}
			}).observe(document.body, { childList: true, subtree: true });
		}

		_addItem(menu, handle) {
			const isBlocked = this.storage.all().some(it => it.type === 'handle' && it.value === handle);
			const item = Object.assign(document.createElement('tp-yt-paper-item'), {
				className: 'style-scope ytd-menu-service-item-renderer tm-hide-channel',
				role: 'menuitem'
			});
			item.textContent = isBlocked ? t('menuUnhide') : t('menuHide');
			item.addEventListener('click', async ev => {
				ev.stopPropagation();
				const ok = await Dialog.show({
					title: isBlocked ? t('unblock') : t('block'),
					body: (() => {
						const div = document.createElement('div');
						const p = document.createElement('p');
						p.textContent = isBlocked ? t('confirmUnblock') : t('confirmBlock');
						const b = document.createElement('b'); b.textContent = handle;
						div.append(p, b);
						return div;
					})(),
					buttons: [{ label: t('close'), value: false }, { label: isBlocked ? t('unblock') : t('block'), value: true, primary: true }]
				});
				if (!ok) return;
				if (isBlocked) {
					this.app.removeEntry({ type: 'handle', value: handle });
					Toast.show(t('removed', handle));
				}
				else {
					this.app.addHandleRule(handle);
					Toast.show(t('added', handle));
				}
				document.body.click();
			});
			menu.appendChild(item);
		}
	}

	/* ----------------------------------------------------------
	 * 7. BlockListManager (UI + Import/Export)
	 * ---------------------------------------------------------- */
	class BlockListManager {
		constructor(app) {
			this.app = app;
		}
		_makeBadge(code) {
			const badge = document.createElement('span');
			badge.className = `tm-badge ${code}`;
			const key = code === 'uid'
				? 'badgeUid'
				: code === 'regex'
					? 'badgeRegex'
					: code === 'paired'
						? 'badgePaired'
						: code === 'stale'
							? 'badgeStale'
							: code === 'mismatch'
								? 'badgeMismatch'
								: code === 'unverified'
									? 'badgeUnverified'
									: 'badgeHandleOnly';
			badge.textContent = t(key);
			return badge;
		}
		_createMetaLine(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div;
		}
		openList() {
			this.app.pairStore.refreshStatuses();

			const wrap = document.createElement('div');
			const apiSection = document.createElement('section');
			apiSection.className = 'tm-section';
			const apiTitle = document.createElement('h3');
			apiTitle.textContent = t('apiKeyTitle');
			const apiRow = document.createElement('div');
			apiRow.className = 'tm-toggle-row';
			const apiBox = document.createElement('div');
			const apiLabel = document.createElement('label');
			apiLabel.textContent = t('apiKeyLabel');
			const apiInput = document.createElement('input');
			apiInput.type = 'password';
			apiInput.placeholder = t('apiKeyPlaceholder');
			apiInput.style.minWidth = '280px';
			apiInput.style.width = 'min(420px, 100%)';
			apiInput.value = this.app.apiConfig.getApiKey();
			const apiHelp = document.createElement('p');
			apiHelp.textContent = t('apiKeyHelp');
			const apiStatus = document.createElement('div');
			apiStatus.className = 'tm-muted';
			apiBox.append(apiLabel, apiInput, apiHelp, apiStatus);
			const apiActions = document.createElement('div');
			apiActions.className = 'tm-inline-actions';
			const saveApiBtn = Object.assign(document.createElement('button'), {
				textContent: t('apiKeySave'),
				className: 'primary'
			});
			const clearApiBtn = Object.assign(document.createElement('button'), {
				textContent: t('apiKeyClear'),
				className: 'secondary'
			});
			apiActions.append(saveApiBtn, clearApiBtn);
			apiRow.append(apiBox, apiActions);
			apiSection.append(apiTitle, apiRow);

			const pairSection = document.createElement('section');
			pairSection.className = 'tm-section';
			const pairTitle = document.createElement('h3');
			pairTitle.textContent = t('uidDetectionLabel');
			const toggleRow = document.createElement('div');
			toggleRow.className = 'tm-toggle-row';
			const toggleBox = document.createElement('div');
			const toggleLabel = document.createElement('label');
			const toggle = document.createElement('input');
			toggle.type = 'checkbox';
			toggle.checked = this.app.pairStore.isUidDetectionEnabled();
			const toggleText = document.createElement('span');
			toggleText.textContent = t('uidDetectionLabel');
			toggleLabel.append(toggle, toggleText);
			const toggleHelp = document.createElement('p');
			toggleHelp.textContent = t('uidDetectionHelp');
			toggleBox.append(toggleLabel, toggleHelp);
			const pairActions = document.createElement('div');
			pairActions.className = 'tm-inline-actions';
			const createBtn = Object.assign(document.createElement('button'), {
				textContent: t('pairCreate'),
				className: 'secondary'
			});
			const updateBtn = Object.assign(document.createElement('button'), {
				textContent: t('pairUpdate'),
				className: 'primary'
			});
			pairActions.append(createBtn, updateBtn);
			toggleRow.append(toggleBox, pairActions);
			const summaryTitle = document.createElement('h3');
			summaryTitle.textContent = t('pairSummary');
			const lastCheck = document.createElement('div');
			lastCheck.className = 'tm-muted';
			const summaryGrid = document.createElement('div');
			summaryGrid.className = 'tm-summary-grid';
			pairSection.append(pairTitle, toggleRow, summaryTitle, lastCheck, summaryGrid);

			const form = document.createElement('div');
			form.className = 'tm-regex-bar';
			const formTitle = document.createElement('header');
			formTitle.textContent = t('addRegex');
			const titleRow = document.createElement('div');
			titleRow.className = 'row';
			const regexrBtn = Object.assign(document.createElement('button'), {
				textContent: t('testRegex'),
				className: 'primary'
			});
			regexrBtn.style.padding = '6px 12px';
			regexrBtn.style.fontSize = '13px';
			regexrBtn.addEventListener('click', () => {
				try { window.open('https://regexr.com/', '_blank', 'noopener'); } catch { location.href = 'https://regexr.com/'; }
			});
			titleRow.append(formTitle, regexrBtn);
			const controls = document.createElement('div');
			controls.className = 'controls';
			const patternLabel = document.createElement('label');
			patternLabel.textContent = t('patternLabel') + ':';
			const patternInput = document.createElement('input');
			patternInput.type = 'text';
			patternInput.style.width = '60%';
			patternInput.placeholder = '/^@spam.*/i or ^@promo';
			const flagsLabel = document.createElement('label');
			flagsLabel.textContent = t('flagsLabel') + ':';
			const flagsInput = document.createElement('input');
			flagsInput.type = 'text';
			flagsInput.style.width = '80px';
			flagsInput.placeholder = 'i';
			const addBtn = Object.assign(document.createElement('button'), {
				textContent: t('addBtn'),
				className: 'secondary'
			});
			addBtn.style.padding = '6px 12px';
			addBtn.style.fontSize = '13px';
			controls.append(patternLabel, patternInput, flagsLabel, flagsInput, addBtn);
			form.append(titleRow, controls);

			const listSection = document.createElement('section');
			listSection.className = 'tm-section';
			const listTitle = document.createElement('h3');
			listTitle.textContent = t('manageTitle', this.app.storage.all().length);
			const list = Object.assign(document.createElement('ul'), { className: 'tm-block-list' });
			listSection.append(listTitle, list);
			wrap.append(apiSection, pairSection, form, listSection);

			const syncApiStatus = () => {
				apiInput.value = this.app.apiConfig.getApiKey();
				apiStatus.textContent = this.app.apiConfig.hasApiKey()
					? t('apiKeyStatusSaved', this.app.apiConfig.getMaskedApiKey())
					: t('apiKeyStatusMissing');
			};
			const setButtonsBusy = (busy) => {
				const hasKey = this.app.apiConfig.hasApiKey();
				createBtn.disabled = busy || !hasKey;
				updateBtn.disabled = busy || !hasKey;
				createBtn.textContent = busy ? t('pairWorking') : t('pairCreate');
				updateBtn.textContent = busy ? t('pairWorking') : t('pairUpdate');
			};
			const renderSummary = () => {
				const summary = this.app.pairService.getSummary();
				const cards = [
					{ label: t('pairSummaryHandles'), value: summary.handles },
					{ label: t('pairSummaryPaired'), value: summary.paired },
					{ label: t('pairSummaryNeeded'), value: summary.pairNeeded },
					{ label: t('pairSummaryStale'), value: summary.stale },
					{ label: t('pairSummaryMismatch'), value: summary.mismatch },
					{ label: t('pairSummaryUnverified'), value: summary.unverified }
				];
				summaryGrid.replaceChildren(...cards.map(card => {
					const box = document.createElement('div');
					box.className = 'tm-summary-card';
					const strong = document.createElement('strong');
					strong.textContent = String(card.value);
					const span = document.createElement('span');
					span.textContent = card.label;
					box.append(strong, span);
					return box;
				}));
				lastCheck.textContent = t('pairLastCheck', formatDateTime(this.app.pairStore.getLastPairCheckAt()));
				toggle.checked = this.app.pairStore.isUidDetectionEnabled();
				syncApiStatus();
				setButtonsBusy(false);
			};
			const renderList = () => {
				const items = this.app.storage.all();
				list.replaceChildren();
				if (!items.length) {
					const li = document.createElement('li');
					li.style.justifyContent = 'center';
					const span = document.createElement('span');
					span.textContent = t('noEntries');
					li.append(span);
					list.appendChild(li);
					return;
				}
				for (const item of items) {
					const li = document.createElement('li');
					const left = document.createElement('div');
					left.className = 'tm-block-main';
					const label = document.createElement('div');
					label.className = 'tm-block-label';
					label.textContent = item.type === 'regex' ? `/${item.value}/${item.flags || ''}` : item.value;
					const badges = document.createElement('div');
					badges.className = 'tm-block-badges';
					const meta = document.createElement('div');
					meta.className = 'tm-block-meta';

					if (item.type === 'handle') {
						const status = this.app.pairService.getHandleStatus(item.value);
						badges.appendChild(this._makeBadge(status.code));
						if (status.pair?.uid) meta.appendChild(this._createMetaLine(t('metaUid', status.pair.uid)));
						if (status.pair?.verifiedAt) {
							meta.appendChild(this._createMetaLine(t('metaVerifiedAt', formatDateTime(status.pair.verifiedAt))));
						}
						if (status.pair?.lastResolvedUid && status.pair.lastResolvedUid !== status.pair.uid) {
							meta.appendChild(this._createMetaLine(t('metaResolvedUid', status.pair.lastResolvedUid)));
						}
						if (status.pair?.source) meta.appendChild(this._createMetaLine(t('metaSource', status.pair.source)));
						if (status.pair?.lastError) meta.appendChild(this._createMetaLine(t('metaError', status.pair.lastError)));
					} else if (item.type === 'id') {
						badges.appendChild(this._makeBadge('uid'));
					} else if (item.type === 'regex') {
						badges.appendChild(this._makeBadge('regex'));
					}

					const removeBtn = Object.assign(document.createElement('button'), { textContent: t('unblock') });
					removeBtn.addEventListener('click', () => {
						this.app.removeEntry(item);
						renderAll();
						Toast.show(t('removed', label.textContent));
					});
					left.append(label, badges);
					if (meta.childNodes.length) left.appendChild(meta);
					li.append(left, removeBtn);
					list.appendChild(li);
				}
			};
			const renderAll = () => {
				renderSummary();
				renderList();
			};

			toggle.addEventListener('change', () => {
				this.app.pairStore.setUidDetectionEnabled(toggle.checked);
				this.app.refreshAfterStorageChange();
				renderAll();
			});
			saveApiBtn.addEventListener('click', () => {
				this.app.apiConfig.setApiKey(apiInput.value);
				this.app.refreshAfterStorageChange();
				syncApiStatus();
				setButtonsBusy(false);
				Toast.show(t('apiKeySaved'));
			});
			clearApiBtn.addEventListener('click', () => {
				this.app.apiConfig.clearApiKey();
				this.app.refreshAfterStorageChange();
				syncApiStatus();
				setButtonsBusy(false);
				Toast.show(t('apiKeyCleared'));
			});
			createBtn.addEventListener('click', async () => {
				setButtonsBusy(true);
				const stats = await this.app.runPairUpdate('create');
				setButtonsBusy(false);
				Toast.show(t('pairResult', stats), 3200);
				renderAll();
			});
			updateBtn.addEventListener('click', async () => {
				setButtonsBusy(true);
				const stats = await this.app.runPairUpdate('update');
				setButtonsBusy(false);
				Toast.show(t('pairResult', stats), 3200);
				renderAll();
			});
			addBtn.addEventListener('click', () => {
				let pattern = (patternInput.value || '').trim();
				let flags = (flagsInput.value || '').trim();
				if (!pattern) return;
				const m = /^\/(.*)\/([gimsuy]*)$/.exec(pattern);
				if (m) { pattern = m[1]; flags = m[2] || ''; }
				try { new RegExp(pattern, flags); } catch { Toast.show(t('invalidRegex')); return; }
				const ok = this.app.storage.addRegex(pattern, flags);
				if (!ok) { Toast.show(t('exists')); return; }
				this.app.refreshAfterStorageChange();
				patternInput.value = '';
				flagsInput.value = '';
				renderAll();
				Toast.show(t('addedRegex'));
			});

			renderAll();
			Dialog.show({
				title: t('manageTitle', this.app.storage.all().length),
				body: wrap,
				buttons: [
					{ label: t('import'), value: 'import' },
					{ label: t('export'), value: 'export' },
					{ label: t('close'), value: false, primary: true }
				]
			}).then(v => {
				if (v === 'import') this.importList();
				else if (v === 'export') this.exportList();
			});
		}

		exportList() {
			const json = JSON.stringify({ version: 2, exportedAt: Date.now(), items: this.app.storage.all() }, null, 2);
			const body = document.createElement('div');

			const p = document.createElement('p'); p.textContent = t('exportHint');
			const h4a = document.createElement('h4'); h4a.textContent = t('json');
			const ta1 = document.createElement('textarea'); ta1.readOnly = true; ta1.value = json;
			const h4b = document.createElement('h4'); h4b.textContent = t('text');
			const ta2 = document.createElement('textarea'); ta2.readOnly = true;
			ta2.value = this.app.storage.all().map(it => it.type === 'regex' ? `/${it.value}/${it.flags || ''}` : it.value).join('\n');
			body.append(p, h4a, ta1, h4b, ta2);
			Dialog.show({ title: t('export'), body, buttons: [{ label: t('close'), value: false, primary: true }] });
		}

		importList() {
			const ta = document.createElement('textarea');
			ta.placeholder = t('importPlaceholder');

			Dialog.show({
				title: t('importTitle'),
				body: ta,
				buttons: [{ label: t('close'), value: null }, { label: t('importBtn'), value: 'import', primary: true }],
				onBeforeClose: (val) => {
					if (val !== 'import') return null;
					const txt = (ta.value || '').trim();
					if (!txt) return { ok: false, count: 0 };

					let items = [];
					try {
						const obj = JSON.parse(txt);
						if (obj && Array.isArray(obj.items)) items = obj.items;
						else if (obj && Array.isArray(obj.handles)) items = obj.handles.map(h => ({ type: 'handle', value: h }));
					} catch {
						const parts = txt.split(/[,\n]+/);
						items = parts.map(s => s.trim()).filter(Boolean).map(s => {
							if (s.startsWith('@')) return { type: 'handle', value: s };
							if (s.startsWith('/') && s.endsWith('/')) { const m = /^\/(.*)\/(.*)$/.exec(s); return m ? { type: 'regex', value: m[1], flags: m[2] } : null; }
							if (isChannelId(s)) return { type: 'id', value: s };
							return { type: 'handle', value: s };
						}).filter(Boolean);
					}
					this.app.storage.setAll([...this.app.storage.all(), ...items]);
					this.app.refreshAfterStorageChange();
					return { ok: true, count: items.length };
				}
			}).then(res => {
				if (res && res.ok) Toast.show(t('importedCount', res.count));
			});
		}
	}

	/* ----------------------------------------------------------
	 * 8. App Orchestrator (events, observers, cross-tab sync)
	 * ---------------------------------------------------------- */
	class App {
		constructor() {
			this.storage = new StorageV2();
			this.pairStore = new PairMetaStorage();
			this.apiConfig = new ApiConfigStorage();
			this.pairService = new PairService(this.storage, this.pairStore, this.apiConfig);
			this.hider = new CommentHider(this.storage, this.pairStore);
			this.menu = new MenuEnhancer(this);
			this.manager = new BlockListManager(this);
			this._commentsHost = null;
			this._commentObserver = null;
			this._hostObserver = null;
			this._pageSyncPending = false;
			this._pairBanner = null;
			this._bindGlobalEvents();
			this._bindNavigationEvents();
			this._syncAcrossTabs();
			this._registerMenu();
			this._schedulePageSync();
		}

		addHandleRule(handle) {
			this.storage.addHandle(handle);
			this.refreshAfterStorageChange();
		}

		removeEntry(item) {
			if (item.type === 'handle') this.pairService.removeHandleArtifacts(item.value);
			this.storage.remove(item);
			this.refreshAfterStorageChange();
		}

		clearAllEntries() {
			this.storage.clear();
			this.pairService.clearPairArtifacts();
			this.refreshAfterStorageChange();
		}

		refreshAfterStorageChange() {
			this.hider.rebuildLookup();
			this.hider.refreshScheduled();
			this._syncPairBanner();
		}

		async runPairUpdate(mode = 'update') {
			const stats = mode === 'create'
				? await this.pairService.createMissingPairs()
				: await this.pairService.updatePairs({ includeMissing: true });
			this.refreshAfterStorageChange();
			return stats;
		}

		_bindGlobalEvents() {
			document.addEventListener('contextmenu', (ev) => {
				const el = ev.target?.closest?.('#author-text > span, #author-handle, a[href^="/@"]');
				if (!el) return;
				let hText = el.textContent?.trim();
				if (!hText?.startsWith?.('@')) {
					const href = el.getAttribute?.('href');
					const m = href && /^\/@([A-Za-z0-9._-]+)/.exec(href);
					if (m) hText = '@' + m[1];
				}
				const handle = norm(hText);
				if (!handle) return;
				const isBlocked = this.storage.all().some(it => it.type === 'handle' && it.value === handle);

				ev.preventDefault();
				Dialog.show({
					title: isBlocked ? t('unblock') : t('block'),
					body: (() => {
						const d = document.createElement('div');
						const p = document.createElement('p');
						p.textContent = isBlocked ? t('confirmUnblock') : t('confirmBlock');
						const b = document.createElement('b'); b.textContent = handle;
						d.append(p, b);
						return d;
					})(),
					buttons: [{ label: t('close'), value: false }, { label: isBlocked ? t('unblock') : t('block'), value: true, primary: true }]
				}).then(ok => {
					if (!ok) return;
					if (isBlocked) {
						this.removeEntry({ type: 'handle', value: handle });
						Toast.show(t('removed', handle));
					}
					else {
						this.addHandleRule(handle);
						Toast.show(t('added', handle));
					}
				});
			}, { capture: true });
		}

		_bindNavigationEvents() {
			const onNavigate = () => this._schedulePageSync();
			window.addEventListener('yt-navigate-finish', onNavigate, true);
			window.addEventListener('popstate', onNavigate, true);
			document.addEventListener('visibilitychange', () => {
				if (!document.hidden) this._schedulePageSync();
			});
		}

		_schedulePageSync() {
			if (this._pageSyncPending) return;
			this._pageSyncPending = true;
			requestAnimationFrame(() => {
				this._pageSyncPending = false;
				this._syncPageState();
			});
		}

		_isWatchPage() {
			return location.pathname === '/watch';
		}

		_getWatchRoot() {
			return document.querySelector(WATCH_ROOT_SELECTOR) || document.body;
		}

		_findCommentsHost() {
			return document.querySelector(COMMENTS_HOST_SELECTOR);
		}

		_disconnectHostObserver() {
			if (!this._hostObserver) return;
			this._hostObserver.disconnect();
			this._hostObserver = null;
		}

		_disconnectCommentObserver() {
			if (this._commentObserver) this._commentObserver.disconnect();
			this._commentObserver = null;
			this._commentsHost = null;
			this.hider.resetObservation();
		}

		_watchForCommentsHost() {
			if (this._hostObserver || !this._isWatchPage()) return;
			const root = this._getWatchRoot();
			if (!root) return;
			this._hostObserver = new MutationObserver(() => {
				const host = this._findCommentsHost();
				if (host) this._attachCommentsHost(host);
			});
			this._hostObserver.observe(root, { childList: true, subtree: true });
		}

		_collectRefreshRoots(node, roots) {
			if (node?.nodeType !== 1) return;
			if (node.matches?.(COMMENT_SELECTOR)) roots.add(node);
			const currentRoot = Extractor.getCommentRoot(node);
			if (currentRoot) roots.add(currentRoot);
			node.querySelectorAll?.(COMMENT_SELECTOR).forEach(commentNode => roots.add(commentNode));
		}

		_handleCommentMutations(muts) {
			const roots = new Set();
			for (const m of muts) {
				if (!m.addedNodes?.length) continue;
				const targetRoot = Extractor.getCommentRoot(m.target);
				if (targetRoot) roots.add(targetRoot);
				for (const node of m.addedNodes) this._collectRefreshRoots(node, roots);
			}
			if (!roots.size) return;
			this.hider.noteMutationBatch();
			this.hider.refreshNodes(roots, { invalidate: true });
		}

		_attachCommentsHost(host) {
			this._disconnectHostObserver();
			if (!host) return;
			if (this._commentsHost !== host || !this._commentObserver) {
				if (this._commentObserver) this._commentObserver.disconnect();
				this.hider.resetObservation();
				this._commentsHost = host;
				this._commentObserver = new MutationObserver(muts => this._handleCommentMutations(muts));
				this._commentObserver.observe(host, { childList: true, subtree: true });
			}
			this.hider.refreshScheduled(host);
		}

		_syncPageState() {
			if (!this._isWatchPage()) {
				this._disconnectHostObserver();
				this._disconnectCommentObserver();
				this._syncPairBanner();
				return;
			}
			const host = this._findCommentsHost();
			if (host) this._attachCommentsHost(host);
			else {
				this._disconnectCommentObserver();
				this._watchForCommentsHost();
			}
			this._syncPairBanner();
		}

		_syncAcrossTabs() {
			if (typeof GM_addValueChangeListener === 'function') {
				GM_addValueChangeListener('blocked_v2', (_k, _old, val, remote) => {
					if (!remote) return;
					if (val && val.version === 2 && Array.isArray(val.items)) {
						this.storage.setAllLocal(val.items);
						this.refreshAfterStorageChange();
						Toast.show(t('syncToast'));
					}
				});
				GM_addValueChangeListener('pair_meta_v1', (_k, _old, val, remote) => {
					if (!remote) return;
					this.pairStore.setAllLocal(val);
					this.refreshAfterStorageChange();
					Toast.show(t('pairSyncToast'));
				});
				GM_addValueChangeListener('youtube_data_api_v3_config', (_k, _old, val, remote) => {
					if (!remote) return;
					this.apiConfig.setAllLocal(val);
					this.refreshAfterStorageChange();
				});
			}
		}

		_syncPairBanner() {
			if (!this._isWatchPage() || !this.pairService.shouldNotify()) {
				this._pairBanner?.remove();
				this._pairBanner = null;
				return;
			}
			const summary = this.pairService.getSummary();
			if (!this._pairBanner) {
				const banner = document.createElement('div');
				banner.className = 'tm-banner';
				const title = document.createElement('strong');
				const body = document.createElement('p');
				const actions = document.createElement('div');
				actions.className = 'actions';
				const updateBtn = Object.assign(document.createElement('button'), {
					textContent: t('updateNow'),
					className: 'primary'
				});
				const laterBtn = Object.assign(document.createElement('button'), {
					textContent: t('later'),
					className: 'secondary'
				});
				updateBtn.addEventListener('click', async () => {
					updateBtn.disabled = true;
					laterBtn.disabled = true;
					updateBtn.textContent = t('pairWorking');
					const stats = await this.runPairUpdate('update');
					Toast.show(t('pairResult', stats), 3200);
					this._syncPairBanner();
				});
				laterBtn.addEventListener('click', () => {
					this.pairService.dismissNotification();
					this._syncPairBanner();
				});
				actions.append(updateBtn, laterBtn);
				banner.append(title, body, actions);
				document.body.appendChild(banner);
				this._pairBanner = banner;
			}
			this._pairBanner.querySelector('strong').textContent = t('pairBannerTitle');
			this._pairBanner.querySelector('p').textContent = t('pairBannerBody', summary.stale, summary.mismatch);
		}

		_registerMenu() {
			try {
				GM_registerMenuCommand(t('menuManage') || 'Manage', () => this.manager.openList());
				GM_registerMenuCommand(t('menuClear') || 'Clear', () => {
					Dialog.show({
						title: t('clear') || 'Reset',
						body: (() => { const p = document.createElement('p'); p.textContent = t('confirmClear') || 'Reset all blocked entries?'; return p; })(),
						buttons: [{ label: t('close') || 'Close', value: false }, { label: t('clear') || 'Reset', value: true, primary: true }]
					}).then(ok => {
						if (!ok) return;
						this.clearAllEntries();
						Toast.show(t('clear') || 'Reset');
					});
				});
				GM_registerMenuCommand('🌐 Language: ' + getLang().toUpperCase(), () => {
					const next = getLang() === 'ko' ? 'en' : 'ko';
					try { GM_setValue('lang', next); } catch { }
					Toast.show('Lang: ' + next.toUpperCase());
				});
			} catch { /* Tampermonkey menu may be unavailable in some envs */ }
		}
	}

	/* ----------------------------------------------------------
	 * 9. Bootstrap
	 * ---------------------------------------------------------- */
	// Defer a tick to allow YT initial paint, then start
	requestAnimationFrame(() => new App());
})();
