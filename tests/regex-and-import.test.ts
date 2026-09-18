import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

test('regex safety validation rejects catastrophic alternation pattern', () => {
	const { api } = loadUserscript();
	assert.equal(api.validateRegexSpec('(a|aa)+$'), null);
});

const unsafePatterns = [
	'^@((a+))+$',
	'^@a*a*a*a*a*a*b$',
	'^@(a|a(b)?)+$',
	'^@(?:a?){30}a{30}$',
	'^@(?:a{128}){128}$',
	'^@(?=a+$)a+$',
	'^@(a+)\\1+$',
	'^@(?<name>a+)\\k<name>$',
	'^@a{1000000000}$'
];

test('regex safety rejects nested, sequential, and unsupported backtracking before execution', () => {
	const { api } = loadUserscript();
	for (const pattern of unsafePatterns) {
		assert.equal(api.validateRegexSpec(pattern), null, pattern);
		const rx = new RegExp(pattern);
		let executed = false;
		rx.test = () => { executed = true; return false; };
		assert.equal(api.safeRegexTest(rx, '@' + 'a'.repeat(100) + '!'), false);
		assert.equal(executed, false, pattern);
	}
});

test('regex safety preserves common handle patterns and escaped syntax', () => {
	const { api } = loadUserscript();
	const cases = [
		['^@promo', 'i', '@Promo123'],
		['^@(?:spam|promo)[0-9]{1,4}$', '', '@spam123'],
		['^@(?:ab)+$', '', '@abab'],
		['^@한글[0-9]+$', 'u', '@한글12'],
		['^@\\p{L}+$', 'u', '@한글'],
		['^@\\u{1F600}+$', 'u', '@😀😀'],
		['^@\\x61\\u0062\\d+$', '', '@ab12'],
		['^@\\(a\\+\\)\\{2\\}$', '', '@(a+){2}'],
		['^@[()+*?{}]+$', '', '@(+){?}'],
		['^@foo.*?bar$', '', '@foo123bar']
	];
	for (const [pattern, flags, target] of cases) {
		assert.ok(api.validateRegexSpec(pattern, flags), pattern);
		const rx = new RegExp(pattern, flags);
		assert.equal(api.safeRegexTest(rx, target), true, pattern);
		assert.equal(api.safeRegexTest(rx, '@!unrelated'), false, pattern);
	}
	const global = /^@foo/g;
	assert.equal(api.safeRegexTest(global, '@foo'), true);
	assert.equal(api.safeRegexTest(global, '@foo'), true);
});

test('unsafe regex rules are rejected on add, load, import normalization, and remote merge', () => {
	const items = unsafePatterns.map(value => ({ type: 'regex', value, flags: '' }));
	const safe = { type: 'regex', value: '^@safe', flags: 'i' };
	const { api } = loadUserscript({ gmStore: { blocked_v2: { version: 2, items: [...items, safe] } } });
	const storage = new api.StorageV2(new api.AppSettingsStorage());
	const assertSafeOnly = () => assert.deepEqual(Array.from(storage.all(), (item: any) => ({ ...item })), [safe]);
	assertSafeOnly();
	for (const pattern of unsafePatterns) assert.equal(storage.addRegex(pattern), false);
	storage.setAll([...items, safe]);
	assertSafeOnly();
	storage.setAllLocal([...items, safe]);
	assertSafeOnly();
	storage.mergeRemote({ version: 2, items: [...items, safe], sync: { entries: {
		injected: { revision: { clock: Date.now() + 1000, writer: 'old-tab' }, item: items[0] }
	} } });
	assertSafeOnly();
});

test('JSON and text imports skip unsafe regex while retaining valid rules', async () => {
	for (const json of [false, true]) {
		const { api, document } = loadUserscript();
		const storage = new api.StorageV2(new api.AppSettingsStorage());
		const manager = new api.BlockListManager({ storage, refreshAfterStorageChange: () => {} });
		const items = [
			{ type: 'regex', value: unsafePatterns[0], flags: '' },
			{ type: 'regex', value: '^@safe', flags: 'i' }
		];
		manager.importList();
		document.querySelector('textarea').value = json
			? JSON.stringify({ version: 2, items })
			: items.map(item => api.exportRegexLiteral(item)).join('\n');
		document.querySelectorAll('button').find((button: any) => button.textContent === api.t('importBtn')).click();
		await Promise.resolve();
		assert.deepEqual(Array.from(storage.all(), (item: any) => ({ ...item })), [items[1]]);
	}
});

test('comment matching and manager previews exclude unsafe stored regex', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const unsafe = { type: 'regex', value: unsafePatterns[0], flags: '' };
	const safe = { type: 'regex', value: '^@safe', flags: 'i' };
	const storage = { all: () => [unsafe, safe] };
	const hider = new api.CommentHider(storage, new api.PairMetaStorage(settings), settings);
	const manager = new api.BlockListManager({ storage });
	const comment = document.createElement('ytd-comment-renderer');
	const author = document.createElement('div');
	author.id = 'author-handle';
	author.textContent = '@' + 'a'.repeat(100) + '!';
	comment.appendChild(author);
	assert.equal(hider._regexes.length, 1);
	assert.equal(hider._matches(comment), false);
	assert.equal(manager._getRegexMatches(unsafe, [{ type: 'handle', value: author.textContent }]).length, 0);
	author.textContent = '@safe123';
	hider.invalidateNode(comment);
	assert.equal(hider._matches(comment), true);
	assert.equal(manager._getRegexMatches(safe, [{ type: 'handle', value: author.textContent }]).length, 1);
});

test('regex safety validation rejects invalid flag and length edges', () => {
	const { api } = loadUserscript();

	assert.equal(api.validateRegexSpec('@foo', 'ii'), null);
	assert.equal(api.validateRegexSpec('@foo', 'z'), null);
	assert.equal(api.validateRegexSpec('a'.repeat(257)), null);
	const valid = api.validateRegexSpec('@foo', 'i');
	assert.equal(valid.pattern, '@foo');
	assert.equal(valid.flags, 'i');
});

test('exported regex literal parses back with original pattern and flags', () => {
	const { api } = loadUserscript();
	const literal = api.exportRegexLiteral({ type: 'regex', value: '^@foo/bar$', flags: 'i' });
	const parsed = api.parseRegexLiteral(literal);

	assert.equal(literal, '/^@foo\\/bar$/i');
	assert.equal(parsed.pattern, '^@foo/bar$');
	assert.equal(parsed.flags, 'i');
});

test('regex literal parser handles commas inside patterns', () => {
	const { api } = loadUserscript();
	const parsed = api.parseRegexLiteral('/^@foo,bar$/i');

	assert.equal(parsed.pattern, '^@foo,bar$');
	assert.equal(parsed.flags, 'i');
});
