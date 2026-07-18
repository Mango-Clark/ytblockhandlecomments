import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

function createStorage(gmStore: Record<string, unknown>) {
	const { api, gmStore: store } = loadUserscript({ gmStore });
	const settings = new api.AppSettingsStorage();
	return { api, store, settings, storage: new api.StorageV2(settings) };
}

test('migrates legacy stores only when blocked_v2 is absent', () => {
	const { storage, store } = createStorage({
		blockedHandles: ['@legacy'],
		blockedHandles_v1: { version: 1, handles: ['@v1'] }
	});

	assert.equal(Array.from(storage.all(), (item: any) => item.value).join(','), '@v1,@legacy');
	assert.equal((store.get('blocked_v2') as any)?.items.map((item: any) => item.value).join(','), '@v1,@legacy');
});

test('valid blocked_v2 never restores legacy entries on reload', () => {
	const gmStore = {
		blockedHandles: ['@legacy'],
		blockedHandles_v1: { version: 1, handles: ['@v1'] },
		blocked_v2: { version: 2, updatedAt: 1, items: [{ type: 'handle', value: '@current' }] }
	};
	const { api, store, settings, storage } = createStorage(gmStore);

	assert.equal(Array.from(storage.all(), (item: any) => item.value).join(','), '@current');
	storage.remove({ type: 'handle', value: '@current' });
	assert.equal(new api.StorageV2(settings).all().length, 0);

	store.set('blocked_v2', { version: 2, updatedAt: 2, items: [{ type: 'handle', value: '@current' }] });
	const restored = new api.StorageV2(settings);
	restored.clear();
	assert.equal(new api.StorageV2(settings).all().length, 0);
});
