// ==UserScript==
// @name         YouTube Comment Blocker by Handle
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  댓글 핸들 우클릭으로 차단/해제. 실시간 숨김, 커스텀 팝업, 토스트 알림, 차단 목록 관리/가져오기/내보내기 지원.
// @author       Mango_Clark
// @match        https://www.youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
	'use strict';

	/*--------------------------------------------------*
	 | 0. 공통 스타일                                   |
	 *--------------------------------------------------*/
	const style = document.createElement('style');
	style.textContent = `
    .tm-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#323232;color:#fff;padding:8px 16px;border-radius:4px;opacity:0;transition:opacity .3s ease;z-index:10000;font-size:14px;}
    .tm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:10000;}
    .tm-dialog{background:#fff;color:#000;padding:20px 24px;border-radius:8px;max-width:400px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.2);max-height:80vh;overflow-y:auto;}
    .tm-dialog footer{display:flex;justify-content:flex-end;flex-wrap:wrap;margin-top:12px;gap:8px;}
    .tm-dialog button{padding:6px 14px;border:none;border-radius:4px;font-size:13px;cursor:pointer;}
    .tm-dialog button.primary{background:#065fd4;color:#fff;}
    .tm-dialog button.secondary{background:#eee;color:#000;}
    .tm-dialog textarea{width:100%;height:200px;resize:vertical;margin-top:8px;font-family:monospace;font-size:13px;}
    .tm-block-list li{display:flex;justify-content:space-between;align-items:center;padding:4px 0;word-break:break-all;}
    .tm-block-list li button{padding:2px 8px;border:none;border-radius:4px;font-size:12px;cursor:pointer;background:#d32f2f;color:#fff;}
    `;
	document.head.appendChild(style);

	/*--------------------------------------------------*
	 | 0‑1. 유틸: 토스트 & 다이얼로그                    |
	 *--------------------------------------------------*/
	const toast = msg => {
		const el = Object.assign(document.createElement('div'), { className: 'tm-toast', textContent: msg });
		document.body.appendChild(el);
		requestAnimationFrame(() => (el.style.opacity = '1'));
		setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
	};

	const showDialog = ({ title = '', bodyHTML = '', buttons = [] }) => new Promise(resolve => {
		const backdrop = Object.assign(document.createElement('div'), { className: 'tm-backdrop' });
		const dialog = Object.assign(document.createElement('div'), { className: 'tm-dialog' });
		dialog.innerHTML = `<h3 style="margin:0 0 12px 0">${title}</h3>` + bodyHTML;
		const footer = document.createElement('footer');
		buttons.forEach(btn => {
			const b = Object.assign(document.createElement('button'), { textContent: btn.label, className: btn.primary ? 'primary' : 'secondary' });
			b.addEventListener('click', () => close(btn.value));
			footer.appendChild(b);
		});
		dialog.appendChild(footer);
		backdrop.appendChild(dialog);
		document.body.appendChild(backdrop);
		dialog.querySelector('button')?.focus();
		const onKey = e => {
			if (e.key === 'Enter') { e.preventDefault(); close(buttons.find(b => b.primary)?.value ?? true); }
			else if (e.key === 'Escape') { e.preventDefault(); close(false); }
		};
		const close = val => { backdrop.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
		document.addEventListener('keydown', onKey);
		backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); });
	});

	/*--------------------------------------------------*
	 | 1. 차단 목록 저장/로드                            |
	 *--------------------------------------------------*/
	let blocked = GM_getValue('blockedHandles', []);
	if (!Array.isArray(blocked)) blocked = [];
	const saveBlocked = () => GM_setValue('blockedHandles', blocked);

	/*--------------------------------------------------*
	 | 2. DOM 헬퍼                                      |
	 *--------------------------------------------------*/
	const getHandle = el => {
		const span = el.querySelector('#author-text > span');
		if (span && span.textContent.trim().startsWith('@')) return span.textContent.trim();
		const old = el.querySelector('#author-handle');
		return old ? old.textContent.trim() : null;
	};
	const getCommentRoot = n => n.closest('ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model');

	/*--------------------------------------------------*
	 | 3. 숨김/표시 반영                                |
	 *--------------------------------------------------*/
	const applyHide = node => {
		const handle = getHandle(node);
		if (handle) node.style.display = blocked.includes(handle) ? 'none' : '';
	};
	const refresh = root => {
		(root || document).querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model').forEach(applyHide);
		bindHandleEvents(root || document);
	};

	/*--------------------------------------------------*
	 | 4. 핸들 우클릭 차단/해제                          |
	 *--------------------------------------------------*/
	const onRightClickHandle = async (e, handle) => {
		e.preventDefault();
		const isBlocked = blocked.includes(handle);
		const ok = await showDialog({
			title: isBlocked ? '차단 해제' : '차단',
			bodyHTML: `<p>${isBlocked ? '❌ 차단을 해제할까요?' : '🛑 차단할까요?'}<br><b>${handle}</b></p>`,
			buttons: [
				{ label: '취소', value: false },
				{ label: isBlocked ? '해제' : '차단', value: true, primary: true }
			]
		});
		if (!ok) return;
		if (isBlocked) { blocked = blocked.filter(h => h !== handle); toast(`${handle} 해제`); } else { blocked.push(handle); toast(`${handle} 차단`); }
		saveBlocked();
		refresh();
	};
	const bindHandleEvents = root => {
		root.querySelectorAll('#author-text > span, #author-handle').forEach(el => {
			if (el._tmBound) return; el._tmBound = true;
			el.addEventListener('contextmenu', ev => {
				const h = el.textContent.trim();
				if (h.startsWith('@')) onRightClickHandle(ev, h);
			});
		});
	};

	/*--------------------------------------------------*
	 | 5. 차단 목록 관리 팝업                           |
	 *--------------------------------------------------*/
	const openBlockList = () => {
		// inner functions for export/import
		const exportList = async () => {
			await showDialog({
				title: '차단 목록 내보내기',
				bodyHTML: `<textarea readonly>${blocked.join('\n')}</textarea>`,
				buttons: [{ label: '닫기', value: false, primary: true }]
			});
		};
		const importList = async () => {
			const text = await showDialog({
				title: '차단 목록 가져오기',
				bodyHTML: '<textarea placeholder="@handle1\n@handle2\n..."></textarea>',
				buttons: [{ label: '취소', value: null }, { label: '가져오기', value: 'import', primary: true }]
			});
			if (!text) return; // 취소
			if (text === 'import') {
				// The dialog closed with primary button, fetch textarea value
				const ta = document.querySelector('.tm-dialog textarea');
				if (!ta) return;
				const handles = ta.value.split(/\n+/).map(x => x.trim()).filter(x => x.startsWith('@'));
				if (handles.length === 0) { toast('가져올 핸들이 없습니다.'); return; }
				handles.forEach(h => { if (!blocked.includes(h)) blocked.push(h); });
				saveBlocked();
				toast(`${handles.length}개 핸들 가져옴`);
				refresh();
			}
		};

		// Main list dialog
		const backdrop = Object.assign(document.createElement('div'), { className: 'tm-backdrop' });
		const dialog = Object.assign(document.createElement('div'), { className: 'tm-dialog' });
		dialog.innerHTML = `<h3 style="margin:0 0 12px 0">차단된 채널 (${blocked.length})</h3>`;
		const ul = Object.assign(document.createElement('ul'), { className: 'tm-block-list' });
		if (blocked.length === 0) {
			ul.innerHTML = '<li style="justify-content:center;">(없음)</li>';
		} else {
			blocked.forEach(h => {
				const li = document.createElement('li');
				li.innerHTML = `<span>${h}</span>`;
				const btn = Object.assign(document.createElement('button'), { textContent: '해제' });
				btn.addEventListener('click', () => { blocked = blocked.filter(x => x !== h); saveBlocked(); refresh(); li.remove(); toast(`${h} 해제`); header.textContent = `차단된 채널 (${blocked.length})`; if (!blocked.length) ul.innerHTML = '<li style="justify-content:center;">(없음)</li>'; });
				li.appendChild(btn);
				ul.appendChild(li);
			});
		}
		dialog.appendChild(ul);
		const footer = document.createElement('footer');
		const closeBtn = Object.assign(document.createElement('button'), { textContent: '닫기', className: 'primary' });
		const exportBtn = Object.assign(document.createElement('button'), { textContent: '내보내기', className: 'secondary' });
		const importBtn = Object.assign(document.createElement('button'), { textContent: '가져오기', className: 'secondary' });
		footer.append(importBtn, exportBtn, closeBtn);
		dialog.appendChild(footer);
		const header = dialog.querySelector('h3');
		backdrop.appendChild(dialog);
		document.body.appendChild(backdrop);
		closeBtn.focus();
		const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
		const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
		document.addEventListener('keydown', onKey);
		backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
		closeBtn.addEventListener('click', close);
		exportBtn.addEventListener('click', () => { close(); exportList(); });
		importBtn.addEventListener('click', () => { close(); importList(); });
	};

	/*--------------------------------------------------*
	 | 6. "⋯" 메뉴 항목                                 |
	 *--------------------------------------------------*/
	let lastHandle = null;
	document.body.addEventListener('click', e => {
		const btn = e.target.closest('ytd-menu-renderer yt-icon-button#button, ytd-menu-renderer #button');
		if (!btn) return;
		const comment = getCommentRoot(btn);
		lastHandle = getHandle(comment);
	}, true);

	const addMenuItem = (menu, handle) => {
		if (!menu || menu.querySelector('.tm-hide-channel')) return;
		const isBlocked = blocked.includes(handle);
		const item = Object.assign(document.createElement('tp-yt-paper-item'), {
			className: 'style-scope ytd-menu-service-item-renderer tm-hide-channel',
			role: 'menuitem',
			textContent: isBlocked ? '이 채널 댓글 숨김 해제' : '이 채널의 댓글 숨김'
		});
		item.addEventListener('click', async ev => {
			ev.stopPropagation();
			const ok = await showDialog({
				title: isBlocked ? '차단 해제' : '차단',
				bodyHTML: `<p>${isBlocked ? '❌ 차단을 해제할까요?' : '🛑 차단할까요?'}<br><b>${handle}</b></p>`,
				buttons: [{ label: '취소', value: false }, { label: isBlocked ? '해제' : '차단', primary: true, value: true }]
			});
			if (!ok) return;
			if (isBlocked) { blocked = blocked.filter(h => h !== handle); toast(`${handle} 해제`); } else { blocked.push(handle); toast(`${handle} 차단`); }
			saveBlocked(); refresh(); document.body.click();
		});
		menu.appendChild(item);
	};
	new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
		if (n.nodeType !== 1 || !n.matches('ytd-menu-popup-renderer') || n.hasAttribute('tm-enhanced')) return;
		const listbox = n.querySelector('tp-yt-paper-listbox[role="menu"]');
		if (listbox && lastHandle) addMenuItem(listbox, lastHandle);
		n.setAttribute('tm-enhanced', '');
	}))).observe(document.body, { childList: true, subtree: true });

	/*--------------------------------------------------*
	 | 7. 초기화 및 Observe                              |
	 *--------------------------------------------------*/
	refresh();
	new MutationObserver(muts => muts.forEach(m => refresh(m.target))).observe(document.documentElement, { childList: true, subtree: true });

	/*--------------------------------------------------*
	 | 8. Tampermonkey 메뉴                             |
	 *--------------------------------------------------*/
	GM_registerMenuCommand('🔍 차단 목록 관리', openBlockList);
	GM_registerMenuCommand('🗑️ 차단 목록 초기화', () => {
		showDialog({
			title: '초기화',
			bodyHTML: '<p>모든 차단 핸들을 초기화할까요?</p>',
			buttons: [{ label: '취소', value: false }, { label: '초기화', value: true, primary: true }]
		}).then(ok => {
			if (!ok) return;
			blocked = []; saveBlocked(); refresh(); toast('차단 목록 초기화 완료');
		});
	});
})();
