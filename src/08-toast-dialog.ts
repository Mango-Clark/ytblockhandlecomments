
	/* ----------------------------------------------------------
	 * 7. Toast & Dialog (safe UI)
	 * ---------------------------------------------------------- */
	class Toast {
		[key: string]: any;
		static show(msg: string, ms = 2000) {
			const el = Object.assign(document.createElement('div'), { className: 'tm-toast' });
			el.setAttribute('aria-live', 'polite');
			el.textContent = msg;
			document.body.appendChild(el);
			requestAnimationFrame(() => {
				el.style.opacity = '1';
			});
			setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, ms);
		}
	}

	class Dialog {
		[key: string]: any;
		static _instances = new Set<any>();
		// Promise resolves with `value` passed to close()
		static show({
			title = '',
			body = null,
			buttons = [],
			onBeforeClose = null,
			onRefresh = null
		}: {
			title?: string;
			body?: Node | string | null;
			buttons?: DialogButton[];
			onBeforeClose?: ((value: any, dialog: HTMLElement) => any) | null;
			onRefresh?: ((ctx: DialogRefreshContext) => void) | null;
		}) {
			return new Promise<any>(resolve => {
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
					content.appendChild(makePlainTextNode(body));
				}

				const footer = document.createElement('footer');
				const renderedButtons: HTMLButtonElement[] = [];
				const refreshContext = {
					dialog,
					header,
					content,
					footer,
					buttons: renderedButtons,
					setTitle: (nextTitle: string) => {
						header.textContent = nextTitle;
						dialog.setAttribute('aria-label', nextTitle);
					},
					setBody: (nextBody: Node | string) => {
						content.replaceChildren();
						if (nextBody instanceof Node) content.appendChild(nextBody);
						else content.appendChild(makePlainTextNode(nextBody));
					}
				};
				const close = (val: any) => {
					try { if (onBeforeClose) val = onBeforeClose(val, dialog); } catch { }
					if (val && typeof val === 'object' && val.ok === false) return;
					backdrop.remove(); document.removeEventListener('keydown', onKey);
					Dialog._instances.delete(instance);
					resolve(val);
				};

				buttons.forEach(btn => {
					const b = Object.assign(document.createElement('button'), {
						textContent: btn.label,
						className: btn.primary ? 'primary' : 'secondary'
					});
					b.addEventListener('click', () => close(btn.value));
					renderedButtons.push(b);
					footer.appendChild(b);
				});

				dialog.append(header, content, footer);
				backdrop.appendChild(dialog);
				document.body.appendChild(backdrop);

				// Focus trap
				const onKey = (e: KeyboardEvent) => {
					if (e.key === 'Escape') { e.preventDefault(); close(false); }
					else if (e.key === 'Enter') {
						const target = e.target as (EventTarget & { tagName?: string; isContentEditable?: boolean }) | null;
						if (target && (
							['TEXTAREA', 'INPUT', 'SELECT'].includes(target.tagName || '') ||
							target.isContentEditable
						)) return;
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

				const instance = { refresh: () => onRefresh?.(refreshContext) };
				Dialog._instances.add(instance);
				if (onRefresh) onRefresh(refreshContext);
				dialog.querySelector('button')?.focus();
			});
		}
		static refreshAll() {
			for (const instance of Array.from(Dialog._instances)) {
				try { instance.refresh?.(); } catch { }
			}
		}
	}

