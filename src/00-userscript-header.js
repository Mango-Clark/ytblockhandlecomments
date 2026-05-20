// ==UserScript==
// @name         YouTube Comment Blocker
// @namespace    YouTube_Comment_Blocker
// @version      0.6.0
// @description  Block/unblock comment handles via right-click. Optional UID pairing via YouTube Data API, real-time hiding, custom popup, and block list management.
// @homepage     https://github.com/Mango-Clark/ytblockhandlecomments/
// @updateURL    https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
// @downloadURL  https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
// @author       Mango_Clark
// @match        https://www.youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-idle
// ==/UserScript==
(() => {
	'use strict';
	const TEST_HOOK = typeof globalThis === 'object' ? globalThis.__YT_BLOCK_TEST_HOOK__ || null : null;

