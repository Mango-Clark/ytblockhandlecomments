
	/* ----------------------------------------------------------
	 * 8. App Orchestrator (events, observers, cross-tab sync)
	 * ---------------------------------------------------------- */
	class App {
		[key: string]: any;
		constructor() {
			this.settings = new AppSettingsStorage();
			this.storage = new StorageV2(this.settings);
			this.pairStore = new PairMetaStorage(this.settings);
			this.apiConfig = new ApiConfigStorage();
			this.pairService = new PairService(this.storage, this.pairStore, this.apiConfig, this.settings);
			this.hider = new CommentHider(this.storage, this.pairStore, this.settings);
			this.menu = new MenuEnhancer(this);
			this.manager = new BlockListManager(this);
			this._menuCommandIds = [];
			this._lastPairRunResult = null;
			this._commentsHost = null;
			this._commentObserver = null;
			this._hostObserver = null;
			this._pageSyncPending = false;
			this._pageKey = null;
			this._pairBanner = null;
			this._bindGlobalEvents();
			this._bindNavigationEvents();
			this._syncAcrossTabs();
			this._registerMenu();
			this._schedulePageSync();
		}

		findHandleRule(handle: any) {
			return findHandleItem(this.storage.all(), handle, this.settings.isHandleCaseSensitive());
		}

		hasHandleRule(handle: any) {
			return !!this.findHandleRule(handle);
		}

		addHandleRule(handle: any) {
			const ok = this.storage.addHandle(handle);
			if (ok) this.refreshAfterStorageChange();
			return ok;
		}

		removeHandleRule(handle: any) {
			const item = this.findHandleRule(handle);
			if (!item) return false;
			this.removeEntry(item);
			return true;
		}

		removeEntry(item: BlockItem) {
			if (item.type === 'handle') this.pairService.removeHandleArtifacts(item.value);
			this.storage.remove(item);
			this.refreshAfterStorageChange();
		}

		removeEntries(items: BlockItem[]) {
			const selectedItems = (items || []).filter(Boolean);
			if (!selectedItems.length) return;
			const removeKeys = new Set(selectedItems.map(getItemKey).filter(Boolean));
			const handles = selectedItems.filter(item => item.type === 'handle').map(item => item.value);
			const artifactIds = this.pairService.collectHandleArtifactIds(handles);
			this.pairService.removeHandlePairs(handles);
			this.storage.setAll(this.storage.all().filter((item: BlockItem) => {
				if (removeKeys.has(getItemKey(item))) return false;
				return item.type !== 'id' || !artifactIds.has(item.value);
			}));
			this.refreshAfterStorageChange();
		}

		clearAllEntries() {
			this.storage.clear();
			this.pairService.clearPairArtifacts();
			this.refreshAfterStorageChange();
		}

		refreshAfterStorageChange() {
			this.hider.rebuildLookup();
			const mode = this._getPageMode();
			const host = this._commentsHost?.isConnected ? this._commentsHost : this._findCommentsHost(mode);
			this.hider.refreshScheduled(host || undefined);
			this._syncPairBanner();
			Dialog.refreshAll();
		}

		refreshLanguageUi() {
			this._registerMenu();
			this._syncPairBanner();
			Dialog.refreshAll();
		}

		getLastPairRunResult() {
			return this._lastPairRunResult;
		}

		showPairResultDialog(stats: PairRunStats) {
			this.manager._showPairResultDialog(stats);
		}

		async testApiKey() {
			const result = await this.pairService.testApiKey();
			this.apiConfig.setLastTestResult(result);
			this.refreshAfterStorageChange();
			return result;
		}

		async runPairUpdate(mode = 'update', handles: string[] | null = null) {
			const stats = mode === 'create'
				? (handles ? await this.pairService.createPairsForHandles(handles) : await this.pairService.createMissingPairs())
				: (handles ? await this.pairService.updatePairsForHandles(handles) : await this.pairService.updatePairs({ includeMissing: true }));
			this._lastPairRunResult = stats;
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
					const m = href && /^\/@([^/?#]+)/.exec(href);
					if (m) hText = '@' + decodeMaybe(m[1]);
				}
				const handle = sanitizeHandle(hText);
				if (!handle) return;
				const isBlocked = this.hasHandleRule(handle);

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
					buttons: [{ label: t('close'), value: false }, { label: isBlocked ? t('unblock') : t('block'), value: true, primary: true }],
					onRefresh: (ctx: DialogRefreshContext) => {
						ctx.setTitle(isBlocked ? t('unblock') : t('block'));
						const paragraph = ctx.content.querySelector('p');
						if (paragraph) paragraph.textContent = isBlocked ? t('confirmUnblock') : t('confirmBlock');
						ctx.buttons[0].textContent = t('close');
						ctx.buttons[1].textContent = isBlocked ? t('unblock') : t('block');
					}
				}).then(ok => {
					if (!ok) return;
					if (isBlocked) {
						this.removeHandleRule(handle);
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

		_getPageMode() {
			const path = location.pathname || '';
			if (path === '/watch') return 'watch';
			if (/^\/shorts\/[^/]+/.test(path)) return 'shorts';
			return 'unsupported';
		}

		_getPageKey(mode: string) {
			if (mode === 'watch') {
				const videoId = new URLSearchParams(location.search || '').get('v') || '';
				return `watch:${videoId}`;
			}
			if (mode === 'shorts') {
				const match = /^\/shorts\/([^/?#]+)/.exec(location.pathname || '');
				return `shorts:${match?.[1] || ''}`;
			}
			return `unsupported:${location.pathname || ''}`;
		}

		_getPageRoot(mode: string): Element | null {
			if (mode === 'watch') return document.querySelector(WATCH_ROOT_SELECTOR) || document.body;
			if (mode === 'shorts') return document.querySelector(SHORTS_ROOT_SELECTOR) || document.body;
			return null;
		}

		_findCommentsHost(mode: string): Element | null {
			if (mode === 'watch') return document.querySelector(COMMENTS_HOST_SELECTOR);
			if (mode === 'shorts') return this._findShortsCommentsHost();
			return null;
		}

		_getAncestorChain(node: Element | null | undefined): Element[] {
			const chain: Element[] = [];
			let current = node;
			while (current?.nodeType === 1) {
				chain.push(current);
				current = current.parentElement;
			}
			return chain;
		}

		_findLowestSharedAncestor(nodes: Element[]) {
			const items = (nodes || []).filter(node => node?.nodeType === 1);
			if (!items.length) return null;
			const firstChain = this._getAncestorChain(items[0]);
			for (const candidate of firstChain) {
				if (items.every(node => candidate === node || candidate.contains?.(node))) return candidate;
			}
			return null;
		}

		_isBroadCommentsHost(node: Element | null | undefined) {
			if (!node || node.nodeType !== 1) return true;
			const tag = (node.tagName || '').toLowerCase();
			return node === document.body || node === document.documentElement || tag === 'ytd-app';
		}

		_refineSharedCommentsHost(ancestor: Element | null, commentRoots: Element[]) {
			let current = ancestor;
			const roots = (commentRoots || []).filter(node => node?.nodeType === 1);
			if (!current || !roots.length) return null;
			while (current && this._isBroadCommentsHost(current)) {
				const nextCandidates = new Set();
				for (const root of roots) {
					let cursor = root;
					while (cursor?.parentElement && cursor.parentElement !== current) {
						cursor = cursor.parentElement;
					}
					if (!cursor || cursor.parentElement !== current) return null;
					nextCandidates.add(cursor);
					if (nextCandidates.size > 1) return null;
				}
				current = (nextCandidates.values().next().value as Element | undefined) || null;
			}
			return current && !this._isBroadCommentsHost(current) ? current : null;
		}

		_findShortsCommentsHost() {
			const commentNodes = Array.from(document.querySelectorAll(COMMENT_SELECTOR))
				.filter(node => node?.isConnected);
			if (!commentNodes.length) return null;
			const commentRoots = commentNodes
				.map(node => Extractor.getCommentRoot(node) || node)
				.filter(node => node?.nodeType === 1);
			if (!commentRoots.length) return null;
			if (commentRoots.length === 1) {
				const host = commentRoots[0];
				return this._isBroadCommentsHost(host) ? null : host;
			}
			const sharedAncestor = this._findLowestSharedAncestor(commentRoots);
			if (!sharedAncestor) return null;
			return this._refineSharedCommentsHost(sharedAncestor, commentRoots);
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

		_watchForCommentsHost(mode: string, root: Element | null) {
			if (this._hostObserver || mode === 'unsupported') return;
			if (!root) return;
			let hostLookupPending = false;
			let observer: MutationObserver | null = null;
			observer = new MutationObserver(() => {
				if (hostLookupPending) return;
				hostLookupPending = true;
				requestAnimationFrame(() => {
					hostLookupPending = false;
					if (this._hostObserver !== observer) return;
					const currentMode = this._getPageMode();
					if (currentMode !== mode) {
						this._disconnectHostObserver();
						return;
					}
					const host = this._findCommentsHost(currentMode);
					if (host) this._attachCommentsHost(host);
				});
			});
			this._hostObserver = observer;
			observer.observe(root, { childList: true, subtree: true });
		}

		_collectRefreshRoots(node: any, roots: Set<Element>) {
			if (node?.nodeType !== 1) return;
			if (node.matches?.(COMMENT_SELECTOR)) roots.add(node);
			const currentRoot = Extractor.getCommentRoot(node);
			if (currentRoot) roots.add(currentRoot);
			node.querySelectorAll?.(COMMENT_SELECTOR).forEach((commentNode: Element) => roots.add(commentNode));
		}

		_handleCommentMutations(muts: MutationRecord[]) {
			const roots = new Set<Element>();
			const removedRoots = new Set<Element>();
			for (const m of muts) {
				if (m.addedNodes?.length) {
					const targetRoot = Extractor.getCommentRoot(m.target);
					if (targetRoot) roots.add(targetRoot);
					for (const node of m.addedNodes) this._collectRefreshRoots(node, roots);
				}
				for (const node of m.removedNodes || []) this._collectRefreshRoots(node, removedRoots);
			}
			this.hider.unobserveNodes(removedRoots);
			if (!roots.size) return;
			this.hider.noteMutationBatch();
			this.hider.refreshNodes(roots, { invalidate: true });
		}

		_attachCommentsHost(host: Element | null) {
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
			const mode = this._getPageMode();
			const pageKey = this._getPageKey(mode);
			if (this._pageKey !== pageKey) {
				this._pageKey = pageKey;
				this.hider.resetTransientState();
			}
			if (mode === 'unsupported') {
				this._disconnectHostObserver();
				this._disconnectCommentObserver();
				this._syncPairBanner();
				return;
			}
			const host = this._findCommentsHost(mode);
			if (host) this._attachCommentsHost(host);
			else {
				this._disconnectCommentObserver();
				this._watchForCommentsHost(mode, this._getPageRoot(mode));
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
				GM_addValueChangeListener('app_settings_v1', (_k, _old, val, remote) => {
					if (!remote) return;
					this.settings.setAllLocal(val);
					this.refreshAfterStorageChange();
				});
				GM_addValueChangeListener('lang', (_k, _old, _val, remote) => {
					if (!remote) return;
					this.refreshLanguageUi();
				});
			}
		}

		_syncPairBanner() {
			if (this._getPageMode() !== 'watch' || !this.pairService.shouldNotify()) {
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
					className: 'primary'
				});
				updateBtn.dataset.role = 'update';
				const laterBtn = Object.assign(document.createElement('button'), {
					className: 'secondary'
				});
				laterBtn.dataset.role = 'later';
				updateBtn.addEventListener('click', async () => {
					updateBtn.disabled = true;
					laterBtn.disabled = true;
					updateBtn.textContent = t('pairWorking');
					const stats = await this.runPairUpdate('update');
					Toast.show(t('pairResult', stats), 3200);
					this.showPairResultDialog(stats);
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
			this._pairBanner.querySelector('[data-role="update"]').textContent = t('updateNow');
			this._pairBanner.querySelector('[data-role="later"]').textContent = t('later');
		}

		_registerMenu() {
			try {
				if (typeof GM_unregisterMenuCommand === 'function') {
					for (const id of this._menuCommandIds.splice(0)) {
						try { GM_unregisterMenuCommand(id); } catch { }
					}
				}
				const manageId = GM_registerMenuCommand(t('menuManage') || 'Manage', () => this.manager.openList());
				const settingsId = GM_registerMenuCommand(t('menuSettings') || 'Settings', () => this.manager.openSettings());
				const clearId = GM_registerMenuCommand(t('menuClear') || 'Clear', () => {
					Dialog.show({
						title: t('clear') || 'Reset',
						body: (() => { const p = document.createElement('p'); p.textContent = t('confirmClear') || 'Reset all blocked entries?'; return p; })(),
						buttons: [{ label: t('close') || 'Close', value: false }, { label: t('clear') || 'Reset', value: true, primary: true }],
						onRefresh: (ctx: DialogRefreshContext) => {
							ctx.setTitle(t('clear') || 'Reset');
							if (ctx.content.firstChild) ctx.content.firstChild.textContent = t('confirmClear') || 'Reset all blocked entries?';
							ctx.buttons[0].textContent = t('close') || 'Close';
							ctx.buttons[1].textContent = t('clear') || 'Reset';
						}
					}).then(ok => {
						if (!ok) return;
						this.clearAllEntries();
						Toast.show(t('clear') || 'Reset');
					});
				});
				const langId = GM_registerMenuCommand('🌐 Language: ' + getLang().toUpperCase(), () => {
					const next = getLang() === 'ko' ? 'en' : 'ko';
					try { GM_setValue('lang', next); } catch { }
					Toast.show('Lang: ' + next.toUpperCase());
					this.refreshLanguageUi();
				});
				this._menuCommandIds = [manageId, settingsId, clearId, langId].filter(Boolean);
			} catch { /* Tampermonkey menu may be unavailable in some envs */ }
		}
	}

