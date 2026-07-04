/* eslint-disable @typescript-eslint/no-explicit-any */

declare const TEST_HOOK: any;

interface ArrayConstructor {
	from(arrayLike: any, mapfn?: any, thisArg?: any): any[];
}

interface Window {
	__YT_BLOCK_TEST_HOOK__?: any;
	__ytCommentBlockerPerf?: any;
}

interface EventTarget {
	closest?(selectors: string): any;
	getAttribute?(name: string): any;
	isContentEditable?: boolean;
	tagName?: string;
	textContent?: string;
}

interface Node {
	[key: string]: any;
}

interface Element {
	[key: string]: any;
}

declare const GM_info: {
	script?: {
		version?: string;
	};
};

declare function GM_getValue(key: string, fallback?: any): any;
declare function GM_setValue(key: string, value: any): void;
declare function GM_addValueChangeListener(
	key: string,
	callback: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): void;
declare function GM_registerMenuCommand(label: string, callback: () => void): any;
declare function GM_unregisterMenuCommand(id: any): void;
