import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

function bindContextMenu() {
	const { api, document } = loadUserscript();
	api.App.prototype._bindGlobalEvents.call({
		hasHandleRule: () => false,
		addHandleRule: () => true,
		removeHandleRule: () => true
	});
	return { document };
}

function dispatchContextMenu(document: any, target: any) {
	const event = { type: 'contextmenu', target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
	document.dispatchEvent(event);
	return event.defaultPrevented;
}

test('comment author text and handle links are the only intercepted context menus', () => {
	const { document } = bindContextMenu();
	const comment = document.createElement('ytd-comment-renderer');
	const author = document.createElement('a');
	author.id = 'author-handle';
	author.setAttribute('href', '/@comment-author');
	author.textContent = '@comment-author';
	comment.appendChild(author);
	document.body.appendChild(comment);

	assert.equal(dispatchContextMenu(document, author), true);
});

test('non-author handle links keep the browser context menu', () => {
	const { document } = bindContextMenu();
	const channelLink = document.createElement('a');
	channelLink.setAttribute('href', '/@channel-page');
	channelLink.textContent = '@channel-page';
	document.body.appendChild(channelLink);

	const comment = document.createElement('ytd-comment-renderer');
	const bodyLink = document.createElement('a');
	bodyLink.setAttribute('href', '/@mentioned-channel');
	bodyLink.textContent = '@mentioned-channel';
	comment.appendChild(bodyLink);
	document.body.appendChild(comment);

	assert.equal(dispatchContextMenu(document, channelLink), false);
	assert.equal(dispatchContextMenu(document, bodyLink), false);
});
