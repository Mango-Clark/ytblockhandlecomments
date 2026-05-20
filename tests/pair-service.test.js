'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUserscript } = require('./helpers/load-userscript');

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
	const seen = [];
	service.resolveHandle = async (handle) => {
		seen.push(handle);
		return { uid: 'UC1234567890', source: 'youtube-data-api-v3' };
	};

	const stats = await service.updatePairsForHandles(['@alpha']);

	assert.deepEqual(seen, ['@alpha']);
	assert.equal(stats.refreshed, 1);
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
