'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadUserscript } = require('./helpers/load-userscript');

test('regex safety validation rejects catastrophic alternation pattern', () => {
	const { api } = loadUserscript();
	assert.equal(api.validateRegexSpec('(a|aa)+$'), null);
});

test('exported regex literal parses back with original pattern and flags', () => {
	const { api } = loadUserscript();
	const literal = api.exportRegexLiteral({ type: 'regex', value: '^@foo/bar$', flags: 'i' });
	const parsed = api.parseRegexLiteral(literal);

	assert.equal(literal, '/^@foo\\/bar$/i');
	assert.equal(parsed.pattern, '^@foo/bar$');
	assert.equal(parsed.flags, 'i');
});
