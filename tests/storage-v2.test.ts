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

function snapshot(store: Map<string, unknown>) {
	return store.get('blocked_v2');
}

test('concurrent block-list additions converge without dropping either entry', () => {
	const left = createStorage({});
	const right = createStorage({});
	left.storage.addHandle('@alpha');
	right.storage.addHandle('@beta');

	right.storage.mergeRemote(snapshot(left.store));
	left.storage.mergeRemote(snapshot(right.store));

	assert.equal(Array.from(left.storage.all(), (item: any) => item.value).sort().join(','), '@alpha,@beta');
	assert.equal(Array.from(right.storage.all(), (item: any) => item.value).sort().join(','), '@alpha,@beta');
});

test('concurrent add, delete, and clear operations converge deterministically', () => {
	const initial = { blocked_v2: { version: 2, updatedAt: 1, items: [{ type: 'handle', value: '@base' }] } };
	const left = createStorage(initial);
	const right = createStorage(initial);
	left.storage.remove({ type: 'handle', value: '@base' });
	right.storage.addHandle('@new');
	right.storage.mergeRemote(snapshot(left.store));
	left.storage.mergeRemote(snapshot(right.store));
	assert.equal(Array.from(left.storage.all(), (item: any) => item.value).sort().join(','), Array.from(right.storage.all(), (item: any) => item.value).sort().join(','));

	const clearer = createStorage({ blocked_v2: snapshot(left.store) as any });
	const adder = createStorage({ blocked_v2: snapshot(left.store) as any });
	clearer.storage.clear();
	adder.storage.addHandle('@after-clear');
	adder.storage.mergeRemote(snapshot(clearer.store));
	clearer.storage.mergeRemote(snapshot(adder.store));
	assert.equal(Array.from(clearer.storage.all(), (item: any) => item.value).sort().join(','), Array.from(adder.storage.all(), (item: any) => item.value).sort().join(','));
});
