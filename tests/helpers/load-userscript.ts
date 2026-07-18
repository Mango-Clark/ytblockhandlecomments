import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createDom } from './fake-dom.ts';

type LoadOptions = {
	gmStore?: Record<string, unknown>;
	gmSetValue?: (key: string, value: unknown) => void;
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
		this.disconnected = false;
		this.observeCalls.push({ target, options });
	}

	disconnect() {
		this.disconnected = true;
	}

	trigger(records: any[] = []) {
		if (!this.disconnected) this.callback(records);
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

export function loadUserscript(options: LoadOptions = {}) {
	const { document, Node, Element } = createDom();
	const gmStore = new Map(Object.entries(options.gmStore || {}));
	const hook: TestContext = { skipBootstrap: true };
	const location = new URL(options.url || 'https://www.youtube.com/watch?v=video-a');
	const windowListeners = new Map<string, Set<(event: any) => void>>();
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
		addEventListener: (type: string, listener: (event: any) => void) => {
			if (!windowListeners.has(type)) windowListeners.set(type, new Set());
			windowListeners.get(type)?.add(listener);
		},
		dispatchEvent: (event: any) => {
			for (const listener of windowListeners.get(event?.type) || []) listener(event);
		},
		history: { pushState: () => {}, replaceState: () => {} },
		setTimeout,
		clearTimeout,
		fetch: async () => {
			throw new Error('fetch not stubbed in test');
		},
		GM_info: { script: { version: '0.5.1-test' } },
		GM_getValue: (key: string, fallback: unknown) => (gmStore.has(key) ? gmStore.get(key) : fallback),
		GM_setValue: (key: string, value: unknown) => options.gmSetValue ? options.gmSetValue(key, value) : gmStore.set(key, value),
		GM_addValueChangeListener: () => 0,
		GM_registerMenuCommand: () => 1,
		GM_unregisterMenuCommand: () => {},
		__YT_BLOCK_TEST_HOOK__: hook
	};
	context.window = context;
	context.self = context;
	context.globalThis = context;

	const source = fs.readFileSync(path.resolve('ytblockhandlecomments.js'), 'utf8');
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
