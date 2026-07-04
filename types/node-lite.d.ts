/* eslint-disable @typescript-eslint/no-explicit-any */

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
	exit(code?: number): never;
};
