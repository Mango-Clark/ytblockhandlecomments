import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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
	'(a|aa){12}a{64}b',
	'(?:(a|aa)){12}a{64}b',
	'(?:a|aa){2,12}?a{64}b',
	'(?:a{1,2}){12}a{64}b',
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
		['^@(?:ab){2}$', '', '@abab'],
		['^@(?:spam|promo)?$', '', '@spam'],
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

test('opening the manager never executes repeated alternatives against a large handle list', () => {
	const { api, context, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const handles = Array.from({ length: 90 }, (_: unknown, index: number) => ({ type: 'handle', value: '@' + 'a'.repeat(100) + index }));
	const unsafe = { type: 'regex', value: '(a|aa){12}a{64}b', flags: '' };
	storage.setAll(handles);
	// Exercise the manager's own validation even if an old caller supplies an unsafe rule.
	storage.all = () => [...handles, unsafe, { type: 'regex', value: '^@a', flags: '' }];
	context.unsafeRegexExecutions = 0;
	context.unsafeRegexSource = unsafe.value;
	vm.runInContext(`
		const nativeRegexTest = RegExp.prototype.test;
		RegExp.prototype.test = function(value) {
			if (this.source === unsafeRegexSource) {
				unsafeRegexExecutions += 1;
				return false;
			}
			return nativeRegexTest.call(this, value);
		};
	`, context);
	const manager = new api.BlockListManager({
		settings, storage, pairStore, apiConfig,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {}
	});
	for (let run = 0; run < 2; run++) {
		manager.openList();
		assert.equal(context.unsafeRegexExecutions, 0);
		assert.equal(document.querySelectorAll('.tm-item-check').length, 92);
		assert.ok(document.querySelector('.tm-dialog').textContent.includes(api.t('regexMatchedCount', 90)));
		api.Dialog.closeAll();
	}
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

test('accepted patterns still match after RegExp.source expands their escaping', () => {
	const { api } = loadUserscript();
	const patterns = [
		'@a|' + '/'.repeat(252),
		'@a|' + '\n'.repeat(253),
		'@a|' + '\r'.repeat(253),
		'@a|' + '\u2028'.repeat(253),
		'@a|' + '\u2029'.repeat(253),
		String.raw`@a|\\` + '/'.repeat(251)
	];
	for (const pattern of patterns) {
		assert.ok(api.validateRegexSpec(pattern, 'g'));
		const rx = new RegExp(pattern, 'g');
		assert.ok(rx.source.length > 256);
		for (let run = 0; run < 2; run++) assert.equal(api.safeRegexTest(rx, '@a'), true, JSON.stringify(pattern));
		assert.equal(api.safeRegexTest(rx, '@b'), false);
	}
	assert.equal(api.validateRegexSpec('@a|' + '/'.repeat(254)), null);
	assert.equal(api.safeRegexTest(new RegExp('a'.repeat(257)), '@a'), false);
});

test('source escape normalization preserves literal backslashes and line terminators', () => {
	const { api } = loadUserscript();
	const cases = [
		[String.raw`^@\\n$`, '@\\n', '@\n'],
		[String.raw`^@\\r$`, '@\\r', '@\r'],
		[String.raw`^@\\u2028$`, '@\\u2028', '@\u2028'],
		[String.raw`^@\\u2029$`, '@\\u2029', '@\u2029'],
		[String.raw`^@\\/$`, '@\\/', '@/'],
		['^@[' + '/'.repeat(250) + ']$', '@/', '@\\'],
		['^@\n$', '@\n', '@n'],
		['^@\u2028$', '@\u2028', '@u2028']
	];
	for (const [pattern, match, miss] of cases) {
		const rx = new RegExp(pattern);
		assert.ok(api.validateRegexSpec(pattern));
		assert.equal(api.safeRegexTest(rx, match), true, pattern);
		assert.equal(api.safeRegexTest(rx, miss), false, pattern);
	}
});

test('long slash rules survive storage reload and block comments and manager matches', () => {
	const { api, document } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pattern = '@a|' + '/'.repeat(252);
	assert.equal(storage.addRegex(pattern), true);
	const reloaded = new api.StorageV2(settings);
	assert.equal(reloaded.all()[0].value, pattern);
	const manager = new api.BlockListManager({ storage: reloaded });
	const matches = manager._getRegexMatches(reloaded.all()[0], [{ type: 'handle', value: '@a' }]);
	assert.equal(matches.length, 1);
	const hider = new api.CommentHider(reloaded, new api.PairMetaStorage(settings), settings);
	const comment = document.createElement('ytd-comment-renderer');
	const author = document.createElement('div');
	author.id = 'author-handle';
	author.textContent = '@a';
	comment.appendChild(author);
	hider.applyHide(comment);
	assert.equal(comment.classList.contains('tm-hidden'), true);
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
