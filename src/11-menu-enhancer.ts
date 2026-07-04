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
				const btn = target?.closest?.('ytd-menu-renderer yt-icon-button#button, ytd-menu-renderer #button');
				if (!btn) return;
				const comment = Extractor.getCommentRoot(btn);
				this.lastHandle = Extractor.getHandle(comment);
				this._watchNextPopup();
			}, true);
			window.addEventListener('yt-navigate-finish', () => this._disconnectPopupObserver(), true);
			window.addEventListener('popstate', () => this._disconnectPopupObserver(), true);
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
						if (!n.matches?.('ytd-menu-popup-renderer') || n.hasAttribute('tm-enhanced')) return;
						const listbox = n.querySelector?.('tp-yt-paper-listbox[role="menu"]');
						if (listbox && this.lastHandle) this._addItem(listbox, this.lastHandle);
						n.setAttribute('tm-enhanced', '');
						this._disconnectPopupObserver();
					});
				}
			});
			this._popupObserver.observe(document.body, { childList: true, subtree: true });
			this._popupTimer = setTimeout(() => this._disconnectPopupObserver(), 2000);
		}

		_addItem(menu: Element, handle: string) {
			const isBlocked = this.app.hasHandleRule(handle);
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
					this.app.removeHandleRule(handle);
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

