'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'ytblockhandlecomments.js');
const sourceFiles = [
	'00-userscript-header.js',
	'01-global-styles.js',
	'i18n/ko.js',
	'i18n/en.js',
	'02-utils-i18n.js',
	'03-app-settings-storage.js',
	'04-storage-v2.js',
	'05-pair-meta-storage.js',
	'06-api-config-storage.js',
	'07-pair-service.js',
	'08-toast-dialog.js',
	'09-extractor.js',
	'10-comment-hider.js',
	'11-menu-enhancer.js',
	'12-block-list-manager.js',
	'13-app.js',
	'14-bootstrap.js'
];

const normalizeNewlines = (value) => String(value || '').replace(/\r\n/g, '\n');
const readSource = (file) => normalizeNewlines(fs.readFileSync(path.join(root, 'src', file), 'utf8')).trimEnd();
const isWord = (ch) => /[A-Za-z0-9_$]/.test(ch || '');
const needsSpace = (prev, next) => isWord(prev) && isWord(next);
const canStartRegex = (prev) => !prev || /[({[=,:;!&|?]/.test(prev);
const appendChar = (out, ch) => {
	if (ch === '\n') {
		if (out[out.length - 1] !== '\n') out.push(ch);
		return;
	}
	out.push(ch);
};
const compactBody = (source) => {
	const out = [];
	let state = 'normal';
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
const header = readSource(sourceFiles[0]);
const body = compactBody(sourceFiles.slice(1).map(readSource).join('\n'));
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
