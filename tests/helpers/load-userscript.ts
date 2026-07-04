
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createDom } = require('./fake-dom.ts');

type LoadOptions = {
	gmStore?: Record<string, unknown>;
	url?: string;
	language?: string;
};
type TestContext = {
	[key: string]: any;
};
type AnimationFrameCallback = (time: number) => void;

class FakeMutationObserver {
	[key: string]: any;
	constructor(callback: (records: any[]) => void) {
		this.callback = callback;
		this.observeCalls = [];
		this.disconnected = false;
	}

	observe(target: any, options: any) {
		this.observeCalls.push({ target, options });
	}

	disconnect() {
		this.disconnected = true;
	}
}

class FakeIntersectionObserver {
	[key: string]: any;
	constructor(callback: (entries: any[]) => void) {
		this.callback = callback;
		this.observeCalls = [];
		this.disconnected = false;
	}

	observe(target: any) {
		this.observeCalls.push(target);
	}

	unobserve() {}

	disconnect() {
		this.disconnected = true;
	}
}

function loadUserscript(options: LoadOptions = {}) {
	const { document, Node, Element } = createDom();
	const gmStore = new Map(Object.entries(options.gmStore || {}));
	const hook = { skipBootstrap: true };
	const location = new URL(options.url || 'https://www.youtube.com/watch?v=video-a');
	let perfNow = 0;

	const context: TestContext = {
		console,
		Node,
		Element,
		document,
		location,
		navigator: { language: options.language || 'ko-KR' },
		URL,
		URLSearchParams,
		MutationObserver: FakeMutationObserver,
		IntersectionObserver: FakeIntersectionObserver,
		performance: {
			now: () => {
				perfNow += 0.25;
				return perfNow;
			}
		},
		requestAnimationFrame: (callback: AnimationFrameCallback) => {
			callback(0);
			return 1;
		},
		cancelAnimationFrame: () => {},
		setTimeout,
		clearTimeout,
		fetch: async () => {
			throw new Error('fetch not stubbed in test');
		},
		GM_info: { script: { version: '0.5.1-test' } },
		GM_getValue: (key: string, fallback: unknown) => (gmStore.has(key) ? gmStore.get(key) : fallback),
		GM_setValue: (key: string, value: unknown) => {
			gmStore.set(key, value);
		},
		GM_addValueChangeListener: () => 0,
		GM_registerMenuCommand: () => 1,
		GM_unregisterMenuCommand: () => {},
		__YT_BLOCK_TEST_HOOK__: hook
	};
	context.window = context;
	context.self = context;
	context.globalThis = context;

	const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'ytblockhandlecomments.js'), 'utf8');
	vm.createContext(context);
	vm.runInContext(source, context, { filename: 'ytblockhandlecomments.js' });

	return {
		api: hook,
		context,
		document,
		gmStore,
		setLang: (lang: string) => context.GM_setValue('lang', lang),
		setLocation: (href: string) => {
			const next = new URL(href);
			context.location = next;
			context.window.location = next;
		}
	};
}

module.exports = {
	loadUserscript
};
