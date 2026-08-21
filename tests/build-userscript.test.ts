import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeneratedFiles, documentOutputs, readVersion, replaceVersionTokens } from '../scripts/build-userscript.ts';

test('build reads VERSION and resolves version placeholders', () => {
	const version = readVersion();
	assert.match(version, /^\d+\.\d+\.\d+$/);
	assert.equal(replaceVersionTokens('v{{version}}', version), `v${version}`);
});

test('build generates userscript and all document outputs', async () => {
	const files = await buildGeneratedFiles();
	const outputPaths = files.map(file => file.path.replace(/\\/g, '/'));
	const versionPattern = new RegExp(`@version\\s+${readVersion().replaceAll('.', '\\.')}\\b`);

	assert.ok(outputPaths.some(file => file.endsWith('/ytblockhandlecomments.js')));
	for (const output of documentOutputs) assert.ok(outputPaths.some(file => file.endsWith(`/${output}`)));
	for (const file of files) assert.doesNotMatch(file.content, /\{\{version\}\}/);
	const userscript = files.find(file => file.path.endsWith('ytblockhandlecomments.js'))?.content || '';
	assert.match(userscript, versionPattern);
	assert.match(userscript, /^\/\/ @exclude\s+https:\/\/www\.youtube\.com\/embed\*$/m);
});
