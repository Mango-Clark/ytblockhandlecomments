'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUserscript } = require('./helpers/load-userscript');

function createBlockedComment(document, handle = '@alpha') {
	const comment = document.createElement('ytd-comment-renderer');
	const author = document.createElement('div');
	author.id = 'author-text';
	const span = document.createElement('span');
	span.textContent = handle;
	const dislike = document.createElement('button');
	dislike.setAttribute('aria-label', 'Dislike');

	author.appendChild(span);
	comment.append(author, dislike);
	return { comment, dislike };
}

test('blocked comments are disliked once before hiding', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment, dislike } = createBlockedComment(document);
	let clicks = 0;

	dislike.addEventListener('click', () => { clicks += 1; });
	storage.addHandle('@alpha');
	hider.rebuildLookup();

	hider.applyHide(comment);
	assert.equal(clicks, 1);
	assert.equal(comment.classList.contains('tm-hidden'), true);

	hider.applyHide(comment);
	assert.equal(clicks, 1);
});

test('already disliked comments are hidden without toggling dislike off', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment, dislike } = createBlockedComment(document);
	let clicks = 0;

	dislike.setAttribute('aria-pressed', 'true');
	dislike.addEventListener('click', () => { clicks += 1; });
	storage.addHandle('@alpha');
	hider.rebuildLookup();

	hider.applyHide(comment);

	assert.equal(clicks, 0);
	assert.equal(comment.classList.contains('tm-hidden'), true);
});
