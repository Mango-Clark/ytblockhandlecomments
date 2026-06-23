	/* ----------------------------------------------------------
	 * 9. CommentHider (scoped refresh + cached metadata)
	 * ---------------------------------------------------------- */
	class CommentHider {
		constructor(storage, pairStore, settings) {
			this.storage = storage;
			this.pairStore = pairStore;
			this.settings = settings;
			this._idSet = new Set();
			this._handleSet = new Set();
			this._regexes = [];
			this._metaCache = new WeakMap();
			this._autoDisliked = new WeakSet();
			this._observed = new Set();
			this._pending = false;
			this._pendingRoot = null;
			this._pendingFrame = null;
			this._io = null;
			this._metrics = {
				mutationBatches: 0,
				fullRefreshes: 0,
				incrementalRefreshes: 0,
				scannedNodes: 0,
				autoAddedRegexHandles: 0,
				lastDurationMs: 0,
				totalDurationMs: 0
			};
			this.rebuildLookup();
			try { window.__ytCommentBlockerPerf = this._metrics; } catch { }
		}
		rebuildLookup() {
			this._idSet.clear(); this._handleSet.clear(); this._regexes = [];
			const useUidDetection = this.pairStore.isUidDetectionEnabled();
			const caseSensitive = this.settings?.isHandleCaseSensitive?.() || false;
			for (const it of this.storage.all()) {
				if (it.type === 'id') {
					if (useUidDetection) this._idSet.add(it.value);
				}
				else if (it.type === 'handle') {
					const key = getHandleCompareKey(it.value, caseSensitive);
					if (key) this._handleSet.add(key);
				}
				else if (it.type === 'regex') {
					const spec = validateRegexSpec(it.value, it.flags || '');
					if (spec) this._regexes.push(new RegExp(spec.pattern, spec.flags));
				}
			}
		}
		_autoAddRegexHandle(handle, handleKey) {
			if (!this.settings?.isAutoAddRegexHandlesEnabled?.() || !handle || !handleKey) return;
			if (this._handleSet.has(handleKey)) return;
			if (this.storage.addHandle(handle)) {
				this._handleSet.add(handleKey);
				this._metrics.autoAddedRegexHandles += 1;
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
			const handleKey = getHandleCompareKey(h, this.settings?.isHandleCaseSensitive?.() || false);
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
		_getDislikeButton(node) {
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
		_isDislikeActive(button) {
			return button?.getAttribute?.('aria-pressed') === 'true';
		}
		_autoDislikeBeforeHide(node) {
			if (!node || this._autoDisliked.has(node)) return;
			const button = this._getDislikeButton(node);
			if (!button || button.disabled) return;
			this._autoDisliked.add(node);
			if (this._isDislikeActive(button)) return;
			button.click?.();
		}
		applyHide(node) {
			if (!node) return;
			const shouldHide = this._matches(node);
			if (shouldHide && !node.classList.contains('tm-hidden')) this._autoDislikeBeforeHide(node);
			node.classList.toggle('tm-hidden', shouldHide);
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
			this._observed = new Set();
		}
		resetTransientState() {
			if (this._pendingFrame !== null) {
				cancelAnimationFrame(this._pendingFrame);
				this._pendingFrame = null;
			}
			this.resetObservation();
			this._metaCache = new WeakMap();
			this._autoDisliked = new WeakSet();
			this._pending = false;
			this._pendingRoot = null;
		}
		_observeNode(node) {
			if (!node || this._observed.has(node)) return;
			this._observed.add(node);
			this._connectIO().observe(node);
		}
		unobserveNodes(nodes) {
			if (!this._io) return;
			for (const node of nodes || []) {
				if (!this._observed.delete(node)) continue;
				this._io.unobserve(node);
			}
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
			this._pendingFrame = requestAnimationFrame(() => {
				const nextRoot = this._pendingRoot || this._getDefaultRoot();
				this._pending = false;
				this._pendingFrame = null;
				this._pendingRoot = null;
				if (nextRoot) this.doRefresh(nextRoot);
			});
		}
	}

