import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

function fakeTimers(context: any) {
	const pending = new Map<number, { callback: () => void; delay: number }>();
	let id = 0;
	context.setTimeout = (callback: () => void, delay: number) => { pending.set(++id, { callback, delay }); return id; };
	context.clearTimeout = (timer: number) => pending.delete(timer);
	return { pending, flush: () => { const jobs = Array.from(pending.values()); pending.clear(); jobs.forEach(job => job.callback()); } };
}

function createApp(size = 0) {
	const loaded = loadUserscript({ deferAnimationFrames: true });
	const app = new loaded.api.App();
	app.storage.setAll(Array.from({ length: size }, (_: unknown, i: number) => ({ type: 'handle', value: `@user${i}` })));
	return { ...loaded, app };
}

test('low mode persists, synchronizes across tabs, resets and rolls back failed saves', () => {
	const { api, app, context, dispatchGMValueChange } = createApp();
	assert.equal(app.settings.isLowPerformanceMode(), false);
	app.settings.setLowPerformanceMode(true);
	assert.equal(new api.AppSettingsStorage().isLowPerformanceMode(), true);
	app.settings.resetSettings();
	assert.equal(app.settings.isLowPerformanceMode(), false);
	app.settings.setLowPerformanceMode(true);
	dispatchGMValueChange('app_settings_v1', { lowPerformanceMode: false });
	assert.equal(app.settings.isLowPerformanceMode(), false);
	context.GM_setValue = () => { throw new Error('quota'); };
	app.settings.setLowPerformanceMode(true);
	assert.equal(app.settings.isLowPerformanceMode(), false);
	assert.ok(app.settings.getLastSaveError());
});

for (const low of [false, true]) {
	test(`comment work yields and releases pending references (low=${low})`, () => {
		const { api, app, document, context, flushAnimationFrames, getPendingAnimationFrameCount } = createApp();
		flushAnimationFrames();
		const timers = fakeTimers(context);
		app.settings.setLowPerformanceMode(low);
		context.IntersectionObserver = undefined;
		const root = document.createElement('ytd-comments');
		document.body.append(root);
		for (let i = 0; i < 500; i++) root.append(document.createElement('ytd-comment-renderer'));
		const hider = new api.CommentHider(app.storage, app.pairStore, app.settings);
		let applied = 0;
		hider.applyHide = () => { applied++; };
		hider.doRefresh(root);
		assert.ok(applied > 0 && applied <= (low ? 20 : 50));
		assert.ok(hider._work.size > 0);
		if (low) assert.equal(Array.from(timers.pending.values())[0].delay, 50);
		let batches = 0;
		while (hider._work.size && batches++ < 100) { timers.flush(); flushAnimationFrames(); }
		assert.equal(applied, 500);
		assert.ok(hider._metrics.maxBatchNodes <= (low ? 20 : 50));
		hider.doRefresh(root);
		hider.resetTransientState();
		assert.equal(hider._work.size, 0);
		assert.equal(timers.pending.size, 0);
		assert.equal(getPendingAnimationFrameCount(), 0);
		const before = applied;
		timers.flush(); flushAnimationFrames();
		assert.equal(applied, before);
	});
}

test('low mode preserves manual blocking and suppresses automatic pair requests', async () => {
	const { app } = createApp();
	app.settings.setLowPerformanceMode(true);
	let calls = 0;
	app.pairService.createPairsForHandles = () => { calls++; return Promise.resolve({ items: [] }); };
	assert.equal(app.addHandleRule('@manual'), true);
	app._handleKeywordMatch({ handle: '@keyword', actions: { blockHandle: true, createPair: true } });
	await Promise.resolve();
	assert.equal(calls, 0);
	assert.equal(app.hasHandleRule('@manual'), true);
	assert.equal(app.hasHandleRule('@keyword'), true);
	app.settings.setLowPerformanceMode(false);
	await Promise.resolve();
	assert.equal(calls, 0);
});

test('manual pair lookups run serially in low mode and skip queued automatic work', async () => {
	const { app } = createApp();
	app.settings.setLowPerformanceMode(true);
	let active = 0;
	let maximum = 0;
	let calls = 0;
	app.pairService.resolveHandle = async () => {
		active++; calls++; maximum = Math.max(maximum, active);
		await Promise.resolve();
		active--;
		return { uid: 'UC1234567890', source: 'test' };
	};
	const manual = app.pairService.createPairsForHandles(['@one', '@two', '@three']);
	const automatic = app.pairService.createPairsForHandles(['@skip'], { automatic: true });
	assert.equal((await manual).created, 3);
	await automatic;
	assert.equal(maximum, 1);
	assert.equal(calls, 3);
});

for (const size of [100, 500, 1000]) {
	test(`pagination bounds DOM and restores selection for ${size} rules`, () => {
		const { api, app, document, context } = createApp(size);
		const timers = fakeTimers(context);
		app.manager.openList();
		assert.equal(document.querySelector('.tm-block-list').children.length, 100);
		api.Dialog.closeAll();
		app.settings.setLowPerformanceMode(true);
		app.manager.openList();
		assert.equal(document.querySelector('.tm-block-list').children.length, 50);
		const checkbox = document.querySelector('.tm-block-list input');
		checkbox.checked = true;
		checkbox.dispatchEvent({ type: 'change' });
		document.querySelector('[data-action="next-page"]').click();
		assert.match(document.querySelector('.tm-block-list').textContent, /@user50/);
		api.Dialog.closeAll();
		app.manager.openList();
		assert.equal(app.manager._listViewState.page, 1);
		document.querySelector('[data-action="previous-page"]').click();
		assert.equal(document.querySelector('.tm-block-list input').checked, true);
		const search = document.querySelector('[data-manager-filter="search"]');
		search.value = 'user99'; search.dispatchEvent({ type: 'input' });
		assert.equal(Array.from(timers.pending.values())[0].delay, 200);
		timers.flush();
		assert.equal(document.querySelector('.tm-block-list').children.length, size === 1000 ? 11 : 1);
		search.value = 'user'; search.dispatchEvent({ type: 'input' });
		api.Dialog.closeAll();
		assert.equal(timers.pending.size, 0);
	});
}

test('pair result pages retain full failed-handle exports and settings drafts survive storage refresh', () => {
	const { api, app, document } = createApp();
	app.settings.setLowPerformanceMode(true);
	const stats = { items: Array.from({ length: 125 }, (_: unknown, i: number) => ({ handle: `@user${i}`, outcome: 'failed' })) };
	const container = document.createElement('div');
	app.manager._renderPairResultList(container, stats);
	assert.equal(container.querySelector('.tm-result-list').children.length, 50);
	assert.equal(app.manager._getFailedPairHandles(stats).length, 125);
	const nextPage = container.querySelector('[data-action="next-page"]');
	let stopped = false;
	nextPage.dispatchEvent({ type: 'keydown', key: 'Enter', stopPropagation: () => { stopped = true; } });
	assert.equal(stopped, true);
	nextPage.click();
	assert.match(container.querySelector('.tm-result-list').textContent, /@user50/);
	app.manager.openSettings();
	const prefix = document.querySelector('[data-setting="console-log-prefix"]');
	assert.ok(prefix);
	prefix.value = 'draft'; api.Dialog.refreshAll('storage'); assert.equal(prefix.value, 'draft');
	api.Dialog.closeAll();
});

for (const size of [100, 500, 1000]) {
	test(`settings and summaries avoid repeated work for ${size} rules`, () => {
		const { api } = loadUserscript();
		const settings = new api.AppSettingsStorage();
		const storage = new api.StorageV2(settings);
		storage.setAll(Array.from({ length: size }, (_: unknown, i: number) => ({ type: 'handle', value: `@user${i}` })));
		const pairStore = new api.PairMetaStorage(settings);
		const apiConfig = new api.ApiConfigStorage();
		const pairService = new api.PairService(storage, pairStore, apiConfig, settings);
		let normalizations = 0;
		const normalize = pairStore._normalizeState.bind(pairStore);
		pairStore._normalizeState = (state: any) => { normalizations++; return normalize(state); };
		let scans = 0;
		const all = storage.all.bind(storage);
		storage.all = () => { scans++; return all(); };
		assert.equal(pairService.getSummary().handles, size);
		assert.equal(pairService.getSummary().handles, size);
		assert.equal(scans, 1);
		assert.equal(normalizations, 0);
		const manager = new api.BlockListManager({ settings, storage, pairStore, apiConfig, pairService, getLastPairRunResult: () => null });
		let renders = 0;
		const render = manager._renderPairResultList.bind(manager);
		manager._renderPairResultList = (...args: any[]) => { renders++; return render(...args); };
		manager.openSettings();
		assert.equal(renders, 1);
		api.Dialog.closeAll();
		storage.addHandle('@new');
		assert.equal(pairService.getSummary().handles, size + 1);
	});
}

test('log status subscribers do not flush or clone the saved log array', async () => {
	const { api, context } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	settings.setLogging({ fileEnabled: true, consoleEnabled: false, level: 'info' });
	const logger = new api.Logger(settings);
	let writes = 0;
	const save = context.GM_setValue;
	context.GM_setValue = (...args: any[]) => { writes++; return save(...args); };
	logger.getEntries = () => { throw new Error('status must not copy all entries'); };
	logger.subscribe(() => logger.getStatus());
	logger.info('one');
	logger.info('two');
	assert.equal(logger.getStatus().count, 2);
	assert.equal(writes, 0);
	await Promise.resolve();
	assert.equal(writes, 1);
});

test('enabling low mode during a manual run finishes existing requests and serializes the remainder', async () => {
	const { app } = createApp();
	const pending: Array<() => void> = [];
	let calls = 0;
	app.pairService.resolveHandle = async () => {
		calls++;
		await new Promise<void>(resolve => pending.push(resolve));
		return { uid: 'UC1234567890', source: 'test' };
	};
	const run = app.pairService.createPairsForHandles(Array.from({ length: 12 }, (_: unknown, i: number) => `@user${i}`));
	assert.equal(calls, 8);
	app.settings.setLowPerformanceMode(true);
	const first = pending.splice(0);
	first.forEach(resolve => resolve());
	for (let i = 0; i < 100; i++) {
		await Promise.resolve();
		assert.ok(pending.length <= 1);
		pending.shift()?.();
	}
	assert.equal((await run).created, 12);
});

test('mode changes also limit the handle lookup after an in-flight UID check', async () => {
	const { app } = createApp();
	app.settings.setPairUpdateUidCheckEnabled(true);
	const handles = ['@one', '@two', '@three'];
	for (const handle of handles) app.pairStore.upsertPair({ handle, uid: 'UC1234567890', status: 'verified', verifiedAt: Date.now(), source: 'test' });
	const uidChecks: Array<() => void> = [];
	const handleChecks: Array<() => void> = [];
	app.pairService.resolveUid = async () => { await new Promise<void>(resolve => uidChecks.push(resolve)); };
	app.pairService.resolveHandle = async () => {
		await new Promise<void>(resolve => handleChecks.push(resolve));
		return { uid: 'UC1234567890', source: 'test' };
	};
	const run = app.pairService.updatePairsForHandles(handles);
	assert.equal(uidChecks.length, 3);
	app.settings.setLowPerformanceMode(true);
	uidChecks.forEach(resolve => resolve());
	for (let i = 0; i < 100; i++) {
		await Promise.resolve();
		assert.ok(handleChecks.length <= 1);
		handleChecks.shift()?.();
	}
	assert.equal((await run).refreshed, 3);
	assert.equal(app.pairService._lookupWaiters.length, 0);
});

test('cached pair summary expires when a verified pair becomes stale', () => {
	const { app, context } = createApp();
	let now = 1000000000;
	context.Date = class extends Date { static now() { return now; } };
	app.storage.setAll([{ type: 'handle', value: '@one' }, { type: 'id', value: 'UC1234567890' }]);
	app.pairStore.upsertPair({ handle: '@one', uid: 'UC1234567890', status: 'verified', verifiedAt: now, source: 'test' });
	assert.equal(app.pairService.getSummary().paired, 1);
	now += 7 * 24 * 60 * 60 * 1000;
	assert.equal(app.pairService.getSummary().stale, 1);
});

test('low mode UI and all-page selection preserve saved automation preferences', () => {
	const { api, app, document } = createApp(125);
	app.manager.openSettings();
	const toggle = document.querySelector('[data-setting="low-performance-mode"]');
	assert.equal(toggle.checked, false);
	toggle.checked = true; toggle.dispatchEvent({ type: 'change' });
	assert.equal(app.settings.isLowPerformanceMode(), true);
	api.Dialog.closeAll();
	app.manager.openList();
	const master = document.querySelectorAll('label').find((label: any) => label.textContent.includes('모든 페이지')).querySelector('input');
	master.checked = true; master.dispatchEvent({ type: 'change' });
	assert.equal(app.manager._listViewState.selection.length, 125);
	api.Dialog.closeAll();
	app.settings.setKeywordAutomation({ keywords: ['spam'], actions: { createPair: true } });
	app.manager.openBlockKeywordAutomation();
	const pair = document.querySelectorAll('input').find((input: any) => input.disabled);
	assert.ok(pair?.checked);
	api.Dialog.closeAll();
	assert.equal(app.settings.getKeywordAutomation().actions.createPair, true);
});

test('failed block mutations restore touched entries and keep untouched objects', () => {
	const { api, context } = loadUserscript();
	const storage = new api.StorageV2(new api.AppSettingsStorage());
	storage.addHandle('@keep');
	storage.addHandle('@remove');
	const keep = storage._entries['h:@keep'];
	const removed = storage._entries['h:@remove'];
	const revision = storage._revision;
	context.GM_setValue = () => { throw new Error('quota'); };
	storage.setAll([{ type: 'handle', value: '@keep' }, { type: 'handle', value: '@new' }]);
	assert.equal(storage._entries['h:@keep'], keep);
	assert.equal(storage._entries['h:@remove'], removed);
	assert.equal(storage._entries['h:@new'], undefined);
	assert.equal(storage._revision, revision);
	assert.deepEqual(Array.from(storage.all(), (item: any) => item.value), ['@keep', '@remove']);
});
