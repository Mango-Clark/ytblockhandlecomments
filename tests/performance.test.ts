import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

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
