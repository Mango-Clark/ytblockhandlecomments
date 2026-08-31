import './01-global-styles.ts';
import {
	buildManagerSearchIndex,
	exportRegexLiteral,
	getScriptVersion,
	parseRegexLiteral,
	safeRegexTest,
	searchManagerIndex,
	t,
	validateRegexSpec
} from './02-utils-i18n.ts';
import { AppSettingsStorage } from './03-app-settings-storage.ts';
import { StorageV2 } from './04-storage-v2.ts';
import { PairMetaStorage } from './05-pair-meta-storage.ts';
import { ApiConfigStorage } from './06-api-config-storage.ts';
import { PairService } from './07-pair-service.ts';
import { CommentHider } from './10-comment-hider.ts';
import { MenuEnhancer } from './11-menu-enhancer.ts';
import { Dialog, Toast } from './08-toast-dialog.ts';
import { BlockListManager } from './12-block-list-manager.ts';
import { App } from './13-app.ts';
import { Logger } from './15-logger.ts';

const TEST_HOOK = typeof window === 'object' ? window.__YT_BLOCK_TEST_HOOK__ || null : null;

	/* ----------------------------------------------------------
	 * 9. Bootstrap
	 * ---------------------------------------------------------- */
	if (TEST_HOOK && typeof TEST_HOOK === 'object') {
		Object.assign(TEST_HOOK, {
			AppSettingsStorage,
			StorageV2,
			PairMetaStorage,
			ApiConfigStorage,
			PairService,
			CommentHider,
			MenuEnhancer,
			Dialog,
			Toast,
			BlockListManager,
			App,
			Logger,
			t,
			validateRegexSpec,
			parseRegexLiteral,
			exportRegexLiteral,
			safeRegexTest,
			buildManagerSearchIndex,
			searchManagerIndex,
			getScriptVersion
		});
	}
	const BOOT_STATE_KEY = '__ytCommentBlockerBootStateV1';
	const bootWindow = window as any;
	if (!TEST_HOOK?.skipBootstrap && !bootWindow[BOOT_STATE_KEY]) {
		bootWindow[BOOT_STATE_KEY] = 'pending';
		// Defer a tick to allow YT initial paint, then start
		requestAnimationFrame(() => {
			try { bootWindow[BOOT_STATE_KEY] = new App(); }
			catch (error) {
				delete bootWindow[BOOT_STATE_KEY];
				throw error;
			}
		});
	}
