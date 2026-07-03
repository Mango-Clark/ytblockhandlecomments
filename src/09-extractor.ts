	/* ----------------------------------------------------------
	 * 8. Handle extractor (robust to DOM changes)
	 * ---------------------------------------------------------- */
	class Extractor {
		// Try multiple routes to get "@handle" from a comment root
		static getHandle(root) {
			if (!root) return null;

			// 1) '#author-text > span' or '#author-handle'
			const span = root.querySelector('#author-text > span, #author-handle');
			const t = span?.textContent?.trim();
			if (t?.startsWith('@')) return sanitizeHandle(t);

			// 2) anchor with href '/@handle'
			const a = root.querySelector('a[href^="/@"]');
			if (a?.getAttribute) {
				const href = a.getAttribute('href') || '';
				const m = /^\/@([^/?#]+)/.exec(href);
				if (m) return sanitizeHandle('@' + decodeMaybe(m[1]));
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

