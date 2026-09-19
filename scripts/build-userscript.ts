import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(path.resolve(process.argv[1] || 'scripts/build-userscript.ts'));
export const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'ytblockhandlecomments.js');
const headerPath = path.join(root, 'src', '00-userscript-header.ts');
const entryPoint = path.join(root, 'src', '14-bootstrap.ts');
const versionPath = path.join(root, 'VERSION');
const templateSourcePath = path.join(root, 'src', 'template');
const generatedDocumentNotice = '<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->\n';

export const documentOutputs = [
	'README.md',
	'README.ko.md',
	'docs/ABOUT.md',
	'docs/CHANGELOG.md',
	'docs/CHANGELOG.ko.md',
	'docs/README.md',
	'docs/TODO.md',
	'docs/WIKI.md',
	'docs/WIKI.ko.md'
];

type CompactState = 'normal' | 'single' | 'double' | 'regex' | 'regex-class' | 'template';
type GeneratedFile = { path: string; content: string };
export type GeneratedFileOps = {
	writeFileSync: (file: string, content: string, encoding: 'utf8') => void;
	readFileSync: (file: string, encoding: 'utf8') => string;
	renameSync: (from: string, to: string) => void;
	rmSync: (file: string, options: { force: boolean }) => void;
	existsSync: (file: string) => boolean;
};

const defaultGeneratedFileOps: GeneratedFileOps = {
	writeFileSync: (file, content, encoding) => fs.writeFileSync(file, content, encoding),
	readFileSync: (file, encoding) => fs.readFileSync(file, encoding),
	renameSync: (from, to) => fs.renameSync(from, to),
	rmSync: (file, options) => fs.rmSync(file, options),
	existsSync: file => fs.existsSync(file)
};

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
			if (ch === '\\') { i += 1; appendChar(out, source[i] || ''); }
			else if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"')) state = 'normal';
			continue;
		}
		if (state === 'regex') {
			appendChar(out, ch);
			if (ch === '\\') { i += 1; appendChar(out, source[i] || ''); }
			else if (ch === '[') state = 'regex-class';
			else if (ch === '/') {
				while (/[A-Za-z]/.test(source[i + 1] || '')) { i += 1; appendChar(out, source[i]); }
				state = 'normal';
			}
			continue;
		}
		if (state === 'regex-class') {
			appendChar(out, ch);
			if (ch === '\\') { i += 1; appendChar(out, source[i] || ''); }
			else if (ch === ']') state = 'regex';
			continue;
		}
		if (state === 'template') {
			appendChar(out, ch);
			if (ch === '\\') { i += 1; appendChar(out, source[i] || ''); }
			else if (ch === '`') state = 'normal';
			continue;
		}
		if (ch === "'" || ch === '"' || ch === '`') {
			if (pendingSpace && needsSpace(prevOut, ch)) appendChar(out, ' ');
			pendingSpace = false;
			state = ch === "'" ? 'single' : ch === '"' ? 'double' : 'template';
			appendChar(out, ch);
			continue;
		}
		if (ch === '/' && next === '/') { while (i < source.length && source[i] !== '\n') i += 1; pendingSpace = true; continue; }
		if (ch === '/' && next === '*') {
			i += 2;
			while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
			i += 1; pendingSpace = true; continue;
		}
		if (ch === '/' && canStartRegex(prevOut)) {
			if (pendingSpace && needsSpace(prevOut, ch)) appendChar(out, ' ');
			pendingSpace = false; state = 'regex'; appendChar(out, ch); continue;
		}
		if (/\s/.test(ch)) { pendingSpace = true; continue; }
		if (pendingSpace && needsSpace(prevOut, ch)) appendChar(out, ' ');
		pendingSpace = false; appendChar(out, ch);
	}
	return out.join('').trim();
};

export const readVersion = (versionFile = versionPath): string => {
	const version = normalizeNewlines(fs.readFileSync(versionFile, 'utf8')).trim();
	if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid VERSION: ${version}`);
	return version;
};

export const replaceVersionTokens = (source: string, version: string): string => {
	const generated = source.replaceAll('{{version}}', version);
	if (generated.includes('{{version}}')) throw new Error('Unreplaced {{version}} token.');
	return generated;
};

const templatePathFor = (output: string): string => path.join(templateSourcePath, output);
const listTemplateOutputs = (directory = templateSourcePath, prefix = ''): string[] => fs.readdirSync(directory, { withFileTypes: true })
	.flatMap(entry => entry.isDirectory()
		? listTemplateOutputs(path.join(directory, entry.name), path.join(prefix, entry.name))
		: entry.name.endsWith('.md') ? [path.join(prefix, entry.name).replace(/\\/g, '/')] : []);
const ensureDocumentTemplates = (): void => {
	const actual = listTemplateOutputs().sort();
	const expected = [...documentOutputs].sort();
	if (actual.join('\n') !== expected.join('\n')) throw new Error(`Unknown or missing document template in src/template/: ${actual.join(', ')}`);
};

const transactionId = (): string => `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

type TransactionFile = GeneratedFile & {
	temporaryPath: string;
	backupPath: string;
	hadOriginal: boolean;
	originalMoved: boolean;
	targetPublished: boolean;
};


const cleanupTransactionFiles = (files: TransactionFile[], ops: GeneratedFileOps, removeBackups = true): unknown[] => {
	const errors: unknown[] = [];
	for (const file of files) {
		try {
			if (ops.existsSync(file.temporaryPath)) ops.rmSync(file.temporaryPath, { force: true });
		} catch (error) { errors.push(error); }
	}
	if (!removeBackups || errors.length) return errors;
	for (const file of files) {
		try {
			if (ops.existsSync(file.backupPath)) ops.rmSync(file.backupPath, { force: true });
		} catch (error) { errors.push(error); }
	}
	return errors;
};

const rollbackGeneratedFiles = (files: TransactionFile[], ops: GeneratedFileOps): unknown[] => {
	const errors: unknown[] = [];
	for (const file of [...files].reverse()) {
		if (file.originalMoved) {
			let targetReady = true;
			try {
				if (ops.existsSync(file.path)) ops.rmSync(file.path, { force: true });
			} catch (error) {
				errors.push(error);
				targetReady = false;
			}
			if (targetReady) {
				try {
					if (ops.existsSync(file.backupPath)) ops.renameSync(file.backupPath, file.path);
				} catch (error) { errors.push(error); }
			}
		} else if (file.targetPublished) {
			try {
				if (ops.existsSync(file.path)) ops.rmSync(file.path, { force: true });
			} catch (error) { errors.push(error); }
		}
	}
	return errors;
};

export const publishGeneratedFiles = (
	generatedFiles: GeneratedFile[],
	ops: GeneratedFileOps = defaultGeneratedFileOps,
	id = transactionId()
): void => {
	const paths = generatedFiles.map(file => file.path);
	if (new Set(paths).size !== paths.length) throw new Error('Generated output paths must be unique.');
	const files: TransactionFile[] = generatedFiles.map(file => ({
		...file,
		temporaryPath: `${file.path}.tmp-${id}`,
		backupPath: `${file.path}.bak-${id}`,
		hadOriginal: ops.existsSync(file.path),
		originalMoved: false,
		targetPublished: false
	}));
	try {
		for (const file of files) ops.writeFileSync(file.temporaryPath, file.content, 'utf8');
		for (const file of files) {
			if (ops.readFileSync(file.temporaryPath, 'utf8') !== file.content) throw new Error(`Staged output validation failed: ${file.path}`);
		}
		for (const file of files) {
			if (file.hadOriginal) {
				ops.renameSync(file.path, file.backupPath);
				file.originalMoved = true;
			}
			ops.renameSync(file.temporaryPath, file.path);
			file.targetPublished = true;
		}
	} catch (error) {
		const rollbackErrors = rollbackGeneratedFiles(files, ops);
		const cleanupErrors = cleanupTransactionFiles(files, ops, rollbackErrors.length === 0);
		const recoveryErrors = [...rollbackErrors, ...cleanupErrors];
		if (recoveryErrors.length) throw new AggregateError(recoveryErrors, 'Generated output transaction failed and recovery was incomplete.', { cause: error });
		throw error;
	}
	const cleanupErrors = cleanupTransactionFiles(files, ops);
	if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Generated output transaction published but cleanup was incomplete.');
};
export const readDocumentTemplates = (version: string): GeneratedFile[] => {
	ensureDocumentTemplates();
	return documentOutputs.map(output => {
	const template = templatePathFor(output);
	if (!fs.existsSync(template)) throw new Error(`Missing document template: src/template/${output}`);
	return { path: path.join(root, output), content: `${generatedDocumentNotice}${replaceVersionTokens(readRawSource(template), version)}\n` };
	});
};

export const buildGeneratedFiles = async (): Promise<GeneratedFile[]> => {
	const version = readVersion();
	const header = replaceVersionTokens(readRawSource(headerPath), version);
	const result = await esbuild.build({
		bundle: true, entryPoints: [entryPoint], format: 'iife', globalName: 'YTBlockHandleComments', legalComments: 'none',
		minify: true, platform: 'browser', target: 'es2022', treeShaking: true, write: false
	});
	const body = replaceVersionTokens(compactBody(normalizeNewlines(result.outputFiles[0].text)), version);
	return [{ path: outputPath, content: `${header}\n${body}\n` }, ...readDocumentTemplates(version)];
};

export const findOutdatedGeneratedFiles = (generatedFiles: GeneratedFile[], ops: GeneratedFileOps = defaultGeneratedFileOps): GeneratedFile[] => generatedFiles
	.filter(file => !ops.existsSync(file.path) || normalizeNewlines(ops.readFileSync(file.path, 'utf8')) !== file.content);

const main = async (): Promise<void> => {
	const generatedFiles = await buildGeneratedFiles();
	if (process.argv.includes('--check')) {
		const outdated = findOutdatedGeneratedFiles(generatedFiles);
		if (outdated.length) {
			console.error(`Generated files are out of sync: ${outdated.map(file => path.relative(root, file.path)).join(', ')}. Run npm run build.`);
			process.exit(1);
		}
		return;
	}
	publishGeneratedFiles(generatedFiles);
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/build-userscript.ts')) {
	main().catch(error => { console.error(error); process.exit(1); });
}
