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

test('nested dialogs route keyboard input to the top dialog and restore focus', async () => {
	const { api, document } = loadUserscript();
	const opener = document.createElement('button');
	document.body.appendChild(opener);
	opener.focus();
	const outer = api.Dialog.show({ title: 'Outer', buttons: [{ label: 'Confirm', value: 'outer', primary: true }] });
	const outerButton = document.querySelector('.tm-dialog button');
	const inner = api.Dialog.show({ title: 'Inner', buttons: [{ label: 'Confirm', value: 'inner', primary: true }] });
	assert.equal(document._listeners.get('keydown').size, 1);

	const escape: any = { type: 'keydown', key: 'Escape', preventDefault() { this.defaultPrevented = true; } };
	document.dispatchEvent(escape);
	assert.equal(escape.defaultPrevented, true);
	assert.equal(document.querySelectorAll('.tm-dialog').length, 1);
	assert.equal(document.activeElement, outerButton);
	assert.equal(await inner, false);

	const enter: any = { type: 'keydown', key: 'Enter', target: document, preventDefault() { this.defaultPrevented = true; } };
	document.dispatchEvent(enter);
	assert.equal(enter.defaultPrevented, true);
	assert.equal(await outer, 'outer');
	assert.equal(document.activeElement, opener);
	assert.equal(document._listeners.get('keydown').size, 0);
});

test('i18n dictionaries provide Korean and English labels', () => {
	const { api, setLang } = loadUserscript();

	assert.equal(api.t('close'), '닫기');
	assert.equal(api.t('resetFilters'), '필터 초기화');
	assert.equal(api.t('loggingOutputTitle'), '출력 대상');
	setLang('en');
	assert.equal(api.t('close'), 'Close');
	assert.equal(api.t('resetFilters'), 'Reset filters');
	assert.equal(api.t('loggingOutputTitle'), 'Output destinations');
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
	const select = document.querySelectorAll('select').find((item: any) => item.dataset.setting === 'dislike-mode');
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

	assert.deepEqual(titles, ['매칭', '댓글 표시', '키워드 자동 처리', '로그', '표시 크기', '테마', '유지보수']);
	assert.ok(document.querySelector('.tm-setting-group-matching'));
	assert.equal(document.querySelectorAll('.tm-setting-group-matching').length, 1);
	assert.match(document.querySelector('.tm-settings-panel').textContent, /키워드 매칭과 선택한 모든 동작을 한 번에 켜거나 끕니다/);
	assert.match(document.querySelector('.tm-settings-panel').textContent, /차단 및 키워드 자동 처리 열기/);
});

test('logging settings show grouped status, preview, and test output controls', async () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	settings.setLogging({ fileEnabled: true, consoleEnabled: false, level: 'info' });
	const logger = new api.Logger(settings);
	logger.info('existing');
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({
		settings,
		storage,
		pairStore,
		apiConfig,
		logger,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});

	manager.openSettings();
	assert.deepEqual(
		document.querySelectorAll('.tm-logging-subgroup h5').map((node: any) => node.textContent),
		['출력 대상', '기록 상세도', '콘솔 표시 형식', '저장 로그 관리']
	);
	assert.match(document.querySelector('.tm-log-preview').textContent, /^\[YTCB\] Test log output$/);
	assert.match(document.querySelector('.tm-settings-panel').textContent, /1\/500개 저장/);
	const testButton = document.querySelectorAll('button').find((button: any) => button.textContent === '테스트 로그 출력');
	assert.equal(testButton.disabled, false);
	testButton.click();
	assert.match(document.querySelector('.tm-settings-panel').textContent, /2\/500개 저장/);
	const clearButton = document.querySelectorAll('button').find((button: any) => button.textContent === '저장 로그 지우기');
	clearButton.click();
	const dialogs = document.querySelectorAll('.tm-dialog');
	const confirmButtons = dialogs.at(-1).querySelectorAll('button');
	assert.ok(confirmButtons[1].className.includes('danger'));
	confirmButtons[1].click();
	await Promise.resolve();
	assert.match(document.querySelector('.tm-settings-panel').textContent, /저장된 로그 없음/);
	assert.equal(document.querySelectorAll('button').find((button: any) => button.textContent === '로그 파일 다운로드').disabled, true);
});

test('live log updates preserve draft settings and do not refresh unrelated dialogs', async () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	settings.setLogging({ fileEnabled: true, consoleEnabled: false, level: 'info' });
	const logger = new api.Logger(settings);
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({
		settings,
		storage,
		pairStore,
		apiConfig,
		logger,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});

	manager.openSettings();
	const prefixInput = document.querySelectorAll('input').find((item: any) => item.dataset.setting === 'console-log-prefix');
	const apiInput = document.querySelectorAll('input').find((item: any) => item.type === 'password');
	prefixInput.value = '[UNSAVED]';
	apiInput.value = 'unsaved-api-key';
	let unrelatedRefreshes = 0;
	api.Dialog.show({
		title: 'Unrelated',
		body: 'Unrelated',
		buttons: [{ label: 'Close', value: false }],
		onRefresh: () => { unrelatedRefreshes += 1; }
	});

	logger.info('live update');
	assert.equal(prefixInput.value, '[UNSAVED]');
	assert.equal(apiInput.value, 'unsaved-api-key');
	assert.match(document.querySelector('.tm-settings-panel').textContent, /1\/500개 저장/);
	assert.equal(unrelatedRefreshes, 1);
	assert.equal(logger._changeListeners.size, 1);

	api.Dialog.closeAll();
	await Promise.resolve();
	assert.equal(logger._changeListeners.size, 0);
});

test('comment menu item is idempotent and refreshes its blocked state', () => {
	const { api, context, document } = loadUserscript();
	context.addEventListener = () => {};
	const blocked = new Set<string>();
	const enhancer = new api.MenuEnhancer({
		hasHandleRule: (handle: string) => blocked.has(handle),
		storage: {}
	});
	const menu = document.createElement('tp-yt-paper-listbox');

	enhancer._addItem(menu, '@alpha');
	enhancer._addItem(menu, '@alpha');
	assert.equal(menu.querySelectorAll('.tm-hide-channel').length, 1);
	assert.equal(menu.querySelector('.tm-hide-channel').children[1].textContent, '이 채널의 댓글 숨김');
	assert.equal(menu.querySelector('.tm-menu-script-mark').textContent, 'CB');

	blocked.add('@alpha');
	enhancer._addItem(menu, '@alpha');
	assert.equal(menu.querySelectorAll('.tm-hide-channel').length, 1);
	assert.equal(menu.querySelector('.tm-hide-channel').children[1].textContent, '이 채널 댓글 숨김 해제');
});

test('menu enhancer finds a reused popup with a delayed menu list', () => {
	const { api, context, document } = loadUserscript();
	context.addEventListener = () => {};
	const enhancer = new api.MenuEnhancer({ hasHandleRule: () => false, storage: {} });
	const popup = document.createElement('ytd-menu-popup-renderer');
	const menu = document.createElement('tp-yt-paper-listbox');
	document.body.appendChild(popup);
	enhancer.lastHandle = '@shorts';
	assert.equal(enhancer._enhanceOpenPopups(), false);

	popup.appendChild(menu);
	assert.equal(enhancer._enhanceOpenPopups(), true);
	assert.equal(menu.querySelector('.tm-hide-channel').getAttribute('data-tm-handle'), '@shorts');
});

test('menu enhancer resolves the handle from a comment menu renderer', () => {
	const { api, context, document } = loadUserscript();
	context.addEventListener = () => {};
	const enhancer = new api.MenuEnhancer({ hasHandleRule: () => false, storage: {} });
	const comment = document.createElement('ytd-comment-thread-renderer');
	const author = document.createElement('a');
	author.setAttribute('href', '/@alpha');
	const menuRenderer = document.createElement('ytd-menu-renderer');
	const button = document.createElement('button');
	menuRenderer.appendChild(button);
	comment.append(author, menuRenderer);
	document.body.appendChild(comment);

	assert.equal(enhancer._captureMenuHandle(button), true);
	assert.equal(enhancer.lastHandle, '@alpha');
});

test('export dialog returns to the list and downloads each format', async () => {
	const { api, document } = loadUserscript();
	const manager = new api.BlockListManager({
		storage: { all: () => [{ type: 'handle', value: '@alpha' }] }
	});
	const downloads: Array<[string, string, string]> = [];
	let openedLists = 0;
	manager._downloadExport = (filename: string, content: string, type: string) => downloads.push([filename, content, type]);
	manager.openList = () => { openedLists += 1; };

	manager.exportList();
	let buttons = document.querySelectorAll('.tm-dialog button');
	assert.deepEqual(buttons.map((button: any) => button.textContent), ['뒤로가기', 'JSON 파일 다운로드', '텍스트 파일 다운로드', '닫기']);
	buttons[1].click();
	await Promise.resolve();
	assert.equal(downloads[0][0], 'youtube-comment-blocker-export.json');
	assert.match(downloads[0][1], /"@alpha"/);

	manager.exportList();
	buttons = document.querySelectorAll('.tm-dialog button');
	buttons[2].click();
	await Promise.resolve();
	assert.deepEqual(downloads[1], ['youtube-comment-blocker-export.txt', '@alpha', 'text/plain']);

	manager.exportList();
	buttons = document.querySelectorAll('.tm-dialog button');
	buttons[0].click();
	await Promise.resolve();
	assert.equal(openedLists, 1);
});

test('logging settings persist independently and retain the configured level', () => {
	const { api, gmStore } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	settings.setLogging({ fileEnabled: true, consoleEnabled: false, level: 'info', retention: 100, consolePrefix: '[TEST]', consoleTimestampEnabled: true, consoleTimeFormat: 'yy-MM-dd HH:mm:ss XXX', consoleTimeZone: 'offset:+09:00' });
	settings.setVerboseLevel(2);
	const logger = new api.Logger(settings);
	logger.debug('ignored');
	logger.info('saved', { source: 'test' });

	assert.equal(settings.getLogging().fileEnabled, true);
	assert.equal(settings.getLogging().consoleEnabled, false);
	assert.equal(settings.getLogging().level, 'info');
	assert.equal(settings.getLogging().retention, 100);
	assert.equal(settings.getLogging().consolePrefix, '[TEST]');
	assert.equal(settings.getVerboseLevel(), 2);
	assert.equal(logger._formatDetail({ first: true, second: false }), '{"first":true}');
	assert.equal(logger._formatConsolePrefix(settings.getLogging(), Date.UTC(2026, 0, 2, 3, 4, 5)), '[TEST] 26-01-02 12:04:05 +09:00');
	assert.equal(settings.setLogging({ consolePrefix: 'bad\nvalue' }), null);
	assert.equal(settings.getLogging().consolePrefix, '[TEST]');
	assert.equal(logger.getEntries().length, 1);
	assert.equal((gmStore.get('yt_comment_blocker_logs_v1') as any).entries.length, 1);
	assert.equal((gmStore.get('yt_comment_blocker_logs_v1') as any).entries[0].message, 'saved');
	logger.clear();
	assert.equal((gmStore.get('yt_comment_blocker_logs_v1') as any).entries.length, 0);
});

test('logger redacts nested identifiers without leaking circular payloads', () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	settings.setVerboseLevel(5);
	const logger = new api.Logger(settings);
	const payload: any = {
		handle: '@private', nested: { token: 'secret', account: { userId: 'person' }, safe: true },
		items: [{ url: 'https://private.example', visible: 'ok' }]
	};
	payload.circular = payload;
	const detail = logger._formatDetail(payload);
	assert.equal(detail.includes('@private'), false);
	assert.equal(detail.includes('secret'), false);
	assert.equal(detail.includes('private.example'), false);
	assert.equal(detail.includes('person'), false);
	assert.equal(logger._formatDetail({ value: '@private' }).includes('@private'), false);
	assert.equal(logger._formatDetail({ value: 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6' }).includes('AIza'), false);
	assert.equal(logger._formatDetail({ value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwcml2YXRlIn0.signature123' }).includes('eyJ'), false);
	assert.equal(logger._formatDetail({ value: 'aB3dEfGhIjKlMnOpQrStUvWxYz012345' }).includes('aB3d'), false);
	assert.equal(logger._formatDetail({ value: 'ordinary diagnostic text' }), '{"value":"ordinary diagnostic text"}');
	assert.equal(logger._formatDetail({ comment: 'ordinary diagnostic text' }), '{}');
	assert.match(detail, /"safe":true/);
	assert.match(detail, /"visible":"ok"/);
	assert.match(detail, /\[Circular\]/);

	settings.setVerboseLevel(4);
	const fields = Object.fromEntries(Array.from({ length: 8 }, (_: unknown, index: number): [string, number] => [`field${index}`, index]));
	assert.equal(Object.keys(JSON.parse(logger._formatDetail(fields))).length, 6);
});

test('console timestamp supports ISO calendar, week, ordinal, basic, and timezone tokens', () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const logger = new api.Logger(settings);
	const at = Date.UTC(2026, 0, 2, 3, 4, 5, 6);
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'offset:+09:00', consoleTimeFormat: 'iso-week-date' });
	assert.equal(logger._formatConsoleTimestamp(settings.getLogging(), at), '2026-W01-5');
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'offset:+09:00', consoleTimeFormat: 'iso-ordinal-date' });
	assert.equal(logger._formatConsoleTimestamp(settings.getLogging(), at), '2026-002');
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'offset:+09:00', consoleTimeFormat: 'yyyy-Www-eTHHmmssX' });
	assert.equal(logger._formatConsoleTimestamp(settings.getLogging(), at), '2026-W01-5T120405+09');
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'UTC', consoleTimeFormat: 'yyyy-DDDTHH:mm:ss.SSSXXX' });
	assert.equal(logger._formatConsoleTimestamp(settings.getLogging(), at), '2026-002T03:04:05.006Z');
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'Asia/Seoul', consoleTimeFormat: 'iso-time' });
	assert.equal(logger._formatConsoleTimestamp(settings.getLogging(), at), '12:04:05.006+09:00');
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'system', consoleTimeFormat: 'iso-date' });
	assert.match(logger._formatConsoleTimestamp(settings.getLogging(), at), /^2026-01-0[12]$/);
	const boundary = Date.UTC(2020, 11, 31, 15, 30, 0, 0);
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'Asia/Seoul', consoleTimeFormat: 'iso-week-date' });
	assert.equal(logger._formatConsoleTimestamp(settings.getLogging(), boundary), '2020-W53-5');
	settings.setLogging({ consoleTimestampEnabled: true, consoleTimeZone: 'Asia/Seoul', consoleTimeFormat: 'iso-ordinal-date' });
	assert.equal(logger._formatConsoleTimestamp(settings.getLogging(), boundary), '2021-001');
	assert.equal(settings._isValidConsoleTimeFormat('yyyy-Www-eTHHmmssX'), true);
	assert.equal(settings._isValidConsoleTimeFormat('yyyy-Woops'), false);
});

test('logger batches writes, trims immediately, and keeps legacy IDs stable after reload', () => {
	let writes = 0;
	let stored: any = null;
	const legacyMessage = `legacy-${'x'.repeat(700)}`;
	const { api, gmStore, dispatchGMValueChange } = loadUserscript({
		gmStore: {
			yt_comment_blocker_logs_v1: [{ at: 1, level: 'warn', message: legacyMessage }]
		},
		gmSetValue: (_key, value) => { writes += 1; stored = value; }
	});
	const config = { fileEnabled: true, consoleEnabled: false, level: 'info', retention: 500 };
	const settings = { getLogging: () => config, getVerboseLevel: () => 3 };
	const left = new api.Logger(settings);
	const stale = new api.Logger(settings);
	assert.equal(left._state.entries[0].id, stale._state.entries[0].id);
	assert.ok(left._state.entries[0].id.length < 160);
	left.info('left');
	left.info('left-2');
	assert.equal(left.getEntries().length, 3);
	assert.equal(writes, 1);
	assert.equal(stored.version, 2);
	gmStore.set('yt_comment_blocker_logs_v1', stored);
	const reloaded = new api.Logger(settings);
	dispatchGMValueChange('yt_comment_blocker_logs_v1', stale._state, 2);
	assert.equal(reloaded._state.entries.filter((entry: any) => entry.revision.writer === 'legacy').length, 1);

	for (let index = 0; index < 105; index += 1) left.info(`entry-${index}`);
	assert.equal(left.trimToRetention(100), true);
	assert.equal(left.getEntries().length, 100);
});

test('legacy log IDs converge across overlapping trimmed snapshots and old version 2 IDs', () => {
	const { api } = loadUserscript();
	const settings = { getLogging: () => ({ retention: 500 }), getVerboseLevel: () => 3 };
	const logger = new api.Logger(settings);
	const a = { at: 1, level: 'warn', message: 'A' };
	const b = { at: 2, level: 'warn', message: 'B' };
	const c = { at: 3, level: 'warn', message: 'C' };
	logger._state = logger._normalizeState([a, b]);
	logger._mergeRemote([b, c]);
	assert.deepEqual(Array.from(logger.getEntries(), (entry: any) => entry.message).sort(), ['A', 'B', 'C']);

	const oldVersionTwo = {
		version: 2,
		clearRevision: { counter: 0, writer: '' },
		entries: [{ ...b, id: 'legacy-0-old-index-based-id', revision: { counter: 1, writer: 'legacy' } }]
	};
	logger._mergeRemote(oldVersionTwo);
	assert.deepEqual(Array.from(logger.getEntries(), (entry: any) => entry.message).sort(), ['A', 'B', 'C']);
});

test('logging status rolls back after a batched save failure', async () => {
	const { api, context, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	settings.setLogging({ fileEnabled: true, consoleEnabled: false, level: 'info' });
	const logger = new api.Logger(settings);
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({
		settings, storage, pairStore, apiConfig, logger,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});
	manager.openSettings();
	context.GM_setValue = () => { throw new Error('quota'); };
	logger.info('will roll back');
	assert.match(document.querySelector('.tm-settings-panel').textContent, /1\/500개 저장/);
	await Promise.resolve();
	assert.match(document.querySelector('.tm-settings-panel').textContent, /0\/500개 저장/);
});

test('logger storage listeners converge two writers and preserve clear ordering', () => {
	const { api, dispatchGMValueChange } = loadUserscript();
	const config = { fileEnabled: true, consoleEnabled: false, level: 'info', retention: 500 };
	const settings = { getLogging: () => config, getVerboseLevel: () => 3 };
	const left = new api.Logger(settings);
	const right = new api.Logger(settings);
	const cloneState = (logger: any) => JSON.parse(JSON.stringify(logger._state));

	left.info('left');
	left.getEntries();
	const leftOnly = cloneState(left);
	right.info('right');
	right.getEntries();
	const rightOnly = cloneState(right);
	dispatchGMValueChange('yt_comment_blocker_logs_v1', rightOnly, 0);
	left.getEntries();
	dispatchGMValueChange('yt_comment_blocker_logs_v1', leftOnly, 1);
	right.getEntries();
	dispatchGMValueChange('yt_comment_blocker_logs_v1', cloneState(right), 0);
	dispatchGMValueChange('yt_comment_blocker_logs_v1', cloneState(left), 1);
	left.getEntries();
	right.getEntries();
	assert.equal(left._serializeState(), right._serializeState());
	assert.deepEqual(Array.from(left.getEntries(), (entry: any) => entry.message).sort(), ['left', 'right']);

	const staleAdditions = cloneState(right);
	left.clear();
	const clearState = cloneState(left);
	dispatchGMValueChange('yt_comment_blocker_logs_v1', clearState, 1);
	dispatchGMValueChange('yt_comment_blocker_logs_v1', staleAdditions, 0);
	dispatchGMValueChange('yt_comment_blocker_logs_v1', cloneState(right), 0);
	left.getEntries();
	right.getEntries();
	assert.equal(left._serializeState(), right._serializeState());
	assert.equal(left.getEntries().length, 0);
});

test('settings dialog saves validated console logging settings', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const manager = new api.BlockListManager({ settings, storage, pairStore, apiConfig, pairService: new api.PairService(storage, pairStore, apiConfig, settings), getLastPairRunResult: () => null, refreshAfterStorageChange: () => {} });
	manager.openSettings();
	const input = document.querySelectorAll('input').find((item: any) => item.dataset.setting === 'console-log-prefix');
	const format = document.querySelectorAll('select').find((item: any) => item.dataset.setting === 'console-log-time-format');
	const zone = document.querySelectorAll('select').find((item: any) => item.dataset.setting === 'console-log-timezone');
	input.value = '[CONSOLE]';
	input.dispatchEvent({ type: 'change' });
	format.value = 'iso-basic';
	format.dispatchEvent({ type: 'change' });
	zone.value = 'Asia/Seoul';
	zone.dispatchEvent({ type: 'change' });
	assert.equal(settings.getLogging().consolePrefix, '[CONSOLE]');
	assert.equal(settings.getLogging().consoleTimeFormat, 'iso-basic');
	assert.equal(settings.getLogging().consoleTimeZone, 'Asia/Seoul');
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
	const blockModeSelect = document.querySelectorAll('select').find((select: any) => select.dataset.setting === 'comment-block-mode');
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
	const fontSizeSelect = selects.find((select: any) => select.dataset.setting === 'font-size-level');
	const uiScaleSelect = selects.find((select: any) => select.dataset.setting === 'ui-scale-level');
	fontSizeSelect.value = '5';
	fontSizeSelect.dispatchEvent({ type: 'change' });
	uiScaleSelect.value = '1';
	uiScaleSelect.dispatchEvent({ type: 'change' });

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

test('theme settings persist validated colors and resolve YouTube dark mode', () => {
	const { api, document } = loadUserscript({
		gmStore: {
			app_settings_v1: {
				themeMode: 'custom',
				themeCustom: { primary: '#ABCDEF', border: 'invalid' }
			}
		}
	});
	const settings = new api.AppSettingsStorage();
	assert.equal(settings.getThemeMode(), 'custom');
	assert.equal(settings.getThemeCustom().primary, '#abcdef');
	assert.equal(settings.getThemeCustom().border, '#d0d7de');
	assert.ok(document.documentElement.classList.contains('tm-theme-custom'));
	assert.equal(document.documentElement.style.getPropertyValue('--tm-theme-primary'), '#abcdef');

	const app = document.createElement('ytd-app');
	app.setAttribute('dark', '');
	document.body.appendChild(app);
	settings.setThemeMode('youtube');
	assert.ok(document.documentElement.classList.contains('tm-theme-dark'));
	settings.setThemeMode('youtube-inverted');
	assert.ok(document.documentElement.classList.contains('tm-theme-light'));
});

test('YouTube theme observers ignore userscript classes and stay stable', () => {
	const { api, document } = loadUserscript();
	const app = document.createElement('ytd-app');
	app.setAttribute('dark', '');
	document.body.appendChild(app);
	const settings = new api.AppSettingsStorage();
	settings.setThemeMode('youtube');
	let applyCalls = 0;
	const apply = settings._applyThemeSettings.bind(settings);
	settings._applyThemeSettings = () => {
		applyCalls += 1;
		apply();
	};

	assert.deepEqual(Array.from(settings._youtubeRootThemeObserver.observeCalls[0].options.attributeFilter), ['dark']);
	settings._youtubeRootThemeObserver.trigger([{ target: document.documentElement, attributeName: 'class' }]);
	assert.equal(applyCalls, 0);
	settings._youtubeAppThemeObserver.trigger([{ target: app, attributeName: 'dark' }]);
	assert.equal(applyCalls, 1);
	assert.ok(document.documentElement.classList.contains('tm-theme-dark'));

	settings.setThemeMode('youtube-inverted');
	assert.ok(document.documentElement.classList.contains('tm-theme-light'));
	settings._youtubeAppThemeObserver.trigger([{ target: app, attributeName: 'class' }]);
	assert.equal(applyCalls, 3);
});

test('YouTube theme discovery ignores unrelated body mutations and stops after finding ytd-app', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	assert.equal(settings._youtubeRootThemeObserver.disconnected, true);
	assert.equal(settings._youtubeAppReplacementObserver.disconnected, true);

	settings.setThemeMode('youtube');
	assert.equal(settings._youtubeAppDiscoveryObserver.observeCalls[0].options.childList, true);
	assert.equal(settings._youtubeAppDiscoveryObserver.observeCalls[0].options.subtree, undefined);
	assert.equal(settings._youtubeAppReplacementObserver.observeCalls[0].options.childList, true);
	assert.equal(settings._youtubeAppReplacementObserver.observeCalls[0].options.subtree, undefined);
	let lookups = 0;
	const watch = settings._watchYouTubeThemeTarget.bind(settings);
	settings._watchYouTubeThemeTarget = () => { lookups += 1; watch(); };
	const unrelated = document.createElement('div');
	settings._youtubeAppDiscoveryObserver.trigger([{ addedNodes: [unrelated], removedNodes: [] }]);
	assert.equal(lookups, 0);

	const app = document.createElement('ytd-app');
	document.body.appendChild(app);
	settings._youtubeAppDiscoveryObserver.trigger([{ addedNodes: [app], removedNodes: [] }]);
	assert.equal(lookups, 1);
	assert.equal(settings._youtubeAppDiscoveryObserver.disconnected, true);
	assert.equal(settings._youtubeThemeTarget, app);

	const replacement = document.createElement('ytd-app');
	document.body.removeChild(app);
	document.body.appendChild(replacement);
	settings._youtubeAppReplacementObserver.trigger([{ addedNodes: [replacement], removedNodes: [app] }]);
	assert.equal(lookups, 2);
	assert.equal(settings._youtubeThemeTarget, replacement);
});

test('settings dialog exposes all theme modes and custom editor', () => {
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
	const modeSelect = document.querySelectorAll('select').find((select: any) => select.dataset.setting === 'theme-mode');
	assert.equal(modeSelect.options.length, 7);
	modeSelect.value = 'custom';
	modeSelect.dispatchEvent({ type: 'change' });
	assert.equal(settings.getThemeMode(), 'custom');
	assert.ok(document.querySelectorAll('.tm-dialog').some((dialog: any) => dialog.textContent.includes('테마 커스텀')));
});

test('settings dialog updates the identity block method', () => {
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
	const matchModeSelect = document.querySelectorAll('select').find((select: any) => select.dataset.setting === 'block-match-mode');
	matchModeSelect.value = 'pair';
	matchModeSelect.dispatchEvent({ type: 'change' });

	assert.equal(settings.getBlockMatchMode(), 'pair');
});

test('block and keyword automation dialog saves keyword settings', () => {
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

	manager.openBlockKeywordAutomation();
	const keywordInput = document.querySelectorAll('textarea').find((item: any) => item.dataset.setting === 'keyword-rules');
	keywordInput.value = 'spam\nPromo';
	keywordInput.dispatchEvent({ type: 'change' });

	assert.deepEqual(Array.from(settings.getKeywordAutomation().keywords), ['spam', 'Promo']);
	const patternInput = document.querySelectorAll('input').find((item: any) => item.dataset.setting === 'regex-pattern');
	const flagsInput = document.querySelectorAll('input').find((item: any) => item.dataset.setting === 'regex-flags');
	patternInput.value = '^@promo';
	flagsInput.value = 'i';
	document.querySelectorAll('button').find((button: any) => button.textContent === '추가').click();
	const regex = storage.all().find((item: any) => item.type === 'regex');
	assert.equal(regex.value, '^@promo');
	assert.equal(regex.flags, 'i');
});

test('block and keyword automation dialog links settings and block list', async () => {
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

	manager.openBlockKeywordAutomation();
	const buttons = document.querySelector('.tm-dialog footer').querySelectorAll('button');
	assert.deepEqual(buttons.map((button: any) => button.textContent), ['차단 목록 열기', '설정 열기', '닫기']);
	buttons[0].click();
	await Promise.resolve();
	assert.ok(document.querySelector('.tm-automation-entry'));
	assert.ok(document.querySelectorAll('button').some((button: any) => button.textContent === '차단 및 키워드 자동 처리 열기'));

	manager.openSettings();
	const openAutomation = document.querySelectorAll('button').find((button: any) => button.textContent === '차단 및 키워드 자동 처리 열기');
	const enabled = document.querySelectorAll('input').find((input: any) => input.dataset.setting === 'keyword-automation-enabled');
	enabled.checked = false;
	enabled.dispatchEvent({ type: 'change' });
	assert.equal(settings.isKeywordAutomationEnabled(), false);
	openAutomation.click();
	assert.ok(document.querySelector('.tm-automation-panel'));
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
	settings.setBlockMatchMode('pair');
	settings.setPairUpdateUidCheckEnabled(true);
	settings.setPairUpdateHandleLookupEnabled(false);
	settings.setKeywordAutomation({
		keywords: ['spam'],
		fields: { commentText: false, handle: true, pinned: true },
		actions: { dislike: true, blockHandle: true, createPair: true }
	});
	settings.setDislikeMode('always');
	settings.setCommentBlockMode('placeholder-reveal');
	settings.setFontSizeLevel(5);
	settings.setUiScaleLevel(1);

	manager.openSettings();
	const buttons = document.querySelectorAll('button');
	const resetButton = buttons.find((button: any) => button.textContent === '설정 초기화');
	assert.ok(resetButton.className.includes('danger'));
	resetButton.click();
	const dialogs = document.querySelectorAll('.tm-dialog');
	const confirmButtons = dialogs[dialogs.length - 1].querySelectorAll('button');
	assert.ok(confirmButtons[1].className.includes('danger'));
	confirmButtons[1].click();
	await Promise.resolve();

	assert.equal(settings.isHandleCaseSensitive(), false);
	assert.equal(settings.isAutoAddRegexHandlesEnabled(), false);
	assert.equal(settings.getBlockMatchMode(), 'handle');
	assert.equal(settings.isPairUpdateUidCheckEnabled(), false);
	assert.equal(settings.isPairUpdateHandleLookupEnabled(), true);
	assert.deepEqual(Array.from(settings.getKeywordAutomation().keywords), []);
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

test('block list restores view state, resets filters, and prunes stale selections', () => {
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
	storage.setAll([
		{ type: 'handle', value: '@alpha' },
		{ type: 'regex', value: '^@promo', flags: 'i' }
	]);

	manager.openList();
	let search = document.querySelector('[data-manager-filter="search"]');
	let type = document.querySelector('[data-manager-filter="type"]');
	let handleOnly = document.querySelector('[data-manager-tag="handle-only"]');
	search.value = 'alpha';
	search.dispatchEvent({ type: 'input' });
	type.value = 'handle';
	type.dispatchEvent({ type: 'change' });
	handleOnly.checked = true;
	handleOnly.dispatchEvent({ type: 'change' });
	document.querySelector('.tm-item-check').checked = true;
	document.querySelector('.tm-item-check').dispatchEvent({ type: 'change' });
	document.querySelector('.tm-content').scrollTop = 180;

	const openSettings = document.querySelectorAll('button').find((button: any) => button.textContent === '설정 열기');
	openSettings.click();
	const openList = document.querySelectorAll('button').find((button: any) => button.textContent === '차단 목록 열기');
	openList.click();
	search = document.querySelector('[data-manager-filter="search"]');
	type = document.querySelector('[data-manager-filter="type"]');
	handleOnly = document.querySelector('[data-manager-tag="handle-only"]');
	assert.equal(search.value, 'alpha');
	assert.equal(type.value, 'handle');
	assert.equal(handleOnly.checked, true);
	assert.equal(document.querySelector('.tm-item-check').checked, true);
	assert.equal(document.querySelector('.tm-content').scrollTop, 180);

	const resetFilters = document.querySelectorAll('button').find((button: any) => button.textContent === '필터 초기화');
	resetFilters.click();
	assert.equal(search.value, '');
	assert.equal(type.value, 'all');
	assert.equal(handleOnly.checked, false);
	assert.equal(document.querySelector('.tm-item-check').checked, true);

	storage.remove({ type: 'handle', value: '@alpha' });
	api.Dialog.closeAll('navigate');
	manager.openList();
	assert.equal(manager._listViewState.selection.length, 0);
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
	assert.equal(document.querySelectorAll('.tm-settings-list > .tm-setting-group').length, 7);
	assert.equal(document.querySelectorAll('.tm-setting-controls').length, 7);
});

test('settings options mark their default values', () => {
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
	const defaults = [
		['block-match-mode', 'handle'],
		['dislike-mode', 'none'],
		['comment-block-mode', 'hide'],
		['console-log-time-format', 'iso'],
		['handle-lookup-interval', '600'],
		['verbose-level', '3'],
		['font-size-level', '3'],
		['ui-scale-level', '3'],
		['theme-mode', 'system']
	];
	for (const [setting, value] of defaults) {
		const select = document.querySelectorAll('select').find((item: any) => item.dataset.setting === setting);
		const option = select.options.find((item: any) => item.value === value);
		assert.ok(option.className.includes('tm-default-option'), `${setting} default option is not marked`);
		assert.match(option.textContent, /\(기본\)$/);
	}
	const loggingDefaults = [
		['warn', '경고 및 오류'],
		['500', '500개']
	];
	const selects = document.querySelectorAll('select').filter((item: any) => !item.dataset.setting);
	for (const [value, label] of loggingDefaults) {
		const option = selects.flatMap((select: any) => select.options).find((item: any) => item.value === value);
		assert.ok(option.className.includes('tm-default-option'));
		assert.equal(option.textContent, `${label} (기본)`);
	}
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
