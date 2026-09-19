import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

function loadWithWriteFailure() {
	return loadUserscript({
		gmStore: { blocked_v2: { version: 2, updatedAt: 1, items: [] } },
		gmSetValue: () => { throw new Error('quota exceeded'); }
	});
}

test('preserves settings when Tampermonkey rejects a write', () => {
	const { api } = loadWithWriteFailure();
	const settings = new api.AppSettingsStorage();
	settings.setDislikeMode('always');
	assert.equal(settings.getDislikeMode(), 'none');
	assert.ok(settings.getLastSaveError());
});

test('preserves the block list when Tampermonkey rejects a write', () => {
	const { api } = loadWithWriteFailure();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	assert.equal(storage.addHandle('@blocked'), false);
	assert.equal(storage.all().length, 0);
	assert.ok(storage.getLastSaveError());
});

test('continues first block-list migration when Tampermonkey rejects a write', () => {
	const { api } = loadUserscript({
		gmStore: { blockedHandles: ['@legacy'] },
		gmSetValue: () => { throw new Error('quota exceeded'); }
	});
	const storage = new api.StorageV2(new api.AppSettingsStorage());
	assert.deepEqual(Array.from(storage.all()), []);
	assert.ok(storage.getLastSaveError());
});

test('retries first block-list migration after a transient write failure', () => {
	let failed = true;
	const { api, gmStore } = loadUserscript({
		gmStore: { blockedHandles: ['@legacy'] },
		gmSetValue: (key, value) => {
			if (failed) { failed = false; throw new Error('quota exceeded'); }
			gmStore.set(key, value);
		}
	});
	const settings = new api.AppSettingsStorage();
	const failedMigration = new api.StorageV2(settings);
	assert.deepEqual(Array.from(failedMigration.all()), []);
	const retriedMigration = new api.StorageV2(settings);
	assert.deepEqual(Array.from(retriedMigration.all(), (item: any) => item.value), ['@legacy']);
	assert.equal((gmStore.get('blocked_v2') as any)?.items[0]?.value, '@legacy');
});

test('preserves pair metadata when Tampermonkey rejects a write', () => {
	const { api } = loadWithWriteFailure();
	const store = new api.PairMetaStorage(new api.AppSettingsStorage());
	const result = store.upsertPair({ handle: '@alpha', uid: 'UC1234567890', status: 'verified', verifiedAt: Date.now(), source: 'test' });
	assert.equal(result.ok, false);
	assert.equal(store.getPair('@alpha'), null);
	store.setUidDetectionEnabled(true);
	assert.equal(store.isUidDetectionEnabled(), false);
	assert.ok(store.getLastSaveError());
});

test('reports failed API-test result persistence explicitly', async () => {
	const { api } = loadWithWriteFailure();
	const app = new api.App();
	const result = {
		checkedAt: Date.now(), ok: true, category: 'ok', httpStatus: 200, message: 'OK'
	};
	app.pairService.testApiKey = async () => result;
	const operation = await app.testApiKey();
	assert.equal(operation.ok, false);
	assert.equal(operation.result, result);
	assert.equal(app.apiConfig.getLastTestResult(), null);
});

test('preserves API keys when Tampermonkey rejects a write', () => {
	const { api } = loadWithWriteFailure();
	const config = new api.ApiConfigStorage();
	config.setApiKey('secret-key');
	assert.equal(config.getApiKey(), '');
	assert.ok(config.getLastSaveError());
});

test('does not clear logs when Tampermonkey rejects a write', () => {
	const { api } = loadWithWriteFailure();
	const logger = new api.Logger({ getLogging: () => ({ fileEnabled: true, consoleEnabled: false, level: 'debug', retention: 10 }) });
	assert.equal(logger.clear(), false);
	logger.info('write fails');
	assert.equal(logger.getEntries().length, 0);
	assert.ok(logger.getLastSaveError());
});

test('reports failed imports without changing the block list', async () => {
	for (const input of ['@blocked', JSON.stringify({ handles: ['@blocked'] })]) {
		const { api, document } = loadWithWriteFailure();
		const storage = new api.StorageV2(new api.AppSettingsStorage());
		const manager = new api.BlockListManager({ storage, refreshAfterStorageChange: () => {} });
		manager.importList();
		document.querySelector('textarea').value = input;
		document.querySelectorAll('button').find((button: any) => button.textContent === api.t('importBtn')).click();
		await Promise.resolve();
		assert.equal(storage.all().length, 0);
	}
});

test('pair updates report metadata persistence failures without success counts', async () => {
	const { api } = loadWithWriteFailure();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const service = new api.PairService(storage, pairStore, new api.ApiConfigStorage(), settings);
	service.resolveHandle = async () => ({ uid: 'UC1234567890', source: 'test' });

	const stats = await service.createPairsForHandles(['@alpha']);
	assert.equal(stats.created, 0);
	assert.ok(stats.failed >= 1);
	assert.ok((stats.persistenceFailures || 0) >= 1);
	assert.equal(pairStore.getPair('@alpha'), null);
});

test('pair updates report failed check timestamp persistence', async () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const service = new api.PairService(storage, pairStore, new api.ApiConfigStorage(), settings);
	service.resolveHandle = async () => ({ uid: 'UC1234567890', source: 'test' });
	pairStore.setLastPairCheckAt = () => ({ ok: false, value: pairStore.getState(), error: new Error('quota exceeded') });

	const stats = await service.createPairsForHandles(['@alpha']);
	assert.equal(stats.created, 1);
	assert.equal(stats.failed, 1);
	assert.equal(stats.persistenceFailures, 1);
	assert.equal(pairStore.getPair('@alpha')?.uid, 'UC1234567890');
});

test('pair updates roll back metadata when the UID block write fails', async () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const service = new api.PairService(storage, pairStore, new api.ApiConfigStorage(), settings);
	service.resolveHandle = async () => ({ uid: 'UC1234567890', source: 'test' });
	storage.addIdResult = () => ({ ok: false, value: { items: storage.all(), added: false }, error: new Error('quota exceeded') });

	const stats = await service.createPairsForHandles(['@alpha']);
	assert.equal(stats.created, 0);
	assert.equal(stats.failed, 1);
	assert.equal(stats.persistenceFailures, 1);
	assert.equal(pairStore.getPair('@alpha'), null);
});

test('pair updates report rollback persistence failures', async () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const service = new api.PairService(storage, pairStore, new api.ApiConfigStorage(), settings);
	service.resolveHandle = async () => ({ uid: 'UC1234567890', source: 'test' });
	storage.addIdResult = () => ({ ok: false, value: { items: storage.all(), added: false }, error: new Error('quota exceeded') });
	pairStore.removePair = () => ({ ok: false, value: pairStore.getState(), error: new Error('rollback quota exceeded') });

	const stats = await service.createPairsForHandles(['@alpha']);
	assert.equal(stats.created, 0);
	assert.ok((stats.persistenceFailures || 0) >= 2);
	assert.equal(pairStore.getPair('@alpha')?.uid, 'UC1234567890');
});

test('pair updates can retry after a transient metadata write failure', async () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const service = new api.PairService(storage, pairStore, new api.ApiConfigStorage(), settings);
	service.resolveHandle = async () => ({ uid: 'UC1234567890', source: 'test' });
	let failed = true;
	const upsertPair = pairStore.upsertPair.bind(pairStore);
	pairStore.upsertPair = (pair: any) => {
		if (failed) { failed = false; return { ok: false, value: pairStore.getState(), error: new Error('quota exceeded') }; }
		return upsertPair(pair);
	};

	const first = await service.createPairsForHandles(['@alpha']);
	const second = await service.createPairsForHandles(['@alpha']);
	assert.equal(first.created, 0);
	assert.equal(second.created, 1);
	assert.equal(pairStore.getPair('@alpha')?.uid, 'UC1234567890');
});

test('pair mismatch rolls back both stores when the new UID write fails', async () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const service = new api.PairService(storage, pairStore, new api.ApiConfigStorage(), settings);
	storage.addHandle('@alpha');
	storage.addId('UC1111111111');
	pairStore.upsertPair({ handle: '@alpha', uid: 'UC1111111111', status: 'verified', verifiedAt: Date.now(), source: 'test' });
	service.resolveHandle = async () => ({ uid: 'UC2222222222', source: 'test' });
	storage.addIdResult = () => ({ ok: false, value: { items: storage.all(), added: false }, error: new Error('quota exceeded') });

	const stats = await service.updatePairsForHandles(['@alpha']);
	assert.equal(stats.mismatches, 0);
	assert.ok(stats.failed >= 1);
	assert.equal(pairStore.getPair('@alpha')?.uid, 'UC1111111111');
	assert.ok(storage.all().some((item: any) => item.type === 'id' && item.value === 'UC1111111111'));
	assert.equal(storage.all().some((item: any) => item.type === 'id' && item.value === 'UC2222222222'), false);
});

test('pair mismatch reports rollback failure when restoration fails', async () => {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const service = new api.PairService(storage, pairStore, new api.ApiConfigStorage(), settings);
	storage.addHandle('@alpha');
	storage.addId('UC1111111111');
	pairStore.upsertPair({ handle: '@alpha', uid: 'UC1111111111', status: 'verified', verifiedAt: Date.now(), source: 'test' });
	service.resolveHandle = async () => ({ uid: 'UC2222222222', source: 'test' });
	storage.addIdResult = () => ({ ok: false, value: { items: storage.all(), added: false }, error: new Error('quota exceeded') });
	const upsertPair = pairStore.upsertPair.bind(pairStore);
	let writes = 0;
	pairStore.upsertPair = (pair: any) => {
		writes += 1;
		return writes === 1
			? upsertPair(pair)
			: { ok: false, value: pairStore.getState(), error: new Error('rollback quota exceeded') };
	};

	const stats = await service.updatePairsForHandles(['@alpha']);
	assert.ok((stats.persistenceFailures || 0) >= 2);
	assert.equal(pairStore.getPair('@alpha')?.uid, 'UC2222222222');
});

test('imports can retry after a failed persistence attempt', async () => {
	const { api, document } = loadUserscript();
	const storage = new api.StorageV2(new api.AppSettingsStorage());
	const manager = new api.BlockListManager({ storage, refreshAfterStorageChange: () => {} });
	const setAllResult = storage.setAllResult.bind(storage);
	let failed = true;
	storage.setAllResult = (items: any[]) => {
		if (failed) { failed = false; return { ok: false, value: storage.all(), error: new Error('quota exceeded') }; }
		return setAllResult(items);
	};
	manager.importList();
	document.querySelector('textarea').value = JSON.stringify({ handles: ['@retry'] });
	document.querySelectorAll('button').find((button: any) => button.textContent === api.t('importBtn')).click();
	await Promise.resolve();
	assert.equal(storage.all().length, 0);

	manager.importList();
	document.querySelector('textarea').value = JSON.stringify({ handles: ['@retry'] });
	document.querySelectorAll('button').find((button: any) => button.textContent === api.t('importBtn')).click();
	await Promise.resolve();
	assert.equal(storage.all()[0].value, '@retry');
});

test('imports use the legacy setAll contract when result helpers are unavailable', async () => {
	const { api, document } = loadUserscript();
	const items: any[] = [];
	let writes = 0;
	const storage = {
		all: () => items.slice(),
		setAll: (next: any[]) => { writes += 1; items.splice(0, items.length, ...next); return items.slice(); },
		getLastSaveError: () => null
	};
	const manager = new api.BlockListManager({ storage, refreshAfterStorageChange: () => {} });
	manager.importList();
	document.querySelector('textarea').value = '@legacy';
	document.querySelectorAll('button').find((button: any) => button.textContent === api.t('importBtn')).click();
	await Promise.resolve();
	assert.equal(writes, 1);
	assert.equal(items[0].value, '@legacy');
});

test('pair operation logs persistence failure counts', async () => {
	const { api } = loadUserscript();
	const app = new api.App();
	let logged: any = null;
	app.logger.warn = (_message: string, details: any) => { logged = details; };
	app.pairService.createMissingPairs = async () => ({ created: 0, refreshed: 0, mismatches: 0, failed: 1, addedIds: 0, skipped: 0, items: [], persistenceFailures: 2 });
	await app.runPairUpdate('create');
	assert.equal(logged.persistenceFailures, 2);
});
