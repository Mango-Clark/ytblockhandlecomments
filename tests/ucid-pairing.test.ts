import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

const UCID = 'UC1234567890';
const OTHER_UCID = 'UC0987654321';

function setup(options: any = {}) {
	const loaded = loadUserscript(options);
	const { api } = loaded;
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairs = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const service = new api.PairService(storage, pairs, apiConfig, settings);
	return { ...loaded, settings, storage, pairs, apiConfig, service };
}

function channelPage(ucid = UCID, handle = '@alpha') {
	return '<script>var ytInitialData = ' + JSON.stringify({ metadata: { channelMetadataRenderer: { externalId: ucid, vanityChannelUrl: 'https://www.youtube.com/' + handle } } }) + ';</script>';
}

function storedPair(handle = '@alpha', ucid = UCID) {
	return { handle, ucid, verifiedAt: 1000, status: 'verified', source: 'fixture', lastResolvedUcid: ucid, lastError: null };
}

test('each pairing operation has an independent lookup policy', () => {
	const { settings } = setup();
	assert.equal(settings.isPairOnBlockEnabled(), true);
	settings.setPairLookupMethod('create', 'api');
	settings.setPairLookupMethod('update', 'page-api');
	assert.equal(settings.getPairLookupMethod('create'), 'api');
	assert.equal(settings.getPairLookupMethod('update'), 'page-api');
	assert.equal(settings.getPairLookupMethod('onBlock'), 'page');
});

test('legacy lookup options migrate without changing refresh or on-block choices', () => {
	const { settings, gmStore } = setup({ gmStore: { app_settings_v1: { version: 1, handleLookupMethod: 'scraper', handleLookupFallbackApi: true, handleLookupInterval: 'custom', handleLookupCustomSeconds: 123, handleLookupOnAdd: false, pairUpdateUidCheck: true } } });
	for (const stage of ['create', 'update', 'onBlock']) assert.equal(settings.getPairLookupMethod(stage), 'page-api');
	assert.equal(settings.getPairRefreshIntervalSeconds(), 123);
	assert.equal(settings.isPairOnBlockEnabled(), false);
	const snapshot = gmStore.get('app_settings_v1') as any;
	assert.equal(snapshot.version, 2);
	assert.equal('pairUpdateUidCheck' in snapshot, false);
	assert.equal('handleLookupMethod' in snapshot, false);
});

test('legacy pair arrays and sync entries migrate while preserving deletion revisions', () => {
	const revision = { clock: 9, writer: 'legacy' };
	const legacy = { handle: '@alpha', uid: UCID, lastResolvedUid: UCID, verifiedAt: 1000, status: 'verified', source: 'old' };
	const { api, settings, pairs, gmStore } = setup({ gmStore: { pair_meta_v1: {
		version: 1, enableUidDetection: true, pairs: [legacy],
		sync: { clock: 9, pairs: { '@alpha': { revision, item: legacy }, '@removed': { revision, deleted: true } }, scalars: { enableUidDetection: { revision, value: true } } }
	} } });
	assert.equal(pairs.getPair('@alpha').ucid, UCID);
	assert.equal(pairs.isUcidDetectionEnabled(), true);
	const snapshot = gmStore.get('pair_meta_v1') as any;
	assert.equal(snapshot.version, 2);
	assert.equal(snapshot.sync.pairs['@removed'].deleted, true);
	assert.equal(snapshot.sync.pairs['@alpha'].revision.clock, 9);
	assert.equal(snapshot.sync.scalars.enableUcidDetection.revision.writer, 'legacy');
	assert.equal('uid' in snapshot.sync.pairs['@alpha'].item, false);
	assert.equal('enableUidDetection' in snapshot.sync.scalars, false);
	const reloaded = new api.PairMetaStorage(settings);
	assert.equal(reloaded.mergeRemote(snapshot), false);
	assert.equal(reloaded.getPair('@alpha').ucid, UCID);
});

test('canonical UCID fields take priority over legacy aliases', () => {
	const { pairs } = setup({ gmStore: { pair_meta_v1: { version: 1, enableUcidDetection: false, enableUidDetection: true, pairs: [{ ...storedPair(), uid: OTHER_UCID, lastResolvedUcid: null, lastResolvedUid: OTHER_UCID }] } } });
	assert.equal(pairs.isUcidDetectionEnabled(), false);
	assert.equal(pairs.getPair('@alpha').ucid, UCID);
	assert.equal(pairs.getPair('@alpha').lastResolvedUcid, null);
});

test('rejected migrations preserve the stored legacy snapshot', () => {
	const legacy = { version: 1, pairs: [{ handle: '@alpha', uid: UCID }] };
	const { pairs, gmStore } = setup({ gmStore: { pair_meta_v1: legacy }, gmSetValue: () => { throw new Error('write failed'); } });
	assert.equal(gmStore.get('pair_meta_v1'), legacy);
	assert.ok(pairs.getLastSaveError());
	assert.equal(pairs.getPair('@alpha').ucid, UCID);
});

test('channel-page lookup uses only channel-owned metadata in both directions', async () => {
	const { service, context } = setup();
	const requests: string[] = [];
	context.fetch = async (url: string) => { requests.push(url); return { ok: true, text: async () => channelPage() }; };
	assert.equal((await service.resolveHandleToUcid('@alpha')).ucid, UCID);
	assert.equal((await service.resolveUcidToHandle(UCID)).handle, '@alpha');
	assert.equal(requests.join(','), 'https://www.youtube.com/@alpha,https://www.youtube.com/channel/' + UCID);
	context.fetch = async () => ({ ok: true, text: async () => '<script>var ytInitialData = {"contents":{"channelId":"' + UCID + '"}};</script>' });
	await assert.rejects(service.resolveHandleToUcid('@unrelated'));
});

test('reverse API lookup requests snippet and rejects missing handles or wrong UCIDs', async () => {
	const { service, settings, apiConfig, context } = setup();
	settings.setPairLookupMethod('update', 'api');
	apiConfig.setApiKey('test-key');
	let channel: any = { id: UCID, snippet: { customUrl: '@latest' } };
	context.fetch = async (url: string) => {
		const query = new URL(url).searchParams;
		assert.equal(query.get('part'), 'id,snippet');
		assert.equal(query.get('id'), UCID);
		assert.equal(query.has('forHandle'), false);
		return { ok: true, json: async () => ({ items: [channel] }) };
	};
	assert.equal((await service.resolveUcidToHandle(UCID)).handle, '@latest');
	for (const invalid of [{ id: UCID, snippet: { customUrl: 'legacy-name' } }, { id: OTHER_UCID, snippet: { customUrl: '@latest' } }, { id: UCID }]) {
		channel = invalid;
		await assert.rejects(service.resolveUcidToHandle(UCID, { force: true }));
	}
});

test('cancelled page requests never fall back to API', async () => {
	const { service, settings, apiConfig } = setup();
	settings.setPairLookupMethod('create', 'page-api');
	apiConfig.setApiKey('test-key');
	service._resolveChannelFromPage = async () => { throw Object.assign(new Error('cancelled'), { code: 'cancelled' }); };
	service._resolveChannelFromApi = async () => { throw new Error('API must not be called'); };
	await assert.rejects(service.resolveHandleToUcid('@alpha'), (error: any) => error.code === 'cancelled');
});

test('cache separates stages and invalidates on policy and key changes', async () => {
	const { service, settings, apiConfig } = setup();
	let calls = 0;
	service._resolveChannelFromPage = async () => { calls++; return { ucid: UCID, handle: '@alpha', source: 'page' }; };
	service._resolveChannelFromApi = async () => { calls++; return { ucid: UCID, handle: '@alpha', source: 'api' }; };
	await service.resolveHandleToUcid('@alpha');
	await service.resolveHandleToUcid('@alpha');
	assert.equal(calls, 1);
	await service.resolveHandleToUcid('@alpha', { stage: 'onBlock' });
	assert.equal(calls, 2);
	settings.setPairLookupMethod('create', 'api');
	apiConfig.setApiKey('first-key');
	await service.resolveHandleToUcid('@alpha');
	apiConfig.setApiKey('second-key');
	await service.resolveHandleToUcid('@alpha');
	assert.equal(calls, 4);
});

test('updates replace the old handle without changing its UCID', async () => {
	const { service, storage, pairs } = setup();
	storage.addHandle('@alpha'); storage.addId(UCID); pairs.upsertPair(storedPair());
	service.resolveUcidToHandle = async (ucid: string) => { assert.equal(ucid, UCID); return { ucid, handle: '@latest', source: 'page' }; };
	service.resolveHandleToUcid = async () => { throw new Error('Old handle must not be re-resolved'); };
	const stats = await service.updatePairsForHandles(['@alpha']);
	assert.equal(stats.refreshed, 1);
	assert.equal(pairs.getPair('@alpha'), null);
	assert.equal(pairs.getPair('@latest').ucid, UCID);
	assert.equal(storage.all().filter((item: any) => item.type === 'handle').map((item: any) => item.value).join(','), '@latest');
	assert.equal(storage.all().filter((item: any) => item.type === 'id').map((item: any) => item.value).join(','), UCID);
	assert.equal(pairs._snapshot().sync.pairs['@alpha'].deleted, true);
});

test('lookup failures and handle conflicts preserve existing blocking', async () => {
	const { service, storage, pairs } = setup();
	storage.addHandle('@alpha'); storage.addId(UCID); pairs.upsertPair(storedPair());
	pairs.upsertPair(storedPair('@occupied', OTHER_UCID));
	service.resolveUcidToHandle = async () => ({ ucid: UCID, handle: '@occupied', source: 'page' });
	assert.equal((await service.updatePairsForHandles(['@alpha'])).failed, 1);
	assert.equal(pairs.getPair('@alpha').ucid, UCID);
	assert.equal(pairs.getPair('@occupied').ucid, OTHER_UCID);
	service.resolveUcidToHandle = async () => { throw new Error('channel unavailable'); };
	assert.equal((await service.updatePairsForHandles(['@alpha'])).failed, 1);
	assert.ok(storage.all().some((item: any) => item.value === '@alpha'));
});

test('a block removed during lookup is not recreated', async () => {
	const { service, storage, pairs } = setup();
	storage.addHandle('@alpha');
	let release: () => void = () => {};
	service.resolveHandleToUcid = async () => { await new Promise<void>(resolve => { release = resolve; }); return { ucid: UCID, source: 'page' }; };
	const run = service.createPairsForHandles(['@alpha']);
	storage.remove({ type: 'handle', value: '@alpha' });
	release();
	assert.equal((await run).skipped, 1);
	assert.equal(pairs.getPair('@alpha'), null);
	assert.equal(storage.all().length, 0);
});

test('queued creation skips a pair completed by an earlier request', async () => {
	const { service, storage } = setup();
	storage.addHandle('@alpha');
	let release: () => void = () => {};
	let calls = 0;
	service.resolveHandleToUcid = async () => { calls++; await new Promise<void>(resolve => { release = resolve; }); return { ucid: UCID, source: 'page' }; };
	const first = service.createPairsForHandles(['@alpha'], { stage: 'onBlock' });
	const second = service.createPairsForHandles(['@alpha']);
	release();
	assert.equal((await first).created, 1);
	assert.equal((await second).skipped, 1);
	assert.equal(calls, 1);
});

test('failed pair rename rolls back only its rules and can retry', async () => {
	const { service, storage, pairs } = setup();
	storage.addHandle('@alpha'); storage.addId(UCID); pairs.upsertPair(storedPair());
	service.resolveUcidToHandle = async () => ({ ucid: UCID, handle: '@latest', source: 'page' });
	const replacePair = pairs.replacePair.bind(pairs);
	pairs.replacePair = () => { storage.addHandle('@unrelated'); return { ok: false, error: new Error('pair write failed') }; };
	const first = await service.updatePairsForHandles(['@alpha']);
	assert.equal(first.refreshed, 0);
	assert.ok(first.persistenceFailures >= 1);
	assert.ok(storage.all().some((item: any) => item.value === '@alpha'));
	assert.ok(storage.all().some((item: any) => item.value === '@unrelated'));
	assert.equal(storage.all().some((item: any) => item.value === '@latest'), false);
	pairs.replacePair = replacePair;
	assert.equal((await service.updatePairsForHandles(['@alpha'])).refreshed, 1);
});

test('successful storage refresh clears a previous transient write error', () => {
	const { storage } = setup();
	storage.addHandle('@alpha');
	storage._lastSaveError = new Error('previous failure');
	assert.equal(storage.refreshFromStorage(), true);
	assert.equal(storage.getLastSaveError(), null);
});

test('failed migration of an unversioned snapshot permits a later retry', () => {
	let fail = true;
	const legacy = { pairs: [{ handle: '@alpha', uid: UCID }] };
	const { pairs } = setup({ gmStore: { pair_meta_v1: legacy }, gmSetValue: () => { if (fail) throw new Error('temporary write failure'); } });
	assert.ok(pairs.getLastSaveError());
	fail = false;
	assert.equal(pairs.refreshFromStorage(), true);
	assert.equal(pairs.upsertPair(storedPair()).ok, true);
});

test('explicit keyword pairing uses the creation policy without starting an on-block request', async () => {
	const { api, settings, storage, pairs, apiConfig, service } = setup();
	settings.setPairLookupMethod('create', 'api');
	apiConfig.setApiKey('test-key');
	service._resolveChannelFromPage = async () => { throw new Error('On-block page policy must not run'); };
	service._resolveChannelFromApi = async () => ({ ucid: UCID, handle: '@alpha', source: 'api' });
	let pending: Promise<any> = Promise.resolve();
	const app = Object.assign(Object.create(api.App.prototype), {
		settings, storage, pairStore: pairs,
		pairService: { createPairsForHandles: (...args: any[]) => { pending = service.createPairsForHandles(...args); return pending; } },
		logger: { info: () => {} }, hider: { rebuildLookup: () => {} },
		_keywordPairInFlight: new Set(), _scheduleKeywordRefresh: () => {},
		_resolveAddedHandle: () => { throw new Error('Duplicate on-block lookup'); }
	});
	app._handleKeywordMatch({ handle: '@alpha', actions: { blockHandle: true, createPair: true } });
	assert.equal((await pending).created, 1);
	assert.equal(pairs.getPair('@alpha').source, 'api');
});

test('schema v2 pair changes reach the app cross-tab listener', () => {
	const { api, pairs, storage, settings, apiConfig, dispatchGMValueChange } = setup();
	let refreshes = 0;
	const app = Object.assign(Object.create(api.App.prototype), {
		pairStore: pairs, storage, settings, apiConfig,
		refreshAfterStorageChange: () => { refreshes++; }
	});
	app._syncAcrossTabs();
	dispatchGMValueChange('pair_meta_v1', { version: 2, enableUcidDetection: true, pairs: [storedPair()] });
	assert.equal(refreshes, 1);
	assert.equal(pairs.getPair('@alpha').ucid, UCID);
	assert.equal(pairs.isUcidDetectionEnabled(), true);
});

function managerSetup() {
	const loaded = setup();
	const { api, pairs, storage, settings, apiConfig, service } = loaded;
	const manager = new api.BlockListManager({
		pairStore: pairs, storage, settings, apiConfig, pairService: service,
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});
	return { ...loaded, manager };
}

test('settings navigation preserves unsaved API input and translates all menu labels', () => {
	const { manager, api, document, setLang } = managerSetup();
	manager.openSettings();
	const navigation = document.querySelector('.tm-settings-nav');
	assert.equal(navigation.querySelectorAll('button').length, 8);
	const password = document.querySelectorAll('input').find((input: any) => input.type === 'password');
	password.value = 'unsaved-draft';
	password.dispatchEvent({ type: 'input' });
	const destination = navigation.querySelectorAll('button').find((button: any) => button.dataset.section === 'pairing');
	destination.click();
	assert.equal(destination.getAttribute('aria-current'), 'location');
	assert.equal(document.activeElement.id, 'tm-settings-pairing');
	setLang('en'); api.Dialog.refreshAll();
	assert.equal(password.value, 'unsaved-draft');
	assert.equal(destination.textContent, 'Pairing');
	assert.equal(document.querySelectorAll('select').filter((select: any) => select.dataset.setting?.startsWith('pair-lookup-')).length, 3);
	assert.equal(document.querySelectorAll('button').some((button: any) => button.textContent === 'Create Pair'), false);
});

test('list exposes pair operations without a key and returns from settings with its selection', async () => {
	const { manager, api, document, storage } = managerSetup();
	storage.addHandle('@alpha');
	manager._listViewState.selection = ['h:@alpha'];
	manager.openList();
	assert.equal(document.querySelectorAll('input').some((input: any) => input.type === 'password'), false);
	const create = document.querySelectorAll('button').find((button: any) => button.textContent === 'Pair 생성');
	assert.equal(create.disabled, false);
	const before = manager._listViewState.selection.join(',');
	document.querySelectorAll('button').find((button: any) => button.textContent === '설정 열기').click();
	const back = document.querySelectorAll('button').find((button: any) => button.textContent === '차단 목록으로 돌아가기');
	api.Dialog.refreshAll();
	assert.equal(back.textContent, '차단 목록으로 돌아가기');
	back.click();
	await Promise.resolve();
	assert.equal(document.querySelectorAll('.tm-dialog').length, 1);
	assert.equal(manager._listViewState.selection.join(','), before);
});
