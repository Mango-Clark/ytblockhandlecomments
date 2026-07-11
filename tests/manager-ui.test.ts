import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

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

	assert.deepEqual(failedByHandle.map((item: any) => item.handle), ['@alpha', '@gamma']);
	assert.deepEqual(manager._getFailedPairHandles(stats), ['@alpha', '@gamma']);
});

test('dialog refresh reruns translated labels after language change', async () => {
	const { api, setLang } = loadUserscript();
	let refreshContext: any = null;
	const body = api.Dialog.show({
		title: '',
		body: '',
		buttons: [{ label: '', value: false, primary: true }],
		onRefresh: (ctx: any) => {
			refreshContext = ctx;
			ctx.setTitle(api.t('close'));
			ctx.buttons[0].textContent = api.t('close');
		}
	});

	assert.equal(refreshContext?.header.textContent, '닫기');
	setLang('en');
	api.Dialog.refreshAll();
	assert.equal(refreshContext?.header.textContent, 'Close');
	assert.equal(refreshContext?.buttons[0].textContent, 'Close');

	refreshContext?.buttons[0].click();
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
	const titles = document.querySelectorAll('.tm-setting-group h4').map((node: any) => node.textContent);

	assert.deepEqual(titles, ['매칭', '댓글 표시', '표시 크기', '유지보수']);
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

test('settings dialog updates display size levels', () => {
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
	selects[2].value = '5';
	selects[2].dispatchEvent({ type: 'change' });
	selects[3].value = '1';
	selects[3].dispatchEvent({ type: 'change' });

	assert.equal(settings.getFontSizeLevel(), 5);
	assert.equal(settings.getUiScaleLevel(), 1);
	assert.equal(document.documentElement.style.getPropertyValue('--tm-font-scale'), '1.24');
	assert.equal(document.documentElement.style.getPropertyValue('--tm-ui-scale'), '0.92');
});

test('display size levels normalize invalid stored values', () => {
	const { api } = loadUserscript({
		gmStore: {
			app_settings_v1: {
				fontSizeLevel: 9,
				uiScaleLevel: 'large'
			}
		}
	});
	const settings = new api.AppSettingsStorage();

	assert.equal(settings.getFontSizeLevel(), 3);
	assert.equal(settings.getUiScaleLevel(), 3);
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
	settings.setFontSizeLevel(5);
	settings.setUiScaleLevel(1);

	manager.openSettings();
	const buttons = document.querySelectorAll('button');
	const resetButton = buttons.find((button: any) => button.textContent === '설정 초기화');
	resetButton.click();
	const dialogs = document.querySelectorAll('.tm-dialog');
	const confirmButtons = dialogs[dialogs.length - 1].querySelectorAll('button');
	confirmButtons[1].click();
	await Promise.resolve();

	assert.equal(settings.isHandleCaseSensitive(), false);
	assert.equal(settings.isAutoAddRegexHandlesEnabled(), false);
	assert.equal(settings.getDislikeMode(), 'none');
	assert.equal(settings.getCommentBlockMode(), 'hide');
	assert.equal(settings.getFontSizeLevel(), 3);
	assert.equal(settings.getUiScaleLevel(), 3);
});

test('settings and block list dialogs can open each other', () => {
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
	const openListButton = document.querySelectorAll('button').find((button: any) => button.textContent === '차단 목록 열기');
	openListButton.click();
	assert.equal(document.querySelectorAll('.tm-dialog').length, 1);
	assert.ok(document.querySelectorAll('.tm-dialog').some((dialog: any) => dialog.textContent.includes('차단된 채널')));

	const openSettingsButton = document.querySelectorAll('button').find((button: any) => button.textContent === '설정 열기');
	openSettingsButton.click();
	assert.equal(document.querySelectorAll('.tm-dialog').length, 1);
	assert.ok(document.querySelectorAll('.tm-dialog').some((dialog: any) => dialog.textContent.includes('표시 크기')));
});

test('settings dialog uses grouped task list layout', () => {
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

	assert.ok(document.querySelector('.tm-settings-panel'));
	assert.ok(document.querySelector('.tm-settings-intro').textContent.includes('자동으로 저장'));
	assert.equal(document.querySelectorAll('.tm-settings-list > .tm-setting-group').length, 4);
	assert.equal(document.querySelectorAll('.tm-setting-controls').length, 4);
});

test('api busy state shows a loading bar', () => {
	const { api, document } = loadUserscript({
		gmStore: {
			youtube_data_api_v3_config: {
				version: 1,
				apiKey: 'abc123'
			}
		}
	});
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	let resolveTest: any = null;
	const manager = new api.BlockListManager({
		settings,
		storage,
		pairStore,
		apiConfig,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {},
		testApiKey: () => new Promise(resolve => {
			resolveTest = resolve;
		})
	});

	manager.openSettings();
	const testButton = document.querySelectorAll('button').find((button: any) => button.textContent === 'API 키 테스트');
	testButton.click();
	const progress = document.querySelector('.tm-progress');

	assert.equal(progress.hidden, false);
	assert.equal(testButton.disabled, true);
	assert.equal(testButton.textContent, 'API 키를 테스트하는 중입니다...');
	resolveTest({ category: 'ok', message: 'ok', httpStatus: 200 });
});
