import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

test('regex safety validation rejects catastrophic alternation pattern', () => {
	const { api } = loadUserscript();
	assert.equal(api.validateRegexSpec('(a|aa)+$'), null);
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
