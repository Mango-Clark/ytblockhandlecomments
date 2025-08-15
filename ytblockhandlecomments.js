// ==UserScript==
// @name         YouTube Comment Blocker by Handle
// @namespace    https://github.com/Mango-Clark/ytblockhandlecomments/
// @version      0.2.2
// @description  Block/unblock comment handles via right-click. Real-time hiding, custom popup, toast alerts, and block list manage/import/export.
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
	 * 0. Global styles (minimal, neutral)
	 * ---------------------------------------------------------- */
	const style = document.createElement('style');
	style.textContent = `
    .tm-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#323232;color:#fff;padding:8px 16px;border-radius:6px;opacity:0;transition:opacity .2s ease;z-index:10000;font-size:15px;pointer-events:none}
    .tm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:10000}
    .tm-dialog{background:#fff;color:#000;padding:24px 28px;border-radius:12px;width:min(720px,90vw);max-width:720px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-height:80vh;display:flex;flex-direction:column;font-size:14px}
    .tm-dialog header{margin:0 0 14px 0;font-size:18px;font-weight:700}
    .tm-dialog .tm-content{flex:1 1 auto;overflow:auto;min-height:0}
    .tm-dialog footer{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}
    .tm-dialog button{padding:10px 16px;border:none;border-radius:8px;font-size:14px;cursor:pointer}
    .tm-dialog button.primary{background:#065fd4;color:#fff}
    .tm-dialog button.secondary{background:#eee;color:#000}
    .tm-dialog textarea{width:100%;height:260px;resize:vertical;margin-top:8px;font-family:monospace;font-size:14px}
    .tm-block-list{list-style:none;padding:0;margin:0}
    .tm-block-list li{display:flex;justify-content:space-between;align-items:center;padding:8px 0;gap:12px;word-break:break-all}
    .tm-block-list li button{padding:4px 12px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:#d32f2f;color:#fff}
    .tm-regex-bar{position:sticky;top:0;z-index:1;background:#fff;border-bottom:1px solid #e5e5e5;padding:12px 8px;margin-bottom:8px}
    .tm-regex-bar header{margin:0;font-size:16px;font-weight:700}
    .tm-regex-bar .row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .tm-regex-bar .controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .tm-hidden{display:none !important}
    @media (prefers-color-scheme: dark){
      .tm-dialog{background:#1f1f1f;color:#fff}
      .tm-dialog button.secondary{background:#333;color:#fff}
      .tm-regex-bar{background:#1f1f1f;border-color:#444}
    }
  `;
	document.head.appendChild(style);

	/* ----------------------------------------------------------
	 * 1. Utilities: normalization and safe text
	 * ---------------------------------------------------------- */
	const norm = (h) => {
		// Normalize handle: must start with '@' and lowercase
		if (!h) return null;
		h = h.trim();
		if (!h.startsWith('@')) return null;
		return h.toLowerCase();
	};

	// Simple i18n dictionary (ko/en)
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
			testRegex: '정규식 만들기/테스트'
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
			testRegex: 'Build/Test Regex'
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
					const id = String(it.value).trim(); if (!/^UC[0-9A-Za-z_-]{10,}$/.test(id)) continue; normed.push({ type: 'id', value: id });
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
		addId(id) { id = (id || '').trim(); if (!/^UC[0-9A-Za-z_-]{10,}$/.test(id)) return false; return !!this._saveV2([...this._items, { type: 'id', value: id }]); }
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
	 * 3. Toast & Dialog (safe UI)
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
	 * 5. CommentHider (Set lookup + rAF debounced refresh)
	 * ---------------------------------------------------------- */
	class CommentHider {
		constructor(storage) {
			this.storage = storage;
			this._idSet = new Set();
			this._handleSet = new Set();
			this._regexes = [];
			this._pending = false;
			this._seen = new WeakSet();
			this._io = null;
			this.rebuildLookup();
		}
		rebuildLookup() {
			this._idSet.clear(); this._handleSet.clear(); this._regexes = [];
			for (const it of this.storage.all()) {
				if (it.type === 'id') this._idSet.add(it.value);
				else if (it.type === 'handle') this._handleSet.add(it.value);
				else if (it.type === 'regex') { try { this._regexes.push(new RegExp(it.value, it.flags || '')); } catch { } }
			}
		}
		_matches(node) {
			const id = Extractor.getChannelId(node);
			if (id && this._idSet.has(id)) return true;
			const h = Extractor.getHandle(node);
			if (h && this._handleSet.has(h)) return true;
			if (h) { for (const rx of this._regexes) { if (rx.test(h)) return true; } }
			return false;
		}
		applyHide(node) {
			if (!node || this._seen.has(node)) return;
			this._seen.add(node);
			node.classList.toggle('tm-hidden', this._matches(node));
		}
		_connectIO() {
			if (this._io) return this._io;
			this._io = new IntersectionObserver((entries) => {
				for (const e of entries) if (e.isIntersecting) this.applyHide(e.target);
			}, { root: null, rootMargin: '0px', threshold: 0 });
			return this._io;
		}
		observeInScope(root) {
			const scope = root || document;
			const io = this._connectIO();
			scope.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model')
				.forEach(n => io.observe(n));
		}
		doRefresh(root) { this.observeInScope(root); }
		refreshScheduled(root) {
			if (this._pending) return;
			this._pending = true;
			requestAnimationFrame(() => { this._pending = false; this.doRefresh(root); });
		}
	}

	/* ----------------------------------------------------------
	 * 6. MenuEnhancer (⋯ menu item injection)
	 * ---------------------------------------------------------- */
	class MenuEnhancer {
		constructor(storage, hider) {
			this.storage = storage;
			this.hider = hider;
			this.lastHandle = null;

			// Track last handle on menu button click (capture phase)
			document.body.addEventListener('click', e => {
				const btn = e.target.closest?.('ytd-menu-renderer yt-icon-button#button, ytd-menu-renderer #button');
				if (!btn) return;
				const comment = Extractor.getCommentRoot(btn);
				this.lastHandle = Extractor.getHandle(comment);
			}, true);

			// Observe popup creation to add our item once
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
				if (isBlocked) { this.storage.remove({ type: 'handle', value: handle }); Toast.show(t('removed', handle)); }
				else { this.storage.addHandle(handle); Toast.show(t('added', handle)); }
				this.hider.rebuildLookup();
				this.hider.refreshScheduled();
				document.body.click(); // close yt menu
			});
			menu.appendChild(item);
		}
	}

	/* ----------------------------------------------------------
	 * 7. BlockListManager (UI + Import/Export)
	 * ---------------------------------------------------------- */
	class BlockListManager {
		constructor(storage, hider) {
			this.storage = storage;
			this.hider = hider;
		}

		openList() {
			const data = this.storage.all();
			const wrap = document.createElement('div');
			// Add Regex inline form
			const form = document.createElement('div');
			form.className = 'tm-regex-bar';
			const lblP = document.createElement('label'); lblP.textContent = I18N[getLang()].patternLabel + ':';
			const iptP = document.createElement('input'); iptP.type = 'text'; iptP.style.width = '60%'; iptP.placeholder = '/^@spam.*/i or ^@promo';
			const lblF = document.createElement('label'); lblF.textContent = I18N[getLang()].flagsLabel + ':'; lblF.style.marginLeft = '8px';
			const iptF = document.createElement('input'); iptF.type = 'text'; iptF.style.width = '80px'; iptF.placeholder = 'i';
			const addBtn = Object.assign(document.createElement('button'), { textContent: I18N[getLang()].addBtn });
			addBtn.className = 'secondary'; addBtn.style.marginLeft = '8px';
			addBtn.style.padding = '6px 12px';
			addBtn.style.fontSize = '13px';
			// Button to open regexr.com for building/testing regex
			const btnRegexr = Object.assign(document.createElement('button'), { textContent: I18N[getLang()].testRegex });
			btnRegexr.className = 'primary';
			btnRegexr.style.padding = '6px 12px';
			btnRegexr.style.fontSize = '13px';
			btnRegexr.addEventListener('click', () => {
				try { window.open('https://regexr.com/', '_blank', 'noopener'); } catch { location.href = 'https://regexr.com/'; }
			});
			addBtn.addEventListener('click', () => {
				let p = (iptP.value || '').trim(); let f = (iptF.value || '').trim();
				if (!p) return;
				const m = /^\/(.*)\/([gimsuy]*)$/.exec(p);
				if (m) { p = m[1]; f = m[2] || ''; }
				try { new RegExp(p, f); } catch { Toast.show(I18N[getLang()].invalidRegex); return; }
				const ok = this.storage.addRegex(p, f);
				if (!ok) { Toast.show(I18N[getLang()].exists); return; }
				// append to list
				const li = document.createElement('li');
				const span = document.createElement('span'); span.textContent = `/${p}/${f}`;
				const btn = Object.assign(document.createElement('button'), { textContent: I18N[getLang()].unblock });
				btn.addEventListener('click', () => {
					this.storage.remove({ type: 'regex', value: p, flags: f });
					this.hider.rebuildLookup();
					li.remove();
					this.hider.refreshScheduled();
					Toast.show(t('removed', span.textContent));
				});
				li.append(span, btn);
				ul.prepend(li);
				this.hider.rebuildLookup();
				this.hider.refreshScheduled();
				Toast.show(I18N[getLang()].addedRegex);
				iptP.value = ''; iptF.value = '';
			});
			const formTitle = document.createElement('header'); formTitle.textContent = I18N[getLang()].addRegex;
			const titleRow = document.createElement('div');
			titleRow.className = 'row';
			titleRow.append(formTitle, btnRegexr);
			const controls = document.createElement('div');
			controls.className = 'controls';
			controls.append(lblP, iptP, lblF, iptF, addBtn);
			form.append(titleRow, controls);
			const ul = Object.assign(document.createElement('ul'), { className: 'tm-block-list' });

			if (data.length === 0) {
				const li = document.createElement('li');
				const span = document.createElement('span'); span.textContent = '—';
				li.style.justifyContent = 'center'; li.appendChild(span);
				ul.appendChild(li);
			} else {
				data.forEach(h => {
					const li = document.createElement('li');
					const span = document.createElement('span');
					span.textContent = h.type === 'regex' ? `/${h.value}/${h.flags || ''}` : (h.type === 'id' ? h.value : h.value);
					const btn = Object.assign(document.createElement('button'), { textContent: I18N[getLang()].unblock });
					btn.addEventListener('click', () => {
						this.storage.remove(h);
						this.hider.rebuildLookup();
						li.remove();
						this.hider.refreshScheduled();
						Toast.show(t('removed', span.textContent));
					});
					li.append(span, btn);
					ul.appendChild(li);
				});
			}
			wrap.append(form, ul);

			const header = (I18N[getLang()].manageTitle ? I18N[getLang()].manageTitle(data.length) : `Blocked channels (${data.length})`);
			Dialog.show({
				title: header,
				body: wrap,
				buttons: [
					{ label: I18N[getLang()].import, value: 'import', primary: false },
					{ label: I18N[getLang()].export, value: 'export', primary: false },
					{ label: I18N[getLang()].close, value: false, primary: true }
				]
			}).then(v => {
				if (v === 'import') this.importList();
				else if (v === 'export') this.exportList();
			});
		}

		exportList() {
			const json = JSON.stringify({ version: 2, exportedAt: Date.now(), items: this.storage.all() }, null, 2);
			const body = document.createElement('div');

			const p = document.createElement('p'); p.textContent = I18N[getLang()].exportHint;
			const h4a = document.createElement('h4'); h4a.textContent = I18N[getLang()].json;
			const ta1 = document.createElement('textarea'); ta1.readOnly = true; ta1.value = json;
			const h4b = document.createElement('h4'); h4b.textContent = I18N[getLang()].text;
			const ta2 = document.createElement('textarea'); ta2.readOnly = true;
			ta2.value = this.storage.all().map(it => it.type === 'regex' ? `/${it.value}/${it.flags || ''}` : (it.type === 'id' ? it.value : it.value)).join('\n');
			body.append(p, h4a, ta1, h4b, ta2);
			Dialog.show({ title: I18N[getLang()].export, body, buttons: [{ label: I18N[getLang()].close, value: false, primary: true }] });
		}

		importList() {
			const ta = document.createElement('textarea');
			ta.placeholder = I18N[getLang()].importPlaceholder;

			Dialog.show({
				title: I18N[getLang()].importTitle,
				body: ta,
				buttons: [{ label: I18N[getLang()].close, value: null }, { label: I18N[getLang()].importBtn, value: 'import', primary: true }],
				onBeforeClose: (val, dlg) => {
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
							if (/^UC[0-9A-Za-z_-]{10,}$/.test(s)) return { type: 'id', value: s };
							return { type: 'handle', value: s };
						}).filter(Boolean);
					}
					const merged = [...this.storage.all(), ...items];
					this.storage.setAll(merged);
					this.hider.rebuildLookup();
					return { ok: true, count: items.length };
				}
			}).then(res => {
				if (res && res.ok) { Toast.show(I18N[getLang()].importedCount(res.count)); this.hider.refreshScheduled(); }
			});
		}
	}

	/* ----------------------------------------------------------
	 * 8. App Orchestrator (events, observers, cross-tab sync)
	 * ---------------------------------------------------------- */
	class App {
		constructor() {
			this.storage = new StorageV2();
			this.hider = new CommentHider(this.storage);
			this.menu = new MenuEnhancer(this.storage, this.hider);
			this.manager = new BlockListManager(this.storage, this.hider);
			this._bindGlobalEvents();
			this._observe();
			this._syncAcrossTabs();
			this.hider.refreshScheduled();
			this._registerMenu();
		}

		_bindGlobalEvents() {
			// Delegated contextmenu on author handle
			document.addEventListener('contextmenu', (ev) => {
				const el = ev.target?.closest?.('#author-text > span, #author-handle, a[href^="/@"]');
				if (!el) return;
				let hText = el.textContent?.trim();
				if (!hText?.startsWith?.('@')) {
					const href = el.getAttribute?.('href');
					const m = href && /^\/@([A-Za-z0-9._-]+)/.exec(href);
					if (m) hText = '@' + m[1];
				}
				const h = norm(hText);
				if (!h) return;

				ev.preventDefault();
				Dialog.show({
					title: this.storage.all().some(it => it.type === 'handle' && it.value === h) ? I18N[getLang()].unblock : I18N[getLang()].block,
					body: (() => {
						const d = document.createElement('div');
						const p = document.createElement('p');
						p.textContent = this.storage.all().some(it => it.type === 'handle' && it.value === h) ? I18N[getLang()].confirmUnblock : I18N[getLang()].confirmBlock;
						const b = document.createElement('b'); b.textContent = h;
						d.append(p, b);
						return d;
					})(),
					buttons: [{ label: I18N[getLang()].close, value: false }, { label: this.storage.all().some(it => it.type === 'handle' && it.value === h) ? I18N[getLang()].unblock : I18N[getLang()].block, value: true, primary: true }]
				}).then(ok => {
					if (!ok) return;
					const was = this.storage.all().some(it => it.type === 'handle' && it.value === h);
					if (was) { this.storage.remove({ type: 'handle', value: h }); Toast.show(I18N[getLang()].removed(h)); }
					else { this.storage.addHandle(h); Toast.show(I18N[getLang()].added(h)); }
					this.hider.rebuildLookup();
					this.hider.refreshScheduled();
				});
			}, { capture: true });
		}

		_observe() {
			// Observe DOM changes and refresh once per frame
			new MutationObserver(muts => {
				for (const m of muts) {
					if (m.addedNodes && m.addedNodes.length) { this.hider.refreshScheduled(m.target); break; }
				}
			}).observe(document.documentElement, { childList: true, subtree: true });
		}

		_syncAcrossTabs() {
			if (typeof GM_addValueChangeListener === 'function') {
				GM_addValueChangeListener('blocked_v2', (_k, _old, val, remote) => {
					if (!remote) return;
					if (val && val.version === 2 && Array.isArray(val.items)) {
						// Update in-memory only to prevent rebroadcast to other tabs
						this.storage.setAllLocal(val.items);
						this.hider.rebuildLookup();
						this.hider.refreshScheduled();
						Toast.show(I18N[getLang()].syncToast);
					}
				});
			}
		}

		_registerMenu() {
			try {
				GM_registerMenuCommand((I18N[getLang()].menuManage || 'Manage'), () => this.manager.openList());
				GM_registerMenuCommand((I18N[getLang()].menuClear || 'Clear'), () => {
					Dialog.show({
						title: (I18N[getLang()].clear || 'Reset'),
						body: (() => { const p = document.createElement('p'); p.textContent = (I18N[getLang()].confirmClear || 'Reset all blocked entries?'); return p; })(),
						buttons: [{ label: (I18N[getLang()].close || 'Close'), value: false }, { label: (I18N[getLang()].clear || 'Reset'), value: true, primary: true }]
					}).then(ok => {
						if (!ok) return;
						this.storage.clear(); this.hider.rebuildLookup(); this.hider.refreshScheduled();
						Toast.show((I18N[getLang()].clear || 'Reset'));
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
