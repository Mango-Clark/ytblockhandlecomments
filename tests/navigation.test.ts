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
