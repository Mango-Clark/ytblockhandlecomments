'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUserscript } = require('./helpers/load-userscript.ts');

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
