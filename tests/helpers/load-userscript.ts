import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createDom } from './fake-dom.ts';

type LoadOptions = {
	gmStore?: Record<string, unknown>;
	gmSetValue?: (key: string, value: unknown) => void;
	url?: string;
	language?: string;
	deferAnimationFrames?: boolean;
	skipBootstrap?: boolean;
};
type TestContext = {
	[key: string]: any;
};
type AnimationFrameCallback = (time: number) => void;
type GMValueChangeListener = (key: string, oldValue: unknown, newValue: unknown, remote: boolean) => void;

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

	trigger(entries: any[] = this.observeCalls.map((target: any) => ({ target, isIntersecting: true }))) {
		if (!this.disconnected) this.callback(entries);
	}

	disconnect() {
		this.disconnected = true;
	}
}

export function loadUserscript(options: LoadOptions = {}) {
	const { document, Node, Element } = createDom();
	const gmStore = new Map(Object.entries(options.gmStore || {}));
	const hook: TestContext = { skipBootstrap: options.skipBootstrap !== false };
	const location = new URL(options.url || 'https://www.youtube.com/watch?v=video-a');
	const windowListeners = new Map<string, Set<(event: any) => void>>();
	const gmValueListeners = new Map<string, GMValueChangeListener[]>();
	const animationFrames = new Map<number, AnimationFrameCallback>();
	let nextAnimationFrameId = 1;
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
			const id = nextAnimationFrameId++;
			if (options.deferAnimationFrames) animationFrames.set(id, callback);
			else callback(0);
			return id;
		},
		cancelAnimationFrame: (id: number) => { animationFrames.delete(id); },
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
		GM_addValueChangeListener: (key: string, listener: GMValueChangeListener) => {
			const listeners = gmValueListeners.get(key) || [];
			listeners.push(listener);
			gmValueListeners.set(key, listeners);
			return listeners.length;
		},
		GM_registerMenuCommand: () => 1,
		GM_unregisterMenuCommand: () => {},
		__YT_BLOCK_TEST_HOOK__: hook
	};
	context.window = context;
	context.self = context;
	context.globalThis = context;

	const source = fs.readFileSync(path.resolve('ytblockhandlecomments.js'), 'utf8');
	vm.createContext(context);
	const runUserscript = () => vm.runInContext(source, context, { filename: 'ytblockhandlecomments.js' });
	runUserscript();

	return {
		api: hook,
		context,
		document,
		gmStore,
		rerunUserscript: runUserscript,
		getPendingAnimationFrameCount: () => animationFrames.size,
		flushAnimationFrames: () => {
			const pending = Array.from(animationFrames.values());
			animationFrames.clear();
			for (const callback of pending) callback(0);
		},
		dispatchGMValueChange: (key: string, value: unknown, listenerIndex?: number) => {
			const listeners = gmValueListeners.get(key) || [];
			const selected = listenerIndex == null ? listeners : listeners.slice(listenerIndex, listenerIndex + 1);
			for (const listener of selected) listener(key, gmStore.get(key), value, true);
		},
		setLang: (lang: string) => context.GM_setValue('lang', lang),
		setLocation: (href: string) => {
			const next = new URL(href);
			context.location = next;
			context.window.location = next;
		}
	};
}
