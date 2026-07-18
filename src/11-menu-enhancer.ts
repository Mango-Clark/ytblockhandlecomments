import {
	t,
	type AppLike,
	type DialogRefreshContext
} from './02-utils-i18n.ts';
import { Dialog, Toast } from './08-toast-dialog.ts';
import { Extractor } from './09-extractor.ts';

	/* ----------------------------------------------------------
	 * 6. MenuEnhancer (⋯ menu item injection)
	 * ---------------------------------------------------------- */
	export class MenuEnhancer {
		[key: string]: any;
		constructor(app: AppLike) {
			this.app = app;
			this.storage = app.storage;
			this.lastHandle = null;
			this._popupObserver = null;
			this._popupTimer = null;

			document.body.addEventListener('click', e => {
				const target = e.target as EventTarget | null;
				if (this._captureMenuHandle(target)) this._watchNextPopup();
			}, true);
			window.addEventListener('yt-navigate-finish', () => this._disconnectPopupObserver(), true);
			window.addEventListener('popstate', () => this._disconnectPopupObserver(), true);
		}

		_captureMenuHandle(target: EventTarget | null) {
			const menuRenderer = (target as any)?.closest?.('ytd-menu-renderer');
			const comment = Extractor.getCommentRoot(menuRenderer);
			const handle = Extractor.getHandle(comment);
			if (!handle) return false;
			this.lastHandle = handle;
			return true;
		}

		_disconnectPopupObserver() {
			if (this._popupObserver) this._popupObserver.disconnect();
			this._popupObserver = null;
			if (this._popupTimer) clearTimeout(this._popupTimer);
			this._popupTimer = null;
		}

		_watchNextPopup() {
			this._disconnectPopupObserver();
			this._popupObserver = new MutationObserver(muts => {
				for (const m of muts) {
					m.addedNodes?.forEach(n => {
						if (n.nodeType !== 1) return;
						const popup = n.matches?.('ytd-menu-popup-renderer')
							? n
							: n.querySelector?.('ytd-menu-popup-renderer') || n.closest?.('ytd-menu-popup-renderer');
						if (popup && this._enhancePopup(popup)) this._disconnectPopupObserver();
					});
				}
			});
			this._popupObserver.observe(document.body, { childList: true, subtree: true });
			if (this._enhanceOpenPopups()) {
				this._disconnectPopupObserver();
				return;
			}
			requestAnimationFrame(() => {
				if (this._enhanceOpenPopups()) this._disconnectPopupObserver();
			});
			this._popupTimer = setTimeout(() => this._disconnectPopupObserver(), 2000);
		}

		_enhanceOpenPopups() {
			return Array.from(document.querySelectorAll('ytd-menu-popup-renderer'))
				.some(popup => this._enhancePopup(popup));
		}

		_enhancePopup(popup: Element) {
			if (!this.lastHandle) return false;
			const menu = popup.querySelector('tp-yt-paper-listbox[role="menu"], tp-yt-paper-listbox, #items');
			if (!menu) return false;
			this._addItem(menu, this.lastHandle);
			return true;
		}

		_addItem(menu: Element, handle: string) {
			const isBlocked = this.app.hasHandleRule(handle);
			const state = isBlocked ? 'blocked' : 'unblocked';
			const existing = menu.querySelector('.tm-hide-channel');
			if (existing?.getAttribute('data-tm-handle') === handle && existing.getAttribute('data-tm-state') === state) return;
			existing?.remove();
			const item = Object.assign(document.createElement('tp-yt-paper-item'), {
				className: 'style-scope ytd-menu-service-item-renderer tm-hide-channel',
				role: 'menuitem'
			});
			item.setAttribute('data-tm-handle', handle);
			item.setAttribute('data-tm-state', state);
			const marker = document.createElement('span');
			marker.className = 'tm-menu-script-mark';
			marker.setAttribute('aria-hidden', 'true');
			marker.textContent = 'CB';
			const label = document.createElement('span');
			label.textContent = isBlocked ? t('menuUnhide') : t('menuHide');
			item.append(marker, label);
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
					buttons: [{ label: t('close'), value: false }, { label: isBlocked ? t('unblock') : t('block'), value: true, primary: true }],
					onRefresh: (ctx: DialogRefreshContext) => {
						ctx.setTitle(isBlocked ? t('unblock') : t('block'));
						const paragraph = ctx.content.querySelector('p');
						if (paragraph) paragraph.textContent = isBlocked ? t('confirmUnblock') : t('confirmBlock');
						ctx.buttons[0].textContent = t('close');
						ctx.buttons[1].textContent = isBlocked ? t('unblock') : t('block');
					}
				});
				if (!ok) return;
				if (isBlocked) {
					Toast.show(this.app.removeHandleRule(handle) ? t('removed', handle) : t('storageSaveFailed'));
				}
				else {
					Toast.show(this.app.addHandleRule(handle) ? t('added', handle) : t('storageSaveFailed'));
				}
				document.body.click();
			});
			menu.appendChild(item);
		}
	}

