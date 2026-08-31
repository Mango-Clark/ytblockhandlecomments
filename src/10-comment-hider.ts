import {
	COMMENTS_HOST_SELECTOR,
	HIDEABLE_COMMENT_SELECTOR,
	getHandleCompareKey,
	safeRegexTest,
	t,
	validateRegexSpec,
	type CommentBlockMode,
	type PairStoreLike,
	type SettingsLike,
	type StorageLike
} from './02-utils-i18n.ts';
import { Extractor } from './09-extractor.ts';

	/* ----------------------------------------------------------
	 * 9. CommentHider (scoped refresh + cached metadata)
	 * ---------------------------------------------------------- */
	export class CommentHider {
		[key: string]: any;
		constructor(storage: StorageLike, pairStore: PairStoreLike, settings: SettingsLike, onKeywordMatch: any = null) {
			this.storage = storage;
			this.pairStore = pairStore;
			this.settings = settings;
			this.onKeywordMatch = onKeywordMatch;
			this._idSet = new Set();
			this._handleSet = new Set();
			this._regexes = [];
			this._metaCache = new WeakMap();
			this._autoDisliked = new WeakSet();
			this._keywordHandled = new WeakSet();
			this._nodeIdentities = new WeakMap();
			this._blockIdentities = new WeakMap();
			this._observed = new Set();
			this._visible = new WeakSet();
			this._pending = false;
			this._pendingRoot = null;
			this._pendingFrame = null;
			this._io = null;
			this._metrics = {
				mutationBatches: 0,
				fullRefreshes: 0,
				incrementalRefreshes: 0,
				scannedNodes: 0,
				missingChannelIds: 0,
				missingHandles: 0,
				lastDiagnostic: '',
				autoAddedRegexHandles: 0,
				lastDurationMs: 0,
				totalDurationMs: 0
			};
			this.rebuildLookup();
			try { window.__ytCommentBlockerPerf = this._metrics; } catch { }
		}
		rebuildLookup() {
			this._settingsRevision = this.settings?._revision;
			this._idSet.clear(); this._handleSet.clear(); this._regexes = [];
			const blockMatchMode = this.settings?.getBlockMatchMode?.() || 'handle';
			this._blockMatchMode = blockMatchMode;
			const useUidDetection = blockMatchMode === 'pair' && this.pairStore.isUidDetectionEnabled();
			const useHandleMatching = blockMatchMode === 'handle';
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			this._caseSensitive = caseSensitive;
			this._autoAddRegexHandlesEnabled = !!this.settings?.isAutoAddRegexHandlesEnabled?.();
			this._dislikeMode = this.settings?.getDislikeMode?.() || 'none';
			this._commentBlockMode = this.settings?.getCommentBlockMode?.() || 'hide';
			const keywordConfig = this.settings?.getKeywordAutomation?.() || {};
			this._keywordConfig = {
				enabled: this.settings?.isKeywordAutomationEnabled?.() !== false,
				keywords: (keywordConfig.keywords || []).map((keyword: any) => ({ raw: keyword, normalized: String(keyword).toLocaleLowerCase() })),
				fields: keywordConfig.fields || {},
				actions: keywordConfig.actions || {}
			};
			for (const it of this.storage.all()) {
				if (it.type === 'id') {
					if (useUidDetection) this._idSet.add(it.value);
				}
				else if (it.type === 'handle') {
					if (!useHandleMatching) continue;
					const key = getHandleCompareKey(it.value, caseSensitive);
					if (key) this._handleSet.add(key);
				}
				else if (it.type === 'regex') {
					const spec = validateRegexSpec(it.value, it.flags || '');
					if (spec) this._regexes.push(new RegExp(spec.pattern, spec.flags));
				}
			}
		}
		_autoAddRegexHandle(handle: string | null, handleKey: string | null) {
			if (!this._autoAddRegexHandlesEnabled || !handle || !handleKey) return;
			if (this._handleSet.has(handleKey)) return;
			if (this.storage.addHandle(handle)) {
				this._handleSet.add(handleKey);
				this._metrics.autoAddedRegexHandles += 1;
			}
		}
		_getKeywordMatch(node: Element, meta: any) {
			const config = this._keywordConfig;
			if (!config?.enabled) return null;
			const keywords = config.keywords || [];
			if (!keywords.length) return null;
			const fields = config?.fields || {};
			const targets: Array<{ field: string; value: string }> = [];
			if (fields.commentText) {
				const text = node.querySelector?.('#content-text, #content-text > yt-attributed-string, ytd-expander #content')?.textContent?.trim();
				if (text) targets.push({ field: 'commentText', value: text });
			}
			if (fields.handle && meta.handle) targets.push({ field: 'handle', value: meta.handle });
			if (fields.pinned) {
				const text = node.querySelector?.('#pinned-comment-badge, ytd-pinned-comment-badge-renderer, [aria-label*="Pinned"], [aria-label*="pinned"], [aria-label*="고정"]')?.textContent?.trim();
				if (text) targets.push({ field: 'pinned', value: text });
			}
			for (const target of targets) {
				const normalized = target.value.toLocaleLowerCase();
				for (const keyword of keywords) {
					if (normalized.includes(keyword.normalized)) {
						return { keyword: keyword.raw, field: target.field };
					}
				}
			}
			return null;
		}
		_applyKeywordAutomation(node: Element, meta: any) {
			if (this._keywordHandled.has(node)) return;
			const match = this._getKeywordMatch(node, meta);
			if (!match) return;
			const actions = this._keywordConfig?.actions || {};
			if (!actions.dislike && !actions.blockHandle && !actions.createPair) return;
			this._keywordHandled.add(node);
			if (actions.dislike) this._autoDislikeBeforeHide(node);
			if ((actions.blockHandle || actions.createPair) && meta.handle) {
				this.onKeywordMatch?.({ ...match, handle: meta.handle, actions: { ...actions } });
			}
		}
		_getDefaultRoot() {
			return document.querySelector(COMMENTS_HOST_SELECTOR);
		}
		_collectCommentNodes(root: Element | null | undefined): Element[] {
			if (!root) return [];
			if (root.matches?.(HIDEABLE_COMMENT_SELECTOR)) return [root];
			if (!root.querySelectorAll) return [];
			return Array.from(root.querySelectorAll(HIDEABLE_COMMENT_SELECTOR));
		}
		_mergeRoots(a: Element | null, b: Element | null): Element | null {
			if (!a) return b;
			if (!b || a === b) return a;
			if (a.contains?.(b)) return a;
			if (b.contains?.(a)) return b;
			return this._getDefaultRoot() || b;
		}
		_getMeta(node: Element) {
			const cached = this._metaCache.get(node);
			if (cached) return cached;
			const meta = {
				id: Extractor.getChannelId(node),
				handle: Extractor.getHandle(node)
			};
			this._metaCache.set(node, meta);
			if (!meta.handle) this._metrics.missingHandles += 1;
			return meta;
		}
		_syncNodeIdentity(node: Element) {
			const meta = { id: Extractor.getChannelId(node), handle: Extractor.getHandle(node) };
			const content = node.querySelector?.('#content-text, #content-text > yt-attributed-string, ytd-expander #content')?.textContent?.trim() || '';
			const pinned = node.querySelector?.('#pinned-comment-badge, ytd-pinned-comment-badge-renderer, [aria-label*="Pinned"], [aria-label*="pinned"], [aria-label*="고정"]')?.textContent?.trim() || '';
			const identity = JSON.stringify([meta.id || '', meta.handle || '', content, pinned]);
			if (this._nodeIdentities.get(node) === identity) return { identity, meta };
			this._nodeIdentities.set(node, identity);
			this._metaCache.set(node, meta);
			this._autoDisliked.delete(node);
			this._keywordHandled.delete(node);
			this._blockIdentities.delete(node);
			if (!meta.id && meta.handle && this._blockMatchMode === 'pair') this._metrics.missingChannelIds += 1;
			return { identity, meta };
		}
		invalidateNode(node: Element | null | undefined) {
			if (!node) return;
			this._metaCache.delete(node);
		}
		_matches(node: Element): boolean {
			const meta = this._getMeta(node);
			if (meta.id && this._idSet.has(meta.id)) return true;
			const h = meta.handle;
			const handleKey = getHandleCompareKey(h, this._caseSensitive);
			if (handleKey && this._handleSet.has(handleKey)) return true;
			if (h) {
				for (const rx of this._regexes) {
					if (safeRegexTest(rx, h)) {
						this._autoAddRegexHandle(h, handleKey);
						return true;
					}
				}
			}
			return false;
		}
		_getDislikeButton(node: Element): any {
			const selectors = [
				'ytd-toggle-button-renderer#dislike-button button',
				'#dislike-button button',
				'button[aria-label*="Dislike"]',
				'button[aria-label*="dislike"]',
				'button[aria-label*="싫어요"]'
			];
			for (const selector of selectors) {
				const button = node.querySelector?.(selector);
				if (button) return button;
			}
			return null;
		}
		_isDislikeActive(button: any): boolean {
			return button?.getAttribute?.('aria-pressed') === 'true';
		}
		_autoDislikeBeforeHide(node: Element) {
			if (!node || this._autoDisliked.has(node)) return;
			const button = this._getDislikeButton(node);
			if (!button || button.disabled) return;
			this._autoDisliked.add(node);
			if (this._isDislikeActive(button)) return;
			button.click?.();
		}
		_findBlockPlaceholder(node: Element): any {
			return Array.from(node.children || []).find(child => child.classList?.contains('tm-block-placeholder')) || null;
		}
		_getBlockPlaceholder(node: Element, mode: CommentBlockMode): any {
			let placeholder = this._findBlockPlaceholder(node);
			if (!placeholder) {
				placeholder = document.createElement(mode === 'placeholder-reveal' ? 'button' : 'div');
				placeholder.className = 'tm-block-placeholder';
				if (mode === 'placeholder-reveal') placeholder.type = 'button';
				node.appendChild(placeholder);
			}
			if (mode === 'placeholder-reveal' && placeholder.tagName?.toLowerCase() !== 'button') {
				placeholder.remove();
				placeholder = document.createElement('button');
				placeholder.type = 'button';
				placeholder.className = 'tm-block-placeholder';
				node.appendChild(placeholder);
			} else if (mode !== 'placeholder-reveal' && placeholder.tagName?.toLowerCase() === 'button') {
				placeholder.remove();
				placeholder = document.createElement('div');
				placeholder.className = 'tm-block-placeholder';
				node.appendChild(placeholder);
			}
			const placeholderText = mode === 'placeholder-reveal' ? t('blockedCommentReveal') : t('blockedCommentPlaceholder');
			if (placeholder.textContent !== placeholderText) placeholder.textContent = placeholderText;
			if (mode === 'placeholder-reveal' && !placeholder.__tmRevealBound) {
				placeholder.__tmRevealBound = true;
				placeholder.addEventListener('click', () => {
					node.classList.toggle('tm-block-revealed');
				});
			}
			return placeholder;
		}
		_applyBlockMode(node: Element, shouldHide: boolean) {
			if (!shouldHide) {
				node.classList.remove('tm-hidden', 'tm-block-placeholder-mode', 'tm-block-revealed');
				this._findBlockPlaceholder(node)?.remove();
				return;
			}
			const blockMode = this._commentBlockMode;
			if (blockMode === 'hide') {
				node.classList.add('tm-hidden');
				node.classList.remove('tm-block-placeholder-mode', 'tm-block-revealed');
				this._findBlockPlaceholder(node)?.remove();
				return;
			}
			node.classList.remove('tm-hidden');
			node.classList.add('tm-block-placeholder-mode');
			if (blockMode !== 'placeholder-reveal') node.classList.remove('tm-block-revealed');
			this._getBlockPlaceholder(node, blockMode);
		}
		applyHide(node: Element | null | undefined) {
			if (!node) return;
			if (this._settingsRevision !== this.settings?._revision) this.rebuildLookup();
			const { identity, meta } = this._syncNodeIdentity(node);
			this._applyKeywordAutomation(node, meta);
			const shouldHide = this._matches(node);
			const dislikeMode = this._dislikeMode;
			const alreadyBlocked = this._blockIdentities.get(node) === identity && (node.classList.contains('tm-hidden') || node.classList.contains('tm-block-placeholder-mode'));
			if (
				shouldHide &&
				dislikeMode !== 'none' &&
				(dislikeMode === 'always' || !alreadyBlocked)
			) {
				this._autoDislikeBeforeHide(node);
			}
			this._applyBlockMode(node, shouldHide);
			if (shouldHide) this._blockIdentities.set(node, identity);
			else this._blockIdentities.delete(node);
		}
		_connectIO() {
			if (this._io) return this._io;
			if (typeof IntersectionObserver !== 'function') return null;
			this._io = new IntersectionObserver((entries) => {
				const startedAt = performance.now();
				let applied = 0;
				for (const e of entries) {
					if (!this._observed.has(e.target) || !e.target.parentNode) continue;
					if (!e.isIntersecting) { this._visible.delete(e.target); continue; }
					this._visible.add(e.target);
					this.applyHide(e.target);
					applied += 1;
				}
				if (applied) this._recordRefresh('incrementalRefreshes', applied, startedAt);
			}, { root: null, rootMargin: '0px', threshold: 0 });
			return this._io;
		}
		resetObservation() {
			if (this._io) this._io.disconnect();
			this._io = null;
			this._observed = new Set();
			this._visible = new WeakSet();
		}
		resetTransientState() {
			if (this._pendingFrame !== null) {
				cancelAnimationFrame(this._pendingFrame);
				this._pendingFrame = null;
			}
			this.resetObservation();
			this._metaCache = new WeakMap();
			this._autoDisliked = new WeakSet();
			this._keywordHandled = new WeakSet();
			this._nodeIdentities = new WeakMap();
			this._blockIdentities = new WeakMap();
			this._pending = false;
			this._pendingRoot = null;
		}
		_observeNode(node: Element | null | undefined) {
			if (!node) return false;
			const io = this._connectIO();
			if (!io) { this.applyHide(node); return true; }
			if (!this._observed.has(node)) {
				this._observed.add(node);
				io.observe(node);
			}
			const hasAppliedBlock = node.classList.contains('tm-hidden') || node.classList.contains('tm-block-placeholder-mode');
			if (!this._visible.has(node) && !hasAppliedBlock) return false;
			this.applyHide(node);
			return true;
		}
		unobserveNodes(nodes: Iterable<Element>) {
			if (!this._io) return;
			for (const node of nodes || []) {
				if (!this._observed.delete(node)) continue;
				this._visible.delete(node);
				this._io.unobserve(node);
			}
		}
		_recordRefresh(kind: 'fullRefreshes' | 'incrementalRefreshes', count: number, startedAt: number) {
			this._metrics[kind] += 1;
			this._metrics.scannedNodes += count;
			const duration = Math.round((performance.now() - startedAt) * 100) / 100;
			this._metrics.lastDurationMs = duration;
			this._metrics.totalDurationMs = Math.round((this._metrics.totalDurationMs + duration) * 100) / 100;
		}
		noteMutationBatch() {
			this._metrics.mutationBatches += 1;
		}
		refreshNodes(nodes: Iterable<Element>, { invalidate = true } = {}) {
			const unique = new Set<Element>();
			for (const node of nodes || []) {
				if (!node?.isConnected) continue;
				for (const commentNode of this._collectCommentNodes(node)) unique.add(commentNode);
			}
			if (!unique.size) return;
			const startedAt = performance.now();
			let applied = 0;
			for (const node of unique) {
				if (invalidate) this.invalidateNode(node);
				if (this._observeNode(node)) applied += 1;
			}
			if (applied) this._recordRefresh('incrementalRefreshes', applied, startedAt);
		}
		doRefresh(root: Element | null | undefined) {
			const scope = root || this._getDefaultRoot();
			if (!scope) return;
			const nodes = this._collectCommentNodes(scope);
			if (!nodes.length) return;
			const startedAt = performance.now();
			let applied = 0;
			for (const node of nodes) if (this._observeNode(node)) applied += 1;
			if (applied) this._recordRefresh('fullRefreshes', applied, startedAt);
		}
		refreshScheduled(root: Element | null | undefined) {
			const scope = root || this._getDefaultRoot();
			if (!scope) return;
			this._pendingRoot = this._mergeRoots(this._pendingRoot, scope);
			if (this._pending) return;
			this._pending = true;
			this._pendingFrame = requestAnimationFrame(() => {
				const nextRoot = this._pendingRoot || this._getDefaultRoot();
				this._pending = false;
				this._pendingFrame = null;
				this._pendingRoot = null;
				if (nextRoot) this.doRefresh(nextRoot);
			});
		}
	}

