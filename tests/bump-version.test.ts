import test from 'node:test';
import assert from 'node:assert/strict';
import { getMasterFastForwardInstructions, parseReleaseOptions, releaseChangelog, removeCompletedTodoItems } from '../scripts/bump-version.ts';

const makeChangelog = (emptyEntry: string) => `# Changelog

## [Unreleased]

### Added

- Added feature
- ${emptyEntry}

### Changed

- ${emptyEntry}

### Deprecated

- ${emptyEntry}

### Removed

- ${emptyEntry}

### Fixed

- Fixed bug

### Security

- ${emptyEntry}

## [0.1.0] - 2026-01-01

### Added

- Initial release
`;

test('releaseChangelog resets English Unreleased sections without duplicates', () => {
	const result = releaseChangelog(makeChangelog('None'), 'docs/CHANGELOG.md', '0.2.0', '2026-06-24');
	const unreleased = result.slice(result.indexOf('## [Unreleased]'), result.indexOf('## [0.2.0]'));

	assert.match(unreleased, /### Added\n\n- None\n\n### Changed/);
	assert.doesNotMatch(unreleased, /Added feature/);
	assert.doesNotMatch(unreleased, /- None\n- None/);
	assert.match(result, /## \[0.2.0\] - 2026-06-24\n\n### Added\n\n- Added feature\n\n### Changed/);
});

test('releaseChangelog resets Korean Unreleased sections with Korean empty text', () => {
	const result = releaseChangelog(makeChangelog('없음'), 'docs/CHANGELOG.ko.md', '0.2.0', '2026-06-24');
	const unreleased = result.slice(result.indexOf('## [Unreleased]'), result.indexOf('## [0.2.0]'));

	assert.match(unreleased, /### Added\n\n- 없음\n\n### Changed/);
	assert.doesNotMatch(unreleased, /- None/);
	assert.doesNotMatch(unreleased, /- 없음\n- 없음/);
	assert.match(result, /## \[0.2.0\] - 2026-06-24\n\n### Added\n\n- Added feature\n\n### Changed/);
});

test('release options keep master promotion opt-in', () => {
	assert.deepEqual(parseReleaseOptions(['node', 'script', '1.3.1']), {
		fastForwardMaster: false,
		pushMaster: false
	});
	assert.deepEqual(parseReleaseOptions(['node', 'script', '1.3.1', '--push-master']), {
		fastForwardMaster: true,
		pushMaster: true
	});
	assert.deepEqual(parseReleaseOptions(['node', 'script', '1.3.1', '--ff-master']), {
		fastForwardMaster: true,
		pushMaster: false
	});
	assert.deepEqual(parseReleaseOptions(['node', 'script', '1.3.1', '--ff-master', '--push-master']), {
		fastForwardMaster: true,
		pushMaster: true
	});
	assert.match(getMasterFastForwardInstructions(), /git merge --ff-only dev/);
	assert.doesNotMatch(getMasterFastForwardInstructions(), /rebase/);
});

test('completed TODO items remove their indented acceptance details', () => {
	const result = removeCompletedTodoItems(`## Done\n\n- [x] Finished item\n\n  - (1) Acceptance detail\n  - (2) Another detail\n\n- [ ] Open item\n\n  - Keep this detail\n`);

	assert.equal(result, `## Done\n\n- [ ] Open item\n\n  - Keep this detail\n`);
});
