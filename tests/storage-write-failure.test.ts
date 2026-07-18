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

test('preserves pair metadata when Tampermonkey rejects a write', () => {
	const { api } = loadWithWriteFailure();
	const store = new api.PairMetaStorage(new api.AppSettingsStorage());
	store.setUidDetectionEnabled(true);
	assert.equal(store.isUidDetectionEnabled(), false);
	assert.ok(store.getLastSaveError());
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
