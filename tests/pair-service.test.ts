import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

function createService() {
	const { api } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	return {
		api,
		storage,
		pairStore,
		service: new api.PairService(storage, pairStore, apiConfig, settings)
	};
}

test('default pair update skips fresh verified pairs', async () => {
	const { storage, pairStore, service } = createService();
	storage.addHandle('@alpha');
	storage.addId('UC1234567890');
	pairStore.upsertPair({
		handle: '@alpha',
		uid: 'UC1234567890',
		verifiedAt: Date.now(),
		status: 'verified',
		source: 'youtube-data-api-v3'
	});
	let resolveCalls = 0;
	service.resolveHandle = async () => {
		resolveCalls += 1;
		return { uid: 'UC1234567890', source: 'youtube-data-api-v3' };
	};

	const stats = await service.updatePairs({ includeMissing: true });

	assert.equal(resolveCalls, 0);
	assert.equal(stats.skipped, 1);
	assert.equal(stats.items[0].outcome, 'skipped');
});

test('selected-handle pair update still forces refresh', async () => {
	const { storage, pairStore, service } = createService();
	storage.addHandle('@alpha');
	storage.addId('UC1234567890');
	pairStore.upsertPair({
		handle: '@alpha',
		uid: 'UC1234567890',
		verifiedAt: Date.now(),
		status: 'verified',
		source: 'youtube-data-api-v3'
	});
	const seen: string[] = [];
	service.resolveHandle = async (handle: string) => {
		seen.push(handle);
		return { uid: 'UC1234567890', source: 'youtube-data-api-v3' };
	};

	const stats = await service.updatePairsForHandles(['@alpha']);

	assert.deepEqual(seen, ['@alpha']);
	assert.equal(stats.refreshed, 1);
});

test('UID-only pair updates verify the stored UID without handle lookup', async () => {
	const { storage, pairStore, service } = createService();
	storage.addHandle('@alpha');
	storage.addId('UC1234567890');
	pairStore.upsertPair({
		handle: '@alpha',
		uid: 'UC1234567890',
		verifiedAt: Date.now() - (8 * 24 * 60 * 60 * 1000),
		status: 'verified',
		source: 'youtube-data-api-v3'
	});
	service.settings.setPairUpdateUidCheckEnabled(true);
	service.settings.setPairUpdateHandleLookupEnabled(false);
	let uidCalls = 0;
	let handleCalls = 0;
	service.resolveUid = async () => {
		uidCalls += 1;
		return { uid: 'UC1234567890', source: 'youtube-data-api-v3' };
	};
	service.resolveHandle = async () => {
		handleCalls += 1;
		return { uid: 'UC1234567890', source: 'youtube-data-api-v3' };
	};

	const stats = await service.updatePairsForHandles(['@alpha']);

	assert.equal(uidCalls, 1);
	assert.equal(handleCalls, 0);
	assert.equal(stats.refreshed, 1);
	assert.equal(pairStore.getPair('@alpha').status, 'verified');
});

test('pair creation always resolves handle to UID', async () => {
	const { storage, service } = createService();
	storage.addHandle('@alpha');
	service.settings.setPairUpdateUidCheckEnabled(true);
	service.settings.setPairUpdateHandleLookupEnabled(false);
	let handleCalls = 0;
	service.resolveHandle = async () => {
		handleCalls += 1;
		return { uid: 'UC1234567890', source: 'youtube-data-api-v3' };
	};

	const stats = await service.createMissingPairs();

	assert.equal(handleCalls, 1);
	assert.equal(stats.created, 1);
});

test('api config tracks repeated quota failures for guidance', () => {
	const { api } = loadUserscript();
	const apiConfig = new api.ApiConfigStorage();

	apiConfig.setLastTestResult({
		checkedAt: 1000,
		ok: false,
		category: 'quota',
		httpStatus: 403,
		message: 'quota exceeded'
	});
	assert.equal(apiConfig.getQuotaGuidance(), null);

	apiConfig.setLastTestResult({
		checkedAt: 2000,
		ok: false,
		category: 'quota',
		httpStatus: 403,
		message: 'quota exceeded'
	});

	const guidance = apiConfig.getQuotaGuidance();
	assert.equal(guidance.count, 2);
	assert.equal(guidance.lastFailureAt, 2000);
	assert.equal(guidance.resetAt, 86402000);
});

test('pair notice stays dismissed for the stale interval', () => {
	const { storage, pairStore, service } = createService();
	const now = Date.now();
	const dayMs = 24 * 60 * 60 * 1000;
	storage.addHandle('@alpha');
	storage.addId('UC1234567890');
	pairStore.setUidDetectionEnabled(true);
	pairStore.upsertPair({
		handle: '@alpha',
		uid: 'UC1234567890',
		verifiedAt: now - (8 * dayMs),
		status: 'verified',
		source: 'youtube-data-api-v3'
	});

	pairStore.dismissNotification(now - (2 * dayMs));
	assert.equal(service.shouldNotify(), false);

	pairStore.dismissNotification(now - (8 * dayMs));
	assert.equal(service.shouldNotify(), true);
});

test('pair notice waits after a recent pair check', () => {
	const { storage, pairStore, service } = createService();
	const now = Date.now();
	const dayMs = 24 * 60 * 60 * 1000;
	storage.addHandle('@alpha');
	storage.addId('UC1234567890');
	pairStore.setUidDetectionEnabled(true);
	pairStore.upsertPair({
		handle: '@alpha',
		uid: 'UC1234567890',
		verifiedAt: now - (8 * dayMs),
		status: 'verified',
		source: 'youtube-data-api-v3'
	});

	pairStore.setLastPairCheckAt(now - (2 * dayMs));
	assert.equal(service.shouldNotify(), false);

	pairStore.setLastPairCheckAt(now - (8 * dayMs));
	assert.equal(service.shouldNotify(), true);
});
