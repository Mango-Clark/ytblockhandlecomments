import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

function createBlockedComment(document: any, handle = '@alpha', uid = '') {
	const comment = document.createElement('ytd-comment-renderer');
	const author = document.createElement('div');
	author.id = 'author-text';
	const span = document.createElement('span');
	span.textContent = handle;
	const dislike = document.createElement('button');
	dislike.setAttribute('aria-label', 'Dislike');

	author.appendChild(span);
	if (uid) {
		const channel = document.createElement('a');
		channel.setAttribute('href', `/channel/${uid}`);
		author.appendChild(channel);
	}
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

test('pair match mode uses UID rules instead of handle rules', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment } = createBlockedComment(document, '@alpha', 'UC1234567890');

	storage.addHandle('@alpha');
	storage.addId('UC1234567890');
	pairStore.setUidDetectionEnabled(true);
	settings.setBlockMatchMode('pair');
	hider.rebuildLookup();
	hider.applyHide(comment);

	assert.equal(comment.classList.contains('tm-hidden'), true);

	const { comment: handleOnlyComment } = createBlockedComment(document, '@alpha', 'UC0987654321');
	hider.applyHide(handleOnlyComment);
	assert.equal(handleOnlyComment.classList.contains('tm-hidden'), false);
});

test('keyword automation dislikes once and registers the matching handle', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	let hider: any = null;
	const matched: any[] = [];
	hider = new api.CommentHider(storage, pairStore, settings, (match: any) => {
		matched.push(match);
		storage.addHandle(match.handle);
		hider.rebuildLookup();
	});
	const { comment, dislike } = createBlockedComment(document, '@promo');
	const content = document.createElement('div');
	content.id = 'content-text';
	content.textContent = 'This is spam content';
	comment.appendChild(content);
	let clicks = 0;
	dislike.addEventListener('click', () => { clicks += 1; });
	settings.setKeywordAutomation({
		keywords: ['spam'],
		fields: { commentText: true, handle: false, pinned: false },
		actions: { dislike: true, blockHandle: true, createPair: false }
	});

	hider.applyHide(comment);
	hider.applyHide(comment);

	assert.equal(clicks, 1);
	assert.equal(matched.length, 1);
	assert.equal(matched[0].handle, '@promo');
	assert.equal(matched[0].field, 'commentText');
	assert.equal(storage.all().some((item: any) => item.type === 'handle' && item.value === '@promo'), true);
	assert.equal(comment.classList.contains('tm-hidden'), true);
});

test('keyword automation can match the pinned label without scanning comment text', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const hider = new api.CommentHider(storage, pairStore, settings);
	const { comment, dislike } = createBlockedComment(document, '@alpha');
	const pinned = document.createElement('div');
	pinned.id = 'pinned-comment-badge';
	pinned.textContent = 'Pinned by channel owner';
	comment.appendChild(pinned);
	let clicks = 0;
	dislike.addEventListener('click', () => { clicks += 1; });
	settings.setKeywordAutomation({
		keywords: ['pinned'],
		fields: { commentText: false, handle: false, pinned: true },
		actions: { dislike: true, blockHandle: false, createPair: false }
	});

	hider.applyHide(comment);

	assert.equal(clicks, 1);
});

test('keyword UID-pair action adds the handle and queues pair creation once', async () => {
	const { api, document, context } = loadUserscript();
	context.addEventListener = () => {};
	const app = new api.App();
	app.apiConfig.setApiKey('test-key');
	app.settings.setKeywordAutomation({
		keywords: ['promo'],
		fields: { commentText: false, handle: true, pinned: false },
		actions: { dislike: false, blockHandle: false, createPair: true }
	});
	let pairCalls = 0;
	app.pairService.createPairsForHandles = async (handles: string[]) => {
		pairCalls += 1;
		assert.deepEqual(Array.from(handles), ['@promo']);
		return { created: 1, refreshed: 0, mismatches: 0, failed: 0, addedIds: 1, skipped: 0, items: [] };
	};
	const { comment } = createBlockedComment(document, '@promo');

	app.hider.applyHide(comment);
	app.hider.applyHide(comment);
	await Promise.resolve();

	assert.equal(app.storage.all().some((item: any) => item.type === 'handle' && item.value === '@promo'), true);
	assert.equal(pairCalls, 1);
});
