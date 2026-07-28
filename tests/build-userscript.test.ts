import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeneratedFiles, documentOutputs, readVersion, replaceVersionTokens } from '../scripts/build-userscript.ts';

test('build reads VERSION and resolves version placeholders', () => {
	assert.equal(readVersion(), '1.5.0');
	assert.equal(replaceVersionTokens('v{{version}}', '1.5.0'), 'v1.5.0');
});

test('build generates userscript and all document outputs', async () => {
	const files = await buildGeneratedFiles();
	const outputPaths = files.map(file => file.path.replace(/\\/g, '/'));

	assert.ok(outputPaths.some(file => file.endsWith('/ytblockhandlecomments.js')));
	for (const output of documentOutputs) assert.ok(outputPaths.some(file => file.endsWith(`/${output}`)));
	for (const file of files) assert.doesNotMatch(file.content, /\{\{version\}\}/);
	assert.match(files.find(file => file.path.endsWith('ytblockhandlecomments.js'))?.content || '', /@version\s+1\.5\.0/);
});
