import test from 'node:test';
import assert from 'node:assert/strict';
import { createManagerListController } from '../src/12a-manager-list.ts';

test('manager list controller owns transient state and invalidates work on dispose', () => {
	const state = createManagerListController({
		selection: ['h:@saved'],
		tagFilters: ['paired'],
		searchQuery: 'saved',
		page: 2
	}, new Set(['paired', 'stale']));
	const operation = state.beginAsync();

	assert.deepEqual(Array.from(state.selection), ['h:@saved']);
	assert.deepEqual(Array.from(state.tagFilters), ['paired']);
	assert.equal(state.searchQuery, 'saved');
	assert.equal(state.page, 2);
	assert.equal(state.isCurrent(operation), true);

	state.dispose();

	assert.equal(state.isCurrent(operation), false);
	assert.equal(state.regexMatchCache.size, 0);
	assert.equal(state.rowRefs.size, 0);
	assert.equal(state.searchIndexCache, null);
	assert.equal(state.viewStateCache, null);
});

test('a newer list operation invalidates the previous operation', () => {
	const state = createManagerListController({}, new Set());
	const first = state.beginAsync();
	const second = state.beginAsync();

	assert.equal(state.isCurrent(first), false);
	assert.equal(state.isCurrent(second), true);
	state.dispose();
});
