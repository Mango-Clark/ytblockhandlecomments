import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildGeneratedFiles, documentOutputs, findOutdatedGeneratedFiles, publishGeneratedFiles, readVersion, replaceVersionTokens, type GeneratedFileOps } from '../scripts/build-userscript.ts';

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

const withOutputFiles = (run: (files: Array<{ path: string; content: string }>) => void): void => {
	const root = path.resolve('tests');
	const files = [0, 1, 2].map(index => ({ path: path.join(root, `.build-transaction-${process.pid}-${index}.txt`), content: `new-${index}` }));
	for (const [index, file] of files.entries()) fs.writeFileSync(file.path, `old-${index}`, 'utf8');
	try { run(files); }
	finally {
		for (const file of files) {
			fs.rmSync(file.path, { force: true });
			for (const suffix of ['success', 'check', 'write-1', 'write-2', 'write-3', 'rename-0', 'rename-1', 'rename-2', 'backup-0', 'backup-1', 'backup-2', 'rollback', 'cleanup']) {
				fs.rmSync(`${file.path}.tmp-${suffix}`, { force: true });
				fs.rmSync(`${file.path}.bak-${suffix}`, { force: true });
			}
		}
	}
};

const realOps: GeneratedFileOps = {
	writeFileSync: (file, content, encoding) => fs.writeFileSync(file, content, encoding),
	readFileSync: (file, encoding) => fs.readFileSync(file, encoding),
	renameSync: (from, to) => fs.renameSync(from, to),
	rmSync: (file, options) => fs.rmSync(file, options),
	existsSync: file => fs.existsSync(file)
};

test('generated output transaction rolls back write failures and cleans staging files', () => {
	withOutputFiles(files => {
		for (const failureAt of [1, 2, 3]) {
			let writes = 0;
			const ops: GeneratedFileOps = {
				...realOps,
				writeFileSync: (file, content, encoding) => {
					writes += 1;
					if (writes === failureAt) throw new Error(`write-${failureAt}`);
					realOps.writeFileSync(file, content, encoding);
				}
			};
			assert.throws(() => publishGeneratedFiles(files, ops, `write-${failureAt}`), new RegExp(`write-${failureAt}`));
			assert.deepEqual(files.map(file => fs.readFileSync(file.path, 'utf8')), files.map((_file, index) => `old-${index}`));
			for (const file of files) assert.equal(fs.existsSync(`${file.path}.tmp-write-${failureAt}`), false);
		}
	});
});

test('generated output transaction rolls back rename failures at every output position', () => {
	withOutputFiles(files => {
		for (const failureAt of [0, 1, 2]) {
			let published = 0;
			const ops: GeneratedFileOps = {
				...realOps,
				renameSync: (from, to) => {
					if (to === files[failureAt].path && from.includes('.tmp-rename-')) {
						published += 1;
						throw new Error(`rename-${failureAt}`);
					}
					realOps.renameSync(from, to);
				}
			};
			assert.throws(() => publishGeneratedFiles(files, ops, `rename-${failureAt}`), new RegExp(`rename-${failureAt}`));
			assert.deepEqual(files.map(file => fs.readFileSync(file.path, 'utf8')), files.map((_file, index) => `old-${index}`));
			assert.equal(published, 1);
			for (const file of files) assert.equal(fs.existsSync(`${file.path}.bak-rename-${failureAt}`), false);
		}
	});
});

test('generated output transaction publishes the complete staged set', () => {
	withOutputFiles(files => {
		publishGeneratedFiles(files, realOps, 'success');
		assert.deepEqual(files.map(file => fs.readFileSync(file.path, 'utf8')), files.map(file => file.content));
		for (const file of files) {
			assert.equal(fs.existsSync(`${file.path}.tmp-success`), false);
			assert.equal(fs.existsSync(`${file.path}.bak-success`), false);
		}
	});
});

test('generated output transaction rolls back failures while backing up each output', () => {
	withOutputFiles(files => {
		for (const failureAt of [0, 1, 2]) {
			const ops: GeneratedFileOps = {
				...realOps,
				renameSync: (from, to) => {
					if (to === `${files[failureAt].path}.bak-backup-${failureAt}`) throw new Error(`backup-${failureAt}`);
					realOps.renameSync(from, to);
				}
			};
			assert.throws(() => publishGeneratedFiles(files, ops, `backup-${failureAt}`), new RegExp(`backup-${failureAt}`));
			assert.deepEqual(files.map(file => fs.readFileSync(file.path, 'utf8')), files.map((_file, index) => `old-${index}`));
		}
	});
});

test('generated output transaction preserves a backup when recovery itself fails', () => {
	withOutputFiles(files => {
		const ops: GeneratedFileOps = {
			...realOps,
			renameSync: (from, to) => {
				if (to === files[1].path && from.includes('.tmp-rollback')) throw new Error('publish');
				if (to === files[0].path && from.includes('.bak-rollback')) throw new Error('restore');
				realOps.renameSync(from, to);
			}
		};
		assert.throws(() => publishGeneratedFiles(files, ops, 'rollback'), /recovery was incomplete/);
		assert.equal(fs.existsSync(files[0].path), false);
		assert.equal(fs.existsSync(`${files[0].path}.bak-rollback`), true);
	});
});

test('generated output transaction reports cleanup failures after publishing', () => {
	withOutputFiles(files => {
		const ops: GeneratedFileOps = {
			...realOps,
			rmSync: (file, options) => {
				if (file === `${files[0].path}.bak-cleanup`) throw new Error('cleanup');
				realOps.rmSync(file, options);
			}
		};
		assert.throws(() => publishGeneratedFiles(files, ops, 'cleanup'), /cleanup was incomplete/);
		assert.deepEqual(files.map(file => fs.readFileSync(file.path, 'utf8')), files.map(file => file.content));
		assert.equal(fs.existsSync(`${files[0].path}.bak-cleanup`), true);
	});
});

test('generated output transaction retains backups when staging cleanup fails', () => {
	withOutputFiles(files => {
		const ops: GeneratedFileOps = {
			...realOps,
			existsSync: file => {
				if (file === `${files[0].path}.tmp-cleanup-temp`) return true;
				return realOps.existsSync(file);
			},
			rmSync: (file, options) => {
				if (file === `${files[0].path}.tmp-cleanup-temp`) throw new Error('temp cleanup');
				realOps.rmSync(file, options);
			}
		};
		assert.throws(() => publishGeneratedFiles(files, ops, 'cleanup-temp'), /cleanup was incomplete/);
		assert.deepEqual(files.map(file => fs.readFileSync(file.path, 'utf8')), files.map(file => file.content));
		assert.equal(fs.existsSync(`${files[0].path}.bak-cleanup-temp`), true);
	});
});

test('generated output check reports drift without mutating files', () => {
	withOutputFiles(files => {
		const before = files.map(file => fs.readFileSync(file.path, 'utf8'));
		assert.equal(findOutdatedGeneratedFiles(files, realOps).length, files.length);
		assert.deepEqual(files.map(file => fs.readFileSync(file.path, 'utf8')), before);
		for (const file of files) {
			assert.equal(fs.existsSync(`${file.path}.tmp-check`), false);
			assert.equal(fs.existsSync(`${file.path}.bak-check`), false);
		}
	});
});
