import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserscript } from './helpers/load-userscript.ts';

const CHANNEL_ID = `UC${'a'.repeat(22)}`;

test('stored app settings normalize invalid values and duplicate keywords', () => {
	const { api } = loadUserscript({
		gmStore: {
			app_settings_v1: {
				blockMatchMode: 'invalid',
				dislikeMode: 'invalid',
				commentBlockMode: 'invalid',
				fontSizeLevel: 9,
				uiScaleLevel: 0,
				keywordRules: [' Spam ', 'spam', '', 'Useful'],
				keywordFields: null,
				keywordActions: 'invalid',
				themeMode: 'invalid',
				themeCustom: { primary: '#ABCDEF', danger: 'red' },
				logging: { level: 'trace', retention: 7, consolePrefix: '\n' }
			}
		}
	});
	const settings = new api.AppSettingsStorage();

	assert.equal(settings.getBlockMatchMode(), 'handle');
	assert.equal(settings.getDislikeMode(), 'none');
	assert.equal(settings.getCommentBlockMode(), 'hide');
	assert.equal(settings.getFontSizeLevel(), 3);
	assert.equal(settings.getUiScaleLevel(), 3);
	assert.deepEqual(Array.from(settings.getKeywordAutomation().keywords), ['Spam', 'Useful']);
	assert.equal(settings.getThemeMode(), 'system');
	assert.equal(settings.getThemeCustom().primary, '#abcdef');
	assert.equal(settings.getThemeCustom().danger, '#b3261e');
	assert.equal(settings.getLogging().level, 'warn');
	assert.equal(settings.getLogging().retention, 500);
	assert.equal(settings.getLogging().consolePrefix, '[YTCB]');
});

test('stored block entries reject malformed values and deduplicate handles', () => {
	const { api } = loadUserscript({
		gmStore: {
			blocked_v2: {
				version: 2,
				updatedAt: 1,
				items: [
					{ type: 'handle', value: ' @Alpha ' },
					{ type: 'handle', value: '@alpha' },
					{ type: 'id', value: 'not-a-channel' },
					{ type: 'id', value: CHANNEL_ID },
					{ type: 'regex', value: '(a+)+$', flags: '' },
					{ type: 'regex', value: '^safe$', flags: 'i' },
					{ type: 'unknown', value: 'ignored' }
				]
			}
		}
	});
	const storage = new api.StorageV2(new api.AppSettingsStorage());

	assert.deepEqual(Array.from(storage.all(), (item: any) => ({ ...item })), [
		{ type: 'handle', value: '@Alpha' },
		{ type: 'id', value: CHANNEL_ID },
		{ type: 'regex', value: '^safe$', flags: 'i' }
	]);
});

test('stored pair metadata drops invalid records and normalizes duplicate handles', () => {
	const { api } = loadUserscript({
		gmStore: {
			pair_meta_v1: {
				version: 1,
				enableUidDetection: 1,
				pairs: [
					{ handle: '', uid: CHANNEL_ID },
					{ handle: '@Alpha', uid: CHANNEL_ID, status: 'verified', verifiedAt: null },
					{ handle: '@alpha', uid: 'invalid', status: 'verified', source: ' cache ' }
				]
			}
		}
	});
	const pairs = new api.PairMetaStorage(new api.AppSettingsStorage());

	assert.equal(pairs.isUidDetectionEnabled(), true);
	assert.deepEqual(Array.from(pairs.allPairs(), (pair: any) => ({ ...pair })), [{
		handle: '@alpha',
		uid: '',
		verifiedAt: null,
		status: 'unverified',
		source: 'cache',
		lastResolvedUid: null,
		lastError: null
	}]);
});

test('stored API config extracts keys and normalizes invalid test metadata', () => {
	const { api } = loadUserscript({
		gmStore: {
			youtube_data_api_v3_config: {
				apiKey: 'https://example.test/request?key=abc%20def',
				lastTestResult: { category: 'other', checkedAt: 'invalid', httpStatus: '403' },
				quotaFailureCount: 2.9,
				lastQuotaFailureAt: 'invalid'
			}
		}
	});
	const config = new api.ApiConfigStorage();

	assert.equal(config.getApiKey(), 'abcdef');
	assert.equal(config.getMaskedApiKey(), '••••••');
	assert.equal(config.getLastTestResult().category, 'unknown');
	assert.equal(config.getLastTestResult().httpStatus, null);
	assert.equal(config.getLastTestResult().message, 'Unknown');
	assert.equal(config.getState().quotaFailureCount, 2);
	assert.equal(config.getState().lastQuotaFailureAt, null);
	assert.equal(config.getQuotaGuidance(), null);
});
