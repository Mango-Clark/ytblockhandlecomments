'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUserscript } = require('./helpers/load-userscript');

test('manager search index filters handles and regex labels', () => {
	const { api } = loadUserscript();
	const items = [
		{ type: 'handle', value: '@alpha' },
		{ type: 'handle', value: '@beta' },
		{ type: 'regex', value: '^@promo', flags: 'i' }
	];
	const index = api.buildManagerSearchIndex(items);
	const handleResults = api.searchManagerIndex(index, 'alp');
	const regexResults = api.searchManagerIndex(index, 'prom');

	assert.equal(handleResults.length, 1);
	assert.equal(handleResults[0].type, 'handle');
	assert.equal(handleResults[0].value, '@alpha');
	assert.equal(regexResults.length, 1);
	assert.equal(regexResults[0].type, 'regex');
	assert.equal(regexResults[0].value, '^@promo');
	assert.equal(regexResults[0].flags, 'i');
});

test('pair result details preserve collapsed state across rerender', () => {
	const { api, document } = loadUserscript();
	const manager = new api.BlockListManager({});
	const container = document.createElement('div');
	const stats = {
		items: [{ handle: '@alpha', outcome: 'created', uid: 'UC1234567890' }]
	};

	manager._renderPairResultList(container, stats);
	const firstDetails = container.querySelector('details');
	assert.equal(firstDetails.open, true);

	firstDetails.open = false;
	manager._renderPairResultList(container, stats);

	assert.equal(container.querySelector('details').open, false);
});

test('pair result helpers filter, sort, and extract failed handles', () => {
	const { api } = loadUserscript();
	const manager = new api.BlockListManager({});
	const stats = {
		items: [
			{ handle: '@beta', outcome: 'updated' },
			{ handle: '@alpha', outcome: 'failed' },
			{ handle: '@gamma', outcome: 'failed' }
		]
	};

	const failedByHandle = manager._getPairResultItems(stats, { filter: 'failed', sort: 'handle' });

	assert.deepEqual(failedByHandle.map(item => item.handle), ['@alpha', '@gamma']);
	assert.deepEqual(manager._getFailedPairHandles(stats), ['@alpha', '@gamma']);
});

test('dialog refresh reruns translated labels after language change', async () => {
	const { api, setLang } = loadUserscript();
	let refreshContext = null;
	const body = api.Dialog.show({
		title: '',
		body: '',
		buttons: [{ label: '', value: false, primary: true }],
		onRefresh: (ctx) => {
			refreshContext = ctx;
			ctx.setTitle(api.t('close'));
			ctx.buttons[0].textContent = api.t('close');
		}
	});

	assert.equal(refreshContext.header.textContent, '닫기');
	setLang('en');
	api.Dialog.refreshAll();
	assert.equal(refreshContext.header.textContent, 'Close');
	assert.equal(refreshContext.buttons[0].textContent, 'Close');

	refreshContext.buttons[0].click();
	await body;
});

test('i18n dictionaries provide Korean and English labels', () => {
	const { api, setLang } = loadUserscript();

	assert.equal(api.t('close'), '닫기');
	setLang('en');
	assert.equal(api.t('close'), 'Close');
});

test('settings dialog updates auto-dislike mode', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({
		settings,
		storage,
		pairStore,
		apiConfig,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});

	manager.openSettings();
	const select = document.querySelector('select');
	select.value = 'always';
	select.dispatchEvent({ type: 'change' });

	assert.equal(settings.getDislikeMode(), 'always');
});

test('settings dialog groups related controls', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({
		settings,
		storage,
		pairStore,
		apiConfig,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});

	manager.openSettings();
	const titles = document.querySelectorAll('.tm-setting-group h4').map(node => node.textContent);

	assert.deepEqual(titles, ['매칭', '댓글 표시', '유지보수']);
});

test('settings dialog updates comment block mode', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({
		settings,
		storage,
		pairStore,
		apiConfig,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});

	manager.openSettings();
	const selects = document.querySelectorAll('select');
	const blockModeSelect = selects[1];
	blockModeSelect.value = 'placeholder-reveal';
	blockModeSelect.dispatchEvent({ type: 'change' });

	assert.equal(settings.getCommentBlockMode(), 'placeholder-reveal');
});

test('settings dialog confirms and resets app settings', async () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({
		settings,
		storage,
		pairStore,
		apiConfig,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});

	settings.setHandleCaseSensitive(true);
	settings.setAutoAddRegexHandlesEnabled(true);
	settings.setDislikeMode('always');
	settings.setCommentBlockMode('placeholder-reveal');

	manager.openSettings();
	const buttons = document.querySelectorAll('button');
	const resetButton = buttons.find(button => button.textContent === '설정 초기화');
	resetButton.click();
	const dialogs = document.querySelectorAll('.tm-dialog');
	const confirmButtons = dialogs[dialogs.length - 1].querySelectorAll('button');
	confirmButtons[1].click();
	await Promise.resolve();

	assert.equal(settings.isHandleCaseSensitive(), false);
	assert.equal(settings.isAutoAddRegexHandlesEnabled(), false);
	assert.equal(settings.getDislikeMode(), 'none');
	assert.equal(settings.getCommentBlockMode(), 'hide');
});
