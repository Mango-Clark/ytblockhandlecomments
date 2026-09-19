import test from 'node:test';
import assert from 'node:assert/strict';
import { createManagerListController } from '../src/12a-manager-list.ts';
import { createManagerApiController } from '../src/12b-manager-settings.ts';
import { createManagerPairController } from '../src/12d-manager-pairing.ts';

test('manager list controller owns transient state and invalidates work on dispose', () => {
	const state = createManagerListController({
		selection: ['h:@saved'],
		tagFilters: ['paired'],
		searchQuery: 'saved',
		page: 2
	}, new Set(['paired', 'stale']));
	assert.deepEqual(Array.from(state.selection), ['h:@saved']);
	assert.deepEqual(Array.from(state.tagFilters), ['paired']);
	assert.equal(state.searchQuery, 'saved');
	assert.equal(state.page, 2);
	state.dispose();

	assert.equal(state.selection.size, 0);
	assert.equal(state.tagFilters.size, 0);
	assert.equal(state.expandedRegexKeys.size, 0);
	assert.equal(state.showAllRegexKeys.size, 0);
	assert.equal(state.regexMatchCache.size, 0);
	assert.equal(state.rowRefs.size, 0);
	assert.equal(state.searchIndexCache, null);
	assert.equal(state.viewStateCache, null);
});

test('API and pairing controllers keep independent operation generations', () => {
	const api = createManagerApiController();
	const pairing = createManagerPairController();
	const apiOperation = api.begin();
	const pairOperation = pairing.begin();

	assert.equal(api.isCurrent(apiOperation), true);
	assert.equal(pairing.isCurrent(pairOperation), true);
	api.begin();
	assert.equal(api.isCurrent(apiOperation), false);
	assert.equal(pairing.isCurrent(pairOperation), true);
	api.dispose();
	pairing.dispose();
});
