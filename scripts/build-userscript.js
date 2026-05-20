'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'ytblockhandlecomments.js');
const sourceFiles = [
	'00-userscript-header.js',
	'01-global-styles.js',
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
const generated = `${sourceFiles.map(readSource).join('\n\n')}\n`;

if (process.argv.includes('--check')) {
	const current = normalizeNewlines(fs.readFileSync(outputPath, 'utf8'));
	if (current !== generated) {
		console.error('ytblockhandlecomments.js is out of sync with src/. Run npm run build.');
		process.exit(1);
	}
	process.exit(0);
}

fs.writeFileSync(outputPath, generated, 'utf8');
