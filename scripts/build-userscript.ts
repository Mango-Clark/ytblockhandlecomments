import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(path.resolve(process.argv[1] || 'scripts/build-userscript.ts'));
const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'ytblockhandlecomments.js');
const headerPath = path.join(root, 'src', '00-userscript-header.ts');
const entryPoint = path.join(root, 'src', '14-bootstrap.ts');

type CompactState = 'normal' | 'single' | 'double' | 'regex' | 'regex-class' | 'template';

const normalizeNewlines = (value: unknown): string => String(value || '').replace(/\r\n/g, '\n');
const readRawSource = (file: string): string => normalizeNewlines(fs.readFileSync(file, 'utf8')).trimEnd();
const isWord = (ch: string | undefined): boolean => /[A-Za-z0-9_$]/.test(ch || '');
const needsSpace = (prev: string | undefined, next: string | undefined): boolean => isWord(prev) && isWord(next);
const canStartRegex = (prev: string | undefined): boolean => !prev || /[({[=,:;!&|?]/.test(prev);
const appendChar = (out: string[], ch: string): void => {
	if (ch === '\n') {
		if (out[out.length - 1] !== '\n') out.push(ch);
		return;
	}
	out.push(ch);
};
const compactBody = (source: string): string => {
	const out: string[] = [];
	let state: CompactState = 'normal';
	let pendingSpace = false;
	for (let i = 0; i < source.length; i += 1) {
		const ch = source[i];
		const next = source[i + 1];
		const prevOut = out[out.length - 1] || '';

		if (state === 'single' || state === 'double') {
			appendChar(out, ch);
			if (ch === '\\') {
				i += 1;
				appendChar(out, source[i] || '');
			} else if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"')) {
				state = 'normal';
			}
			continue;
		}

		if (state === 'regex') {
			appendChar(out, ch);
			if (ch === '\\') {
				i += 1;
				appendChar(out, source[i] || '');
			} else if (ch === '[') {
				state = 'regex-class';
			} else if (ch === '/') {
				while (/[A-Za-z]/.test(source[i + 1] || '')) {
					i += 1;
					appendChar(out, source[i]);
				}
				state = 'normal';
			}
			continue;
		}

		if (state === 'regex-class') {
			appendChar(out, ch);
			if (ch === '\\') {
				i += 1;
				appendChar(out, source[i] || '');
			} else if (ch === ']') {
				state = 'regex';
			}
			continue;
		}

		if (state === 'template') {
			appendChar(out, ch);
			if (ch === '\\') {
				i += 1;
				appendChar(out, source[i] || '');
			} else if (ch === '`') {
				state = 'normal';
			}
			continue;
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			if (pendingSpace && needsSpace(prevOut, ch)) appendChar(out, ' ');
			pendingSpace = false;
			state = ch === "'" ? 'single' : ch === '"' ? 'double' : 'template';
			appendChar(out, ch);
			continue;
		}

		if (ch === '/' && next === '/') {
			while (i < source.length && source[i] !== '\n') i += 1;
			pendingSpace = true;
			continue;
		}
		if (ch === '/' && next === '*') {
			i += 2;
			while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
			i += 1;
			pendingSpace = true;
			continue;
		}
		if (ch === '/' && canStartRegex(prevOut)) {
			if (pendingSpace && needsSpace(prevOut, ch)) appendChar(out, ' ');
			pendingSpace = false;
			state = 'regex';
			appendChar(out, ch);
			continue;
		}

		if (/\s/.test(ch)) {
			pendingSpace = true;
			continue;
		}

		if (pendingSpace && needsSpace(prevOut, ch)) appendChar(out, ' ');
		pendingSpace = false;
		appendChar(out, ch);
	}
	return out.join('').trim();
};
const main = async (): Promise<void> => {
	const header = readRawSource(headerPath);
	const result = await esbuild.build({
		bundle: true,
		entryPoints: [entryPoint],
		format: 'iife',
		globalName: 'YTBlockHandleComments',
		legalComments: 'none',
		minify: true,
		platform: 'browser',
		target: 'es2022',
		treeShaking: true,
		write: false
	});
	const body = compactBody(normalizeNewlines(result.outputFiles[0].text));
	const generated = `${header}\n${body}\n`;

	if (process.argv.includes('--check')) {
		const current = normalizeNewlines(fs.readFileSync(outputPath, 'utf8'));
		if (current !== generated) {
			console.error('ytblockhandlecomments.js is out of sync with src/. Run npm run build.');
			process.exit(1);
		}
		process.exit(0);
	}

	fs.writeFileSync(outputPath, generated, 'utf8');
};

main().catch(error => {
	console.error(error);
	process.exit(1);
});
