import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(path.resolve(process.argv[1] || 'scripts/bump-version.ts'));
const root = path.resolve(__dirname, '..');
const version = process.argv.find(arg => /^\d+\.\d+\.\d+$/.test(arg));
const check = process.argv.includes('--check');
const today = new Date().toISOString().slice(0, 10);

type Replacement = [RegExp, string, string];
type VersionFile = {
	path: string;
	writeOnly?: boolean;
	replace: (text: string) => string;
};

const CHANGELOG_SECTIONS = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

const replaceRequired = (text: string, pattern: RegExp, replacement: string, label: string): string => {
	if (!pattern.test(text)) throw new Error(`Missing version target: ${label}`);
	return text.replace(pattern, replacement);
};

const replaceAllRequired = (text: string, replacements: Replacement[], file: string): string => replacements.reduce(
	(current, [pattern, replacement, label]) => replaceRequired(current, pattern, replacement, `${file} ${label}`),
	text
);

export const buildFreshUnreleased = (file: string): string => {
	const emptyEntry = file.endsWith('.ko.md') ? '없음' : 'None';
	const sections = CHANGELOG_SECTIONS
		.map(section => `### ${section}\n\n- ${emptyEntry}`)
		.join('\n\n');
	return `## [Unreleased]\n\n${sections}`;
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
	const releaseSection = `## [${version}] - ${releaseDate}\n${unreleasedBody}\n\n`;
	return text.slice(0, match.index) + freshUnreleased + '\n\n' + releaseSection + text.slice(match.index + match[0].length);
};

const files: VersionFile[] = [
	{
		path: 'src/00-userscript-header.ts',
		replace: (text) => replaceRequired(text, /(\/\/ @version\s+)\d+\.\d+\.\d+/, `$1${version}`, '@version')
	},
	{
		path: 'src/02-utils-i18n.ts',
		replace: (text) => replaceRequired(text, /(FALLBACK_SCRIPT_VERSION = ')\d+\.\d+\.\d+(')/, `$1${version}$2`, 'FALLBACK_SCRIPT_VERSION')
	},
	{
		path: 'README.md',
		replace: (text) => replaceAllRequired(text, [
			[/(# .+ \u2014 )v\d+\.\d+\.\d+/, `$1v${version}`, 'title'],
			[/(`)v\d+\.\d+\.\d+(` keeps)/, `$1v${version}$2`, 'intro'],
			[/(`@version`: `)\d+\.\d+\.\d+(`)/, `$1${version}$2`, '@version']
		], 'README.md')
	},
	{
		path: 'README.ko.md',
		replace: (text) => replaceAllRequired(text, [
			[/(# .+ \u2014 )v\d+\.\d+\.\d+/, `$1v${version}`, 'title'],
			[/(`)v\d+\.\d+\.\d+(`은)/, `$1v${version}$2`, 'intro'],
			[/(`)v\d+\.\d+\.\d+(`에서도)/, `$1v${version}$2`, 'import-export note'],
			[/(`@version`: `)\d+\.\d+\.\d+(`)/, `$1${version}$2`, '@version']
		], 'README.ko.md')
	},
	{
		path: 'docs/WIKI.md',
		replace: (text) => replaceAllRequired(text, [
			[/(# .+ \u2014 )v\d+\.\d+\.\d+/, `$1v${version}`, 'title'],
			[/(`@version`: `)\d+\.\d+\.\d+(`)/, `$1${version}$2`, '@version'],
			[/(After `)v\d+\.\d+\.\d+(`)/, `$1v${version}$2`, 'post-version note']
		], 'docs/WIKI.md')
	},
	{
		path: 'docs/WIKI.ko.md',
		replace: (text) => replaceAllRequired(text, [
			[/(# .+ \u2014 )v\d+\.\d+\.\d+/, `$1v${version}`, 'title'],
			[/(`@version`: `)\d+\.\d+\.\d+(`)/, `$1${version}$2`, '@version'],
			[/(`)v\d+\.\d+\.\d+(` 이후에는)/, `$1v${version}$2`, 'post-version note']
		], 'docs/WIKI.ko.md')
	},
	{
		path: 'docs/CHANGELOG.md',
		replace: (text) => releaseChangelog(text, 'docs/CHANGELOG.md')
	},
	{
		path: 'docs/CHANGELOG.ko.md',
		replace: (text) => releaseChangelog(text, 'docs/CHANGELOG.ko.md')
	},
	{
		path: 'docs/TODO.md',
		writeOnly: true,
		replace: (text: string) => text
			.split(/\r?\n/)
			.filter(line => !/^\s*-\s*\[x\]\s+/i.test(line))
			.join('\n')
	}
];

const main = () => {
	if (!version) {
		console.error('Usage: npm run bump:version -- <MAJOR.MINOR.PATCH> [--check]');
		process.exit(1);
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
		console.log(`Updated version references to ${version}. Run npm run build next.`);
	}
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/bump-version.ts')) {
	main();
}
