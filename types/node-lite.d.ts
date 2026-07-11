declare const __dirname: string;

declare const require: {
	(id: string): any;
	main?: any;
};

declare const module: {
	exports: any;
};

declare const process: {
	argv: string[];
	execPath: string;
	exit(code?: number): never;
};

declare module 'node:child_process' {
	export function execFileSync(
	file: string,
	args: string[],
	options?: { cwd?: string; encoding?: string; stdio?: string }
	): string;
}

declare module 'node:fs' {
	const fs: {
		readFileSync(path: string, encoding: string): string;
		writeFileSync(path: string, data: string, encoding: string): void;
	};
	export default fs;
}

declare module 'node:path' {
	const path: {
		dirname(value: string): string;
		join(...parts: string[]): string;
		resolve(...parts: string[]): string;
	};
	export default path;
}

declare module 'node:vm' {
	const vm: {
		createContext(contextObject: any): any;
		runInContext(code: string, contextifiedObject: any, options?: { filename?: string }): any;
	};
	export default vm;
}

declare module 'node:test' {
	type TestFn = (name: string, fn: () => void | Promise<void>) => void;
	const test: TestFn;
	export default test;
}

declare module 'node:assert/strict' {
	const assert: {
		equal(actual: any, expected: any, message?: string): void;
		deepEqual(actual: any, expected: any, message?: string): void;
		ok(value: any, message?: string): void;
		match(value: string, regexp: RegExp, message?: string): void;
		doesNotMatch(value: string, regexp: RegExp, message?: string): void;
	};
	export default assert;
}
