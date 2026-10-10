import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, matchBrowserLocale, matchSavedLocale } from '../src/i18n/locales.ts';
import { loadUserscript } from './helpers/load-userscript.ts';

test('locale matching preserves explicit choices and maps browser regions/scripts', () => {
	for (const locale of LOCALES) assert.equal(matchSavedLocale(locale.code), locale.code);
	assert.equal(matchSavedLocale('en'), 'en-us');
	assert.equal(matchSavedLocale('ko'), 'ko-kr');
	assert.equal(matchSavedLocale('en-GB'), null);
	for (const [input, output] of [
		['en-GB', 'en-us'], ['pt-PT', 'pt-br'], ['de-AT', 'de-de'],
		['zh', 'zh-cn'], ['zh-SG', 'zh-cn'], ['zh-HK', 'zh-tw'],
		['zh-Hans-TW', 'zh-cn'], ['zh-Hant-CN', 'zh-tw'], ['ZH-TW', 'zh-tw']
	]) assert.equal(matchBrowserLocale(input), output);
	assert.equal(matchBrowserLocale('es-ES'), null);
	assert.equal(matchBrowserLocale(null), null);
});

test('saved locale precedes ordered browser preferences and unsupported languages fall back', () => {
	const { api, setLang, gmStore } = loadUserscript({ languages: ['es-ES', 'de-AT', 'ja-JP'] });
	assert.equal(api.getLang(), 'de-de');
	setLang('ko');
	assert.equal(api.getLang(), 'ko-kr');
	assert.equal(api.setLanguagePreference('ja-jp'), true);
	assert.equal(gmStore.get('lang'), 'ja-jp');
	assert.equal(api.getLang(), 'ja-jp');
	api.setLanguagePreference('auto');
	assert.equal(api.getLang(), 'de-de');
	assert.equal(api.setLanguagePreference('invalid'), false);
	assert.equal(loadUserscript({ language: 'es-ES' }).api.getLang(), 'en-us');
});

test('failed language writes preserve selection and browser preferences survive failed reads', () => {
	const { api } = loadUserscript({ gmStore: { lang: 'fr-fr' }, gmSetValue: () => { throw new Error('storage rejected'); } });
	assert.equal(api.setLanguagePreference('ja-jp'), false);
	assert.equal(api.getLang(), 'fr-fr');
	const fallback = loadUserscript({ language: 'zh-Hant', gmGetValue: () => { throw new Error('read rejected'); } });
	assert.equal(fallback.api.getLang(), 'zh-tw');
});

test('all ten catalogs cover the English keys and preserve function interpolation', () => {
	const { api, setLang } = loadUserscript();
	const english = api.I18N['en-us'];
	const keys = Object.keys(english).sort();
	const values = { count: 7123, reset: 'RESET_TOKEN', created: 8123, refreshed: 9123, mismatches: 6123, failed: 5123, addedIds: 4123, skipped: 3123, persistenceFailures: 2123, selected: 1123, visible: 10123, total: 11123 };
	for (const locale of LOCALES) {
		const messages = api.I18N[locale.code];
		assert.deepEqual(Object.keys(messages).sort(), keys, locale.code);
		setLang(locale.code);
		for (const key of keys) {
			assert.equal(typeof messages[key], typeof english[key], `${locale.code}/${key}`);
			if (typeof english[key] === 'function') {
				const args = [values, 'ARG2_TOKEN', 'ARG3_TOKEN', 'ARG4_TOKEN'];
				const expected = english[key](...args);
				const result = messages[key](...args);
				for (const token of [...Object.values(values).map(String), '[object Object]', 'ARG2_TOKEN', 'ARG3_TOKEN', 'ARG4_TOKEN']) {
					if (expected.includes(token)) assert.ok(result.includes(token), `${locale.code}/${key}: ${token}`);
				}
			} else assert.ok(messages[key].length, `${locale.code}/${key}`);
		}
		assert.ok(api.t('pairResult', { ...values, skipped: undefined }).includes('0'));
		assert.ok(api.t('pairLastCheck', '').length);
		assert.equal(api.formatDateTime(0), null);
		assert.ok(api.formatDateTime(1700000000000));
	}
});

test('settings language changes preserve API drafts, focus, and list state across remote changes', () => {
	const { api, document, gmStore, dispatchGMValueChange } = loadUserscript();
	const settings = new api.AppSettingsStorage();
	const storage = new api.StorageV2(settings);
	const pairStore = new api.PairMetaStorage(settings);
	const apiConfig = new api.ApiConfigStorage();
	const app = {
		settings, storage, pairStore, apiConfig,
		pairService: new api.PairService(storage, pairStore, apiConfig, settings),
		getLastPairRunResult: () => null,
		refreshAfterStorageChange: () => {},
		_registerMenu: () => {},
		_syncPairBanner: () => {},
		refreshLanguageUi() { api.App.prototype.refreshLanguageUi.call(this); }
	};
	const manager = new api.BlockListManager(app);
	manager._listViewState.searchQuery = 'draft search';
	manager._listViewState.selection = ['h:@example'];
	manager._listViewState.page = 2;
	const listState = JSON.stringify(manager._listViewState);
	manager.openSettings('display');
	const language = document.querySelectorAll('select').find((select: any) => select.dataset.setting === 'language');
	assert.equal(language.options.length, 11);
	const input = document.querySelector('#tm-settings-api-key');
	input.value = 'unsaved-example';
	input.dispatchEvent({ type: 'input' });
	for (const locale of LOCALES) {
		language.value = locale.code;
		language.focus();
		language.dispatchEvent({ type: 'change' });
		assert.equal(api.getLang(), locale.code);
		assert.equal(document.querySelector('.tm-dialog').lang, locale.code);
		assert.equal(input.value, 'unsaved-example');
		assert.equal(document.activeElement, language);
		assert.equal(JSON.stringify(manager._listViewState), listState);
	}
	api.App.prototype._syncAcrossTabs.call(app);
	input.focus();
	gmStore.set('lang', 'ja-jp');
	dispatchGMValueChange('lang', 'ja-jp');
	assert.equal(language.value, 'ja-jp');
	assert.equal(input.value, 'unsaved-example');
	assert.equal(document.activeElement, input);
	assert.equal(JSON.stringify(manager._listViewState), listState);
	api.Dialog.closeAll();
});

test('language menu opens the shared selector and refreshes existing script labels', () => {
	const { api, context, document, gmStore } = loadUserscript({ gmStore: { lang: 'en' } });
	const commands: Array<{ label: string; run: () => void }> = [];
	context.GM_registerMenuCommand = (label: string, run: () => void) => { commands.push({ label, run }); return commands.length; };
	const app = Object.create(api.App.prototype);
	app._syncPairBanner = () => {};
	app._registerMenu();
	commands.find(command => command.label.startsWith('🌐'))?.run();
	const select = document.querySelector('.tm-language-picker select');
	assert.equal(select.options.length, 11);
	const placeholder = document.createElement('button');
	placeholder.className = 'tm-block-placeholder';
	document.body.appendChild(placeholder);
	const item = document.createElement('div');
	item.className = 'tm-hide-channel';
	item.setAttribute('data-tm-state', 'blocked');
	const label = document.createElement('span');
	label.className = 'tm-menu-script-label';
	item.appendChild(label);
	document.body.appendChild(item);
	select.value = 'zh-tw';
	select.dispatchEvent({ type: 'change' });
	assert.equal(gmStore.get('lang'), 'zh-tw');
	assert.equal(placeholder.textContent, api.t('blockedCommentReveal'));
	assert.equal(label.textContent, api.t('menuUnhide'));
	assert.equal(item.lang, 'zh-tw');
	assert.equal(document.querySelector('.tm-dialog').lang, 'zh-tw');
	api.Dialog.closeAll();
});
