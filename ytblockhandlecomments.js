// ==UserScript==
// @name         YouTube Comment Blocker by Handle
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  댓글 핸들 우클릭으로 차단/해제. 실시간 숨김, 커스텀 팝업, 토스트 알림, 차단 목록 관리/가져오기/내보내기 지원.
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
    .tm-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#323232;color:#fff;padding:8px 16px;border-radius:6px;opacity:0;transition:opacity .2s ease;z-index:10000;font-size:14px;pointer-events:none}
    .tm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:10000}
    .tm-dialog{background:#fff;color:#000;padding:20px 24px;border-radius:12px;max-width:520px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-height:80vh;overflow:auto}
    .tm-dialog header{margin:0 0 12px 0;font-size:16px;font-weight:700}
    .tm-dialog footer{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}
    .tm-dialog button{padding:8px 14px;border:none;border-radius:8px;font-size:13px;cursor:pointer}
    .tm-dialog button.primary{background:#065fd4;color:#fff}
    .tm-dialog button.secondary{background:#eee;color:#000}
    .tm-dialog textarea{width:100%;height:220px;resize:vertical;margin-top:8px;font-family:monospace;font-size:13px}
    .tm-block-list{list-style:none;padding:0;margin:0}
    .tm-block-list li{display:flex;justify-content:space-between;align-items:center;padding:6px 0;gap:12px;word-break:break-all}
    .tm-block-list li button{padding:4px 10px;border:none;border-radius:8px;font-size:12px;cursor:pointer;background:#d32f2f;color:#fff}
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

	/* ----------------------------------------------------------
	 * 2. Storage (versioned) + migration from legacy
	 * ---------------------------------------------------------- */
	class StorageV1 {
		// v1 schema: { version: 1, updatedAt: number, handles: string[] }
		constructor() {
			this.KEY_LEGACY = 'blockedHandles';      // legacy array or comma/newline string
			this.KEY_V1 = 'blockedHandles_v1';   // new object schema
			this._handles = this._init();
		}
		_getGM(key, def) { try { return GM_getValue(key, def); } catch { return def; } }
		_setGM(key, val) { try { GM_setValue(key, val); } catch { } }

		_loadLegacy() {
			const raw = this._getGM(this.KEY_LEGACY, []);
			if (Array.isArray(raw)) return raw;
			if (typeof raw === 'string') return raw.split(/\s*[,\n]\s*/);
			return [];
		}
		_loadV1() {
			const v = this._getGM(this.KEY_V1, null);
			if (!v || typeof v !== 'object' || v.version !== 1 || !Array.isArray(v.handles)) return [];
			return v.handles;
		}
		_saveV1(list) {
			const unique = Array.from(new Set(list.map(norm).filter(Boolean)));
			this._setGM(this.KEY_V1, { version: 1, updatedAt: Date.now(), handles: unique });
			this._handles = unique;
			return unique;
		}
		_init() {
			const merged = [...this._loadLegacy(), ...this._loadV1()].map(norm).filter(Boolean);
			return this._saveV1(merged);
		}
		all() { return this._handles.slice(); }
		setAll(list) { return this._saveV1(list); }
		add(h) {
			h = norm(h); if (!h) return false;
			if (this._handles.includes(h)) return false;
			return !!this._saveV1([...this._handles, h]);
		}
		remove(h) {
			h = norm(h); if (!h) return false;
			if (!this._handles.includes(h)) return false;
			return !!this._saveV1(this._handles.filter(x => x !== h));
		}
		clear() { this._saveV1([]); }
	}

	/* ----------------------------------------------------------
	 * 3. Toast & Dialog (safe UI)
	 * ---------------------------------------------------------- */
	class Toast {
		static show(msg, ms = 2000) {
			const el = Object.assign(document.createElement('div'), { className: 'tm-toast' });
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

				const header = document.createElement('header');
				header.textContent = title;

				const content = document.createElement('div');
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
			this._set = new Set(storage.all());
			this._pending = false;
		}
		rebuildSet() { this._set = new Set(this.storage.all()); }
		applyHide(node) {
			const h = Extractor.getHandle(node);
			if (h) node.style.display = this._set.has(h) ? 'none' : '';
		}
		doRefresh(root) {
			const scope = root || document;
			scope.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model')
				.forEach(n => this.applyHide(n));
		}
		refreshScheduled(root) {
			if (this._pending) return;
			this._pending = true;
			requestAnimationFrame(() => {
				this._pending = false;
				this.doRefresh(root);
			});
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
			const isBlocked = this.storage.all().includes(handle);
			const item = Object.assign(document.createElement('tp-yt-paper-item'), {
				className: 'style-scope ytd-menu-service-item-renderer tm-hide-channel',
				role: 'menuitem'
			});
			item.textContent = isBlocked ? '이 채널 댓글 숨김 해제' : '이 채널의 댓글 숨김';
			item.addEventListener('click', async ev => {
				ev.stopPropagation();
				const ok = await Dialog.show({
					title: isBlocked ? '차단 해제' : '차단',
					body: (() => {
						const div = document.createElement('div');
						const p = document.createElement('p');
						p.textContent = isBlocked ? '❌ 차단을 해제할까요?' : '🛑 차단할까요?';
						const b = document.createElement('b'); b.textContent = handle;
						div.append(p, b);
						return div;
					})(),
					buttons: [{ label: '취소', value: false }, { label: isBlocked ? '해제' : '차단', value: true, primary: true }]
				});
				if (!ok) return;
				if (isBlocked) { this.storage.remove(handle); Toast.show(`${handle} 해제`); }
				else { this.storage.add(handle); Toast.show(`${handle} 차단`); }
				this.hider.rebuildSet();
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
			const ul = Object.assign(document.createElement('ul'), { className: 'tm-block-list' });

			if (data.length === 0) {
				const li = document.createElement('li');
				const span = document.createElement('span'); span.textContent = '(없음)';
				li.style.justifyContent = 'center'; li.appendChild(span);
				ul.appendChild(li);
			} else {
				data.forEach(h => {
					const li = document.createElement('li');
					const span = document.createElement('span'); span.textContent = h;
					const btn = Object.assign(document.createElement('button'), { textContent: '해제' });
					btn.addEventListener('click', () => {
						this.storage.remove(h);
						this.hider.rebuildSet();
						li.remove();
						this.hider.refreshScheduled();
						Toast.show(`${h} 해제`);
					});
					li.append(span, btn);
					ul.appendChild(li);
				});
			}
			wrap.appendChild(ul);

			const header = `차단된 채널 (${data.length})`;
			Dialog.show({
				title: header,
				body: wrap,
				buttons: [
					{ label: '가져오기', value: 'import', primary: false },
					{ label: '내보내기', value: 'export', primary: false },
					{ label: '닫기', value: false, primary: true }
				]
			}).then(v => {
				if (v === 'import') this.importList();
				else if (v === 'export') this.exportList();
			});
		}

		exportList() {
			const json = JSON.stringify({ version: 1, exportedAt: Date.now(), handles: this.storage.all() }, null, 2);
			const body = document.createElement('div');

			const p = document.createElement('p'); p.textContent = 'JSON 또는 라인별 텍스트로 복사하세요.';
			const h4a = document.createElement('h4'); h4a.textContent = 'JSON';
			const ta1 = document.createElement('textarea'); ta1.readOnly = true; ta1.value = json;
			const h4b = document.createElement('h4'); h4b.textContent = '텍스트';
			const ta2 = document.createElement('textarea'); ta2.readOnly = true; ta2.value = this.storage.all().join('\\n');

			body.append(p, h4a, ta1, h4b, ta2);
			Dialog.show({ title: '차단 목록 내보내기', body, buttons: [{ label: '닫기', value: false, primary: true }] });
		}

		importList() {
			const ta = document.createElement('textarea');
			ta.placeholder = 'JSON 또는 @handle 라인별/쉼표 구분';

			Dialog.show({
				title: '차단 목록 가져오기',
				body: ta,
				buttons: [{ label: '취소', value: null }, { label: '가져오기', value: 'import', primary: true }],
				onBeforeClose: (val, dlg) => {
					if (val !== 'import') return null;
					const txt = (ta.value || '').trim();
					if (!txt) return { ok: false, count: 0 };

					let list = [];
					try {
						const obj = JSON.parse(txt);
						if (obj && Array.isArray(obj.handles)) list = obj.handles;
					} catch {
						list = txt.split(/[,\n]+/);
					}
					const merged = Array.from(new Set([...this.storage.all(), ...list.map(norm).filter(Boolean)]));
					this.storage.setAll(merged);
					this.hider.rebuildSet();
					return { ok: true, count: list.length };
				}
			}).then(res => {
				if (res && res.ok) { Toast.show(`${res.count}개 항목 가져옴`); this.hider.refreshScheduled(); }
			});
		}
	}

	/* ----------------------------------------------------------
	 * 8. App Orchestrator (events, observers, cross-tab sync)
	 * ---------------------------------------------------------- */
	class App {
		constructor() {
			this.storage = new StorageV1();
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
					title: this.storage.all().includes(h) ? '차단 해제' : '차단',
					body: (() => {
						const d = document.createElement('div');
						const p = document.createElement('p');
						p.textContent = this.storage.all().includes(h) ? '❌ 차단을 해제할까요?' : '🛑 차단할까요?';
						const b = document.createElement('b'); b.textContent = h;
						d.append(p, b);
						return d;
					})(),
					buttons: [{ label: '취소', value: false }, { label: this.storage.all().includes(h) ? '해제' : '차단', value: true, primary: true }]
				}).then(ok => {
					if (!ok) return;
					const was = this.storage.all().includes(h);
					if (was) { this.storage.remove(h); Toast.show(`${h} 해제`); }
					else { this.storage.add(h); Toast.show(`${h} 차단`); }
					this.hider.rebuildSet();
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
				GM_addValueChangeListener('blockedHandles_v1', (_k, _old, val, remote) => {
					if (!remote) return;
					if (val && val.version === 1 && Array.isArray(val.handles)) {
						this.storage.setAll(val.handles.map(norm).filter(Boolean));
						this.hider.rebuildSet();
						this.hider.refreshScheduled();
						Toast.show('차단 목록이 다른 탭과 동기화되었습니다.');
					}
				});
			}
		}

		_registerMenu() {
			try {
				GM_registerMenuCommand('🔍 차단 목록 관리', () => this.manager.openList());
				GM_registerMenuCommand('🗑️ 차단 목록 초기화', () => {
					Dialog.show({
						title: '초기화',
						body: (() => { const p = document.createElement('p'); p.textContent = '모든 차단 핸들을 초기화할까요?'; return p; })(),
						buttons: [{ label: '취소', value: false }, { label: '초기화', value: true, primary: true }]
					}).then(ok => {
						if (!ok) return;
						this.storage.clear(); this.hider.rebuildSet(); this.hider.refreshScheduled();
						Toast.show('차단 목록 초기화 완료');
					});
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