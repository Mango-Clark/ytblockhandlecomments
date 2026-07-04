import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

function createBlockedComment(document: any, handle = '@alpha') {
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

function createCommentThread(document: any) {
	const thread = document.createElement('ytd-comment-thread-renderer');
	const top = createBlockedComment(document, '@blocked');
	const reply = createBlockedComment(document, '@reply');

	thread.append(top.comment, reply.comment);
	document.body.appendChild(thread);
	thread.isConnected = true;
	return { thread, top, reply };
}

test('default dislike mode hides without auto dislike', () => {
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
	assert.equal(clicks, 0);
	assert.equal(comment.classList.contains('tm-hidden'), true);
	assert.equal(settings.getDislikeMode(), 'none');
});

test('new-hidden dislike mode dislikes once before hiding', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment, dislike } = createBlockedComment(document);
	let clicks = 0;

	dislike.addEventListener('click', () => { clicks += 1; });
	settings.setDislikeMode('new-hidden');
	storage.addHandle('@alpha');
	hider.rebuildLookup();

	hider.applyHide(comment);
	assert.equal(clicks, 1);
	assert.equal(comment.classList.contains('tm-hidden'), true);

	hider.applyHide(comment);
	assert.equal(clicks, 1);
});

test('dislike mode can disable auto dislike', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment, dislike } = createBlockedComment(document);
	let clicks = 0;

	dislike.addEventListener('click', () => { clicks += 1; });
	settings.setDislikeMode('none');
	storage.addHandle('@alpha');
	hider.rebuildLookup();

	hider.applyHide(comment);

	assert.equal(clicks, 0);
	assert.equal(comment.classList.contains('tm-hidden'), true);
});

test('always dislike mode tries hidden comments once', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment, dislike } = createBlockedComment(document);
	let clicks = 0;

	dislike.addEventListener('click', () => { clicks += 1; });
	settings.setDislikeMode('none');
	storage.addHandle('@alpha');
	hider.rebuildLookup();
	hider.applyHide(comment);

	settings.setDislikeMode('always');
	hider.applyHide(comment);
	hider.applyHide(comment);

	assert.equal(clicks, 1);
	assert.equal(comment.classList.contains('tm-hidden'), true);
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

test('thread refresh hides only matching comment node', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { thread, top, reply } = createCommentThread(document);

	storage.addHandle('@blocked');
	hider.rebuildLookup();

	hider.refreshNodes([thread]);

	assert.equal(thread.classList.contains('tm-hidden'), false);
	assert.equal(top.comment.classList.contains('tm-hidden'), true);
	assert.equal(reply.comment.classList.contains('tm-hidden'), false);
});

test('placeholder mode replaces blocked comment without hiding node', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment } = createBlockedComment(document);

	settings.setCommentBlockMode('placeholder');
	storage.addHandle('@alpha');
	hider.rebuildLookup();

	hider.applyHide(comment);

	assert.equal(comment.classList.contains('tm-hidden'), false);
	assert.equal(comment.classList.contains('tm-block-placeholder-mode'), true);
	assert.equal(comment.querySelector('.tm-block-placeholder').textContent, '차단되었습니다');
});

test('placeholder reveal mode toggles revealed state', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment } = createBlockedComment(document);

	settings.setCommentBlockMode('placeholder-reveal');
	storage.addHandle('@alpha');
	hider.rebuildLookup();

	hider.applyHide(comment);
	const placeholder = comment.querySelector('.tm-block-placeholder');
	placeholder.click();

	assert.equal(placeholder.tagName.toLowerCase(), 'button');
	assert.equal(comment.classList.contains('tm-block-revealed'), true);
});
