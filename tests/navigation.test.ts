import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

test('page-key changes reset transient comment observation state', () => {
	const { api } = loadUserscript();
	let resetCalls = 0;
	let watchCalls = 0;
	let bannerCalls = 0;
	const app = Object.create(api.App.prototype);
	Object.assign(app, {
		_pageKey: 'watch:old-video',
		hider: { resetTransientState: () => { resetCalls += 1; } },
		_getPageMode: () => 'watch',
		_getPageKey: () => 'watch:new-video',
		_findCommentsHost: (): null => null,
		_getPageRoot: () => ({ id: 'watch-root' }),
		_watchForCommentsHost: () => { watchCalls += 1; },
		_disconnectCommentObserver: () => {},
		_disconnectHostObserver: () => {},
		_syncPairBanner: () => { bannerCalls += 1; }
	});

	app._syncPageState();

	assert.equal(resetCalls, 1);
	assert.equal(watchCalls, 1);
	assert.equal(bannerCalls, 1);
});

test('unsupported pages disconnect comment observers', () => {
	const { api } = loadUserscript();
	let hostDisconnects = 0;
	let commentDisconnects = 0;
	const app = Object.create(api.App.prototype);
	Object.assign(app, {
		_pageKey: 'watch:anything',
		hider: { resetTransientState: () => {} },
		_getPageMode: () => 'unsupported',
		_getPageKey: () => 'unsupported:/feed/history',
		_disconnectHostObserver: () => { hostDisconnects += 1; },
		_disconnectCommentObserver: () => { commentDisconnects += 1; },
		_syncPairBanner: () => {}
	});

	app._syncPageState();

	assert.equal(hostDisconnects, 1);
	assert.equal(commentDisconnects, 1);
});

test('page diagnostics record only mode and selector reason', () => {
	const { api } = loadUserscript();
	const app = Object.create(api.App.prototype);
	app.hider = { _metrics: {} };
	app.logger = { debug: () => {} };
	app._getPageMode = () => 'watch';
	app._recordDiagnostic('comments-host-missing');
	assert.equal(app.hider._metrics.diagnosticCounts['comments-host-missing'], 1);
	assert.equal(app.hider._metrics.lastDiagnostic, 'watch:comments-host-missing');
});

test('comment host lookup never observes body and stops after bounded retries', () => {
	const { api, document } = loadUserscript();
	const app = Object.create(api.App.prototype);
	Object.assign(app, {
		_hostObserver: null,
		_hostLookupAttempts: 0,
		_getPageMode: () => 'watch',
		_findCommentsHost: () => null,
		_attachCommentsHost: () => {}
	});

	assert.equal(app._getPageRoot('watch'), null);
	const root = document.createElement('ytd-watch-flexy');
	document.body.appendChild(root);
	assert.equal(app._getPageRoot('watch'), root);

	app._watchForCommentsHost('watch', root);
	assert.equal(app._hostObserver.observeCalls[0].target, root);
	for (let index = 0; index < 21; index += 1) app._hostObserver?.trigger();
	assert.equal(app._hostObserver, null);
	assert.equal(app._hostLookupAttempts, 21);
});

test('Shorts comment host uses only the active renderer panel', () => {
	const { api, document } = loadUserscript({ url: 'https://www.youtube.com/shorts/one' });
	const app = Object.create(api.App.prototype);
	const shorts = document.createElement('ytd-shorts');
	const active = document.createElement('ytd-reel-video-renderer');
	active.setAttribute('is-active', '');
	const panel = document.createElement('div');
	const first = document.createElement('ytd-comment-renderer');
	first.isConnected = true;
	panel.appendChild(first);
	active.appendChild(panel);
	shorts.appendChild(active);
	document.body.appendChild(shorts);

	assert.equal(app._findShortsCommentsHost(), panel);

	const sibling = document.createElement('ytd-comment-renderer');
	sibling.isConnected = true;
	panel.appendChild(sibling);
	assert.equal(app._findShortsCommentsHost(), panel);

	panel.removeChild(first);
	first.isConnected = false;
	assert.equal(app._findShortsCommentsHost(), panel);

	panel.removeChild(sibling);
	sibling.isConnected = false;
	assert.equal(app._findShortsCommentsHost(), null);
});

test('Shorts host switches with active renderer without observing the feed', () => {
	const { api, document } = loadUserscript({ url: 'https://www.youtube.com/shorts/one' });
	const app = Object.create(api.App.prototype);
	const feed = document.createElement('ytd-shorts');
	const firstRenderer = document.createElement('ytd-reel-video-renderer');
	const firstPanel = document.createElement('div');
	const firstComment = document.createElement('ytd-comment-renderer');
	firstComment.isConnected = true;
	firstPanel.appendChild(firstComment);
	firstRenderer.appendChild(firstPanel);
	const secondRenderer = document.createElement('ytd-reel-video-renderer');
	const secondPanel = document.createElement('div');
	const secondComment = document.createElement('ytd-comment-renderer');
	secondComment.isConnected = true;
	secondPanel.appendChild(secondComment);
	secondRenderer.appendChild(secondPanel);
	firstRenderer.setAttribute('is-active', '');
	feed.append(firstRenderer, secondRenderer);
	document.body.appendChild(feed);

	assert.equal(app._findShortsCommentsHost(), firstPanel);
	assert.equal(app._getPageRoot('shorts'), firstRenderer);
	firstRenderer.attributes.delete('is-active');
	secondRenderer.setAttribute('is-active', '');
	assert.equal(app._findShortsCommentsHost(), secondPanel);
	assert.equal(app._getPageRoot('shorts'), secondRenderer);
});

test('Shorts panel observer processes sibling additions and removals incrementally', () => {
	const { api, document } = loadUserscript({ url: 'https://www.youtube.com/shorts/one' });
	const app = Object.create(api.App.prototype);
	const panel = document.createElement('div');
	const existing = document.createElement('ytd-comment-renderer');
	panel.appendChild(existing);
	document.body.appendChild(panel);
	let refreshRoots: any[] = [];
	let removedRoots: any[] = [];
	Object.assign(app, {
		_hostObserver: null,
		_commentObserver: null,
		_commentsHost: null,
		hider: {
			resetObservation: () => {},
			refreshScheduled: () => {},
			noteMutationBatch: () => {},
			refreshNodes: (roots: Set<any>) => { refreshRoots = Array.from(roots); },
			unobserveNodes: (roots: Set<any>) => { removedRoots = Array.from(roots); }
		}
	});
	app._attachCommentsHost(panel);
	assert.equal(app._commentObserver.observeCalls[0].target, panel);
	const sibling = document.createElement('ytd-comment-renderer');
	app._commentObserver.trigger([{ target: panel, addedNodes: [sibling], removedNodes: [existing] }]);
	assert.ok(refreshRoots.includes(sibling));
	assert.ok(removedRoots.includes(existing));
});

test('comment identity mutations refresh only their comment root', () => {
	const { api, document } = loadUserscript();
	const app = Object.create(api.App.prototype);
	const host = document.createElement('div');
	const comment = document.createElement('ytd-comment-renderer');
	const author = document.createElement('a');
	const body = document.createElement('div');
	const text = document.createTextNode('before');
	body.appendChild(text);
	comment.append(author, body);
	host.appendChild(comment);
	document.body.appendChild(host);
	let refreshed: any[] = [];
	Object.assign(app, {
		_hostObserver: null,
		_commentObserver: null,
		_commentsHost: null,
		hider: {
			resetObservation: () => {}, refreshScheduled: () => {}, noteMutationBatch: () => {}, unobserveNodes: () => {},
			refreshNodes: (roots: Set<any>) => { refreshed = Array.from(roots); }
		}
	});
	app._attachCommentsHost(host);
	assert.deepEqual(Array.from(app._commentObserver.observeCalls[0].options.attributeFilter), ['href', 'data-channel-id', 'channel-id']);
	for (const record of [
		{ type: 'attributes', target: author, attributeName: 'href' },
		{ type: 'attributes', target: author, attributeName: 'data-channel-id' },
		{ type: 'attributes', target: author, attributeName: 'channel-id' },
		{ type: 'characterData', target: text }
	]) {
		refreshed.length = 0;
		app._commentObserver.trigger([record]);
		assert.deepEqual(refreshed, [comment]);
	}
});

test('page-data and history navigation events schedule page-key synchronization', () => {
	const { api, context, document } = loadUserscript();
	let schedules = 0;
	const app = Object.create(api.App.prototype);
	app._schedulePageSync = () => { schedules += 1; };
	app._bindNavigationEvents();

	document.dispatchEvent({ type: 'yt-page-data-updated' });
	context.history.pushState({}, '', '/watch?v=other');
	context.history.replaceState({}, '', '/shorts/next');

	assert.equal(schedules, 3);
});
