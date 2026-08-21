import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { documentOutputs, readVersion } from './build-userscript.ts';

const __dirname = path.dirname(path.resolve(process.argv[1] || 'scripts/bump-version.ts'));
const root = path.resolve(__dirname, '..');
const version = process.argv.find(arg => /^\d+\.\d+\.\d+$/.test(arg));
const check = process.argv.includes('--check');
const today = new Date().toISOString().slice(0, 10);

export type ReleaseOptions = {
	fastForwardMaster: boolean;
	pushMaster: boolean;
};

export const parseReleaseOptions = (args: string[] = process.argv): ReleaseOptions => ({
	fastForwardMaster: args.includes('--ff-master') || args.includes('--push-master'),
	pushMaster: args.includes('--push-master')
});

export const compareVersions = (left: string, right: string): number => {
	const leftParts = left.split('.').map(Number);
	const rightParts = right.split('.').map(Number);
	for (let index = 0; index < leftParts.length; index += 1) {
		if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
	}
	return 0;
};

export const assertVersionNotDowngraded = (target: string, current: string, force = false): void => {
	if (!force && compareVersions(target, current) < 0) {
		throw new Error(`Version downgrade blocked: ${target} is lower than ${current}. Use --force-version to override.`);
	}
};

type VersionFile = {
	path: string;
	writeOnly?: boolean;
	replace: (text: string) => string;
};

const CHANGELOG_SECTIONS = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
const versionTag = version ? `v${version}` : '';
const releaseOptions = parseReleaseOptions();
const forceVersion = process.argv.includes('--force-version');
export const releaseFiles = [
	'VERSION',
	'src/00-userscript-header.ts',
	'src/02-utils-i18n.ts',
	...documentOutputs.map(file => `src/docs/${file}`),
	...documentOutputs,
	'ytblockhandlecomments.js'
];

export const releasePushCommands = (tag: string): string[][] => [
	['push', 'origin', 'dev'],
	['push', 'origin', tag]
];

export const buildFreshUnreleased = (file: string): string => {
	const emptyEntry = file.endsWith('.ko.md') ? '없음' : 'None';
	const sections = CHANGELOG_SECTIONS
		.map(section => `### ${section}\n\n- ${emptyEntry}`)
		.join('\n\n');
	return `## [Unreleased]\n\n${sections}`;
};

export const removeCompletedTodoItems = (text: string): string => {
	const lines = text.split(/\r?\n/);
	const kept: string[] = [];
	for (let index = 0; index < lines.length; index += 1) {
		if (!/^\s*-\s*\[x\]\s+/i.test(lines[index])) {
			kept.push(lines[index]);
			continue;
		}
		index += 1;
		while (index < lines.length && (/^\s*$/.test(lines[index]) || /^\s+/.test(lines[index]))) index += 1;
		index -= 1;
	}
	return kept.join('\n');
};

const isEmptyChangelogLine = (line: string): boolean => /^\s*-\s+(?:None|없음)\s*$/.test(line);

const cleanReleaseBody = (body: string): string => CHANGELOG_SECTIONS.reduce((current, section) => {
	const pattern = new RegExp(`(### ${section}\\n\\n)([\\s\\S]*?)(?=\\n\\n### |$)`, 'g');
	return current.replace(pattern, (match: string, heading: string, sectionBody: string) => {
		const lines = sectionBody.split('\n');
		const hasRealEntry = lines.some(line => /^\s*-\s+/.test(line) && !isEmptyChangelogLine(line));
		if (!hasRealEntry) return match;
		return heading + lines.filter(line => !isEmptyChangelogLine(line)).join('\n').trimEnd();
	});
}, body);

export const releaseChangelog = (text: string, file: string, releaseVersion = version || '', releaseDate = today): string => {
	const version = releaseVersion;
	if (text.includes(`## [${version}] - `)) return text;
	const match = /^## \[Unreleased\]\n([\s\S]*?)(?=\n## \[)/m.exec(text);
	if (!match) throw new Error(`Missing Unreleased section: ${file}`);
	const unreleasedBody = cleanReleaseBody(match[1].trimEnd());
	const freshUnreleased = buildFreshUnreleased(file);
	const releaseSection = `## [${version}] - ${releaseDate}\n${unreleasedBody}\n`;
	return text.slice(0, match.index) + freshUnreleased + '\n\n' + releaseSection + text.slice(match.index + match[0].length);
};

const files: VersionFile[] = [
	{
		path: 'VERSION',
		replace: () => `${version}\n`
	},
	{
		path: 'src/docs/docs/CHANGELOG.md',
		replace: (text) => releaseChangelog(text, 'src/docs/docs/CHANGELOG.md')
	},
	{
		path: 'src/docs/docs/CHANGELOG.ko.md',
		replace: (text) => releaseChangelog(text, 'src/docs/docs/CHANGELOG.ko.md')
	},
	{
		path: 'src/docs/docs/TODO.md',
		writeOnly: true,
		replace: removeCompletedTodoItems
	}
];

const runGit = (args: string[], stdio: 'inherit' | 'pipe' = 'inherit') => execFileSync('git', args, {
	cwd: root,
	stdio,
	encoding: 'utf8'
});

export const getMasterFastForwardInstructions = () => [
		'Cannot fast-forward master because it is not an ancestor of dev.',
		'Resolve it manually, then run the release again:',
		'  git switch master',
		'  git merge --ff-only dev',
		'  git push origin master',
		'  git switch dev'
	].join('\n');

const printMasterFastForwardInstructions = () => console.error(getMasterFastForwardInstructions());

const ensureReleaseBranch = () => {
		const branch = runGit(['branch', '--show-current'], 'pipe').trim();
	if (branch !== 'dev') runGit(['switch', 'dev']);
};

const ensureMasterCanFastForward = () => {
	if (!releaseOptions.fastForwardMaster) return;
	try {
		runGit(['merge-base', '--is-ancestor', 'master', 'dev'], 'pipe');
	} catch {
		printMasterFastForwardInstructions();
		throw new Error('Aborted before release because master cannot fast-forward to dev.');
	}
};

const fastForwardMaster = () => {
	if (!releaseOptions.fastForwardMaster) return;
	runGit(['switch', 'master']);
	try {
		try {
			runGit(['merge', '--ff-only', 'dev']);
		} catch {
			printMasterFastForwardInstructions();
			throw new Error('Aborted because master cannot fast-forward to dev.');
		}
		if (releaseOptions.pushMaster) runGit(['push', 'origin', 'master']);
	} finally {
		runGit(['switch', 'dev']);
	}
};

const main = () => {
	if (!version) {
		console.error('Usage: npm run bump:version -- <MAJOR.MINOR.PATCH> [--check] [--force-version] [--ff-master] [--push-master]');
		process.exit(1);
	}
	assertVersionNotDowngraded(version, readVersion(), forceVersion);
	if (!check) {
		const status = runGit(['status', '--porcelain'], 'pipe').trim();
		if (status) throw new Error('Working tree must be clean before bumping version.');
		ensureReleaseBranch();
		ensureMasterCanFastForward();
		const existingTag = runGit(['tag', '--list', versionTag], 'pipe').trim();
		if (existingTag) throw new Error(`Tag already exists: ${versionTag}`);
	}

	let changed = false;

	for (const item of files) {
		if (check && item.writeOnly) continue;
		const fullPath = path.join(root, item.path);
		const before = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
		let after: string;
		try {
			after = item.replace(before);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exit(1);
		}
		if (after === before) continue;
		changed = true;
		if (!check) fs.writeFileSync(fullPath, after, 'utf8');
	}

	if (check && changed) {
		console.error(`Version docs are not bumped to ${version}. Run npm run bump:version -- ${version}`);
		process.exit(1);
	}

	if (!check) {
		execFileSync(process.execPath, [path.join(root, 'scripts', 'build-userscript.ts')], {
			cwd: root,
			stdio: 'inherit'
		});
		runGit(['add', ...releaseFiles]);
		runGit(['commit', '-m', `chore: bump version to ${version}`]);
		runGit(['tag', versionTag]);
		for (const command of releasePushCommands(versionTag)) runGit(command);
		fastForwardMaster();
		console.log(`Bumped ${version}, committed, tagged ${versionTag}, and pushed origin/dev + tag.`);
	}
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/bump-version.ts')) {
	main();
}
