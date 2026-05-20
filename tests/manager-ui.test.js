'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUserscript } = require('./helpers/load-userscript');

test('manager search index filters handles and regex labels', () => {
	const { api } = loadUserscript();
	const items = [
		{ type: 'handle', value: '@alpha' },
		{ type: 'handle', value: '@beta' },
		{ type: 'regex', value: '^@promo', flags: 'i' }
	];
	const index = api.buildManagerSearchIndex(items);
	const handleResults = api.searchManagerIndex(index, 'alp');
	const regexResults = api.searchManagerIndex(index, 'prom');

	assert.equal(handleResults.length, 1);
	assert.equal(handleResults[0].type, 'handle');
	assert.equal(handleResults[0].value, '@alpha');
	assert.equal(regexResults.length, 1);
	assert.equal(regexResults[0].type, 'regex');
	assert.equal(regexResults[0].value, '^@promo');
	assert.equal(regexResults[0].flags, 'i');
});

test('pair result details preserve collapsed state across rerender', () => {
	const { api, document } = loadUserscript();
	const manager = new api.BlockListManager({});
	const container = document.createElement('div');
	const stats = {
		items: [{ handle: '@alpha', outcome: 'created', uid: 'UC1234567890' }]
	};

	manager._renderPairResultList(container, stats);
	const firstDetails = container.querySelector('details');
	assert.equal(firstDetails.open, true);

	firstDetails.open = false;
	manager._renderPairResultList(container, stats);

	assert.equal(container.querySelector('details').open, false);
});

test('dialog refresh reruns translated labels after language change', async () => {
	const { api, setLang } = loadUserscript();
	let refreshContext = null;
	const body = api.Dialog.show({
		title: '',
		body: '',
		buttons: [{ label: '', value: false, primary: true }],
		onRefresh: (ctx) => {
			refreshContext = ctx;
			ctx.setTitle(api.t('close'));
			ctx.buttons[0].textContent = api.t('close');
		}
	});

	assert.equal(refreshContext.header.textContent, '닫기');
	setLang('en');
	api.Dialog.refreshAll();
	assert.equal(refreshContext.header.textContent, 'Close');
	assert.equal(refreshContext.buttons[0].textContent, 'Close');

	refreshContext.buttons[0].click();
	await body;
});
