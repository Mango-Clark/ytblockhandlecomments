	/* ----------------------------------------------------------
	 * 9. Bootstrap
	 * ---------------------------------------------------------- */
	if (TEST_HOOK && typeof TEST_HOOK === 'object') {
		Object.assign(TEST_HOOK, {
			AppSettingsStorage,
			StorageV2,
			PairMetaStorage,
			ApiConfigStorage,
			PairService,
			CommentHider,
			Dialog,
			BlockListManager,
			App,
			t,
			validateRegexSpec,
			parseRegexLiteral,
			exportRegexLiteral,
			safeRegexTest,
			buildManagerSearchIndex,
			searchManagerIndex,
			getScriptVersion
		});
	}
	if (!TEST_HOOK?.skipBootstrap) {
		// Defer a tick to allow YT initial paint, then start
		requestAnimationFrame(() => new App());
	}
})();
