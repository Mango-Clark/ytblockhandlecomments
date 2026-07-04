import {
	decodeMaybe,
	sanitizeHandle
} from './02-utils-i18n.ts';

	/* ----------------------------------------------------------
	 * 8. Handle extractor (robust to DOM changes)
	 * ---------------------------------------------------------- */
	export class Extractor {
		[key: string]: any;
		// Try multiple routes to get "@handle" from a comment root
		static getHandle(root: Element | null | undefined): string | null {
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

		static getChannelId(root: Element | null | undefined): string | null {
			if (!root) return null;
			const a = root.querySelector('a[href*="/channel/UC"]');
			const href = a?.getAttribute?.('href') || '';
			const m = /\/channel\/(UC[0-9A-Za-z_-]+)/.exec(href);
			if (m) return m[1];
			return null;
		}

		static getCommentRoot(node: any): Element | null {
			return node?.closest?.('ytd-comment-thread-renderer, ytd-comment-renderer, ytd-comment-view-model') || null;
		}
	}

