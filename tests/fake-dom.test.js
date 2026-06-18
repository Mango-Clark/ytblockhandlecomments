'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDom } = require('./helpers/fake-dom');

test('fake DOM matches compound selectors and closest ancestors', () => {
	const { document } = createDom();
	const author = document.createElement('div');
	author.id = 'author-text';
	const span = document.createElement('span');
	author.appendChild(span);
	document.body.appendChild(author);

	assert.equal(span.matches('#author-text > span'), true);
	assert.equal(span.closest('#author-text > span'), span);
	assert.equal(span.closest('#author-text'), author);
});

test('fake DOM supports class, data, and attribute operators', () => {
	const { document } = createDom();
	const link = document.createElement('a');
	link.className = 'primary selected';
	link.setAttribute('href', '/@alpha');
	link.dataset.role = 'update';
	document.body.appendChild(link);

	assert.equal(document.querySelector('a.primary[href^="/@"]'), link);
	assert.equal(document.querySelector('a[href*="alpha"]'), link);
	assert.equal(document.querySelector('[data-role="update"]'), link);
});
