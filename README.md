# 📌 YouTube Comment Blocker — v1.5.0

[English](README.md) | [한국어](README.ko.md)

Full reference: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

Tampermonkey userscript hiding YouTube comments by channel identity. `v1.5.0` retains `v0.6.x` safety, settings, pair-maintenance fixes; improves separate settings dialog, regex auto-add, debug counters, pair tools, quota guidance, paged regex matches, role-based sources, compact generated userscript.

Quick install:

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

Source layout:

- Edit role-based sources in `src/`
- Run `npm run build` to regenerate `ytblockhandlecomments.js`
- Run `npm run check:build` to verify root userscript matches `src/`
- Tampermonkey installs only root `ytblockhandlecomments.js`; `src/` is development source
- Generated root userscript compacted; keep readable edits in `src/`
- Commit changed `src/` files + rebuilt root userscript

## Documentation

- Wiki: [docs/WIKI.md](docs/WIKI.md) | [docs/WIKI.ko.md](docs/WIKI.ko.md)
- Changelog: [docs/CHANGELOG.md](docs/CHANGELOG.md) | [docs/CHANGELOG.ko.md](docs/CHANGELOG.ko.md)
- TODO: [docs/TODO.md](docs/TODO.md)
- About review helper: [docs/ABOUT.md](docs/ABOUT.md)

## Features

### Core blocking

- Block/unblock comment author by right-clicking handle.
- Leave other YouTube handle links unchanged.
- Add `Hide comments from this channel` to comment `⋯` menu.
- Hide matches live on watch pages and Shorts.
- Store `handle`, `id`, `regex` rules in `blocked_v2`.
- Choose `handle` matching or UID-pair `id` matching; regex remains independent.
- Optional case-sensitive handle matching.

### Comment automation

- Choose hidden, gray placeholder, or click-to-reveal comments.
- Auto-dislike modes: off, newly hidden only, always while hidden.
- Reapply keyword/auto-dislike actions when YouTube reuses comment DOM nodes.
- Configure regex, keyword fields, dislike, handle-block, UID-pair actions in one dialog.
- Validate regex length, flags, target, heuristics before storage/matching.
- Auto-save handles first hidden by regex for later handle matching.

### Settings and themes

- Separate settings dialog for API, UID, regex auto-add, display sizing, debug counters.
- Settings grouped by matching, comment display, keyword automation, logging, display size, maintenance.
- Auto-save; mark defaults with `(Default)`.
- Reset display/matching settings after confirmation.
- Five text/UI scales; level 2 matches previous size, level 3 default.
- Light, dark, system, inverted system, YouTube, inverted YouTube, custom themes.
- YouTube-theme sync uses only native YouTube dark-state signals.

### Block-list management

- Search/filter block list by rule type or handle tag.
- Select rows; run bulk actions.
- Show current userscript version.
- Show regex matched-handle counts; select matches in one click.
- Cache regex results; paginate expanded match lists.
- Return from export to list or download displayed rules as JSON/plain text.

### Channel pairing

- Detect optional channel IDs; store handle-channel-ID metadata in `pair_meta_v1`.
- Extract comment channel IDs from links/stable channel-ID attributes.
- Default handle resolution from public channel pages; cached YouTube Data API v3 lookup/fallback.
- Create/update UID pairs; show handle-level results.
- Filter/sort pair results; copy/export failures.
- Loading bars for API-key tests/pair actions.
- Structured quota guidance after repeated API-key quota failures.

### Logging and diagnostics

- Independent local retention and browser-console logging.
- Configure level, retention, prefix, timestamps, formats, timezone.
- Privacy-redacted V0-V5 diagnostics; V3 default.
- Pair-mode missed-channel-ID diagnostic counters.

### Navigation and performance

- Limit comment-host discovery to watch/Shorts roots with bounded retries.
- Observe added Shorts threads through stable comment-panel host.
- Detect SPA navigation via page data/history without resetting unchanged page keys.
- Navigation buttons between settings/block list.
- Refresh manager UI, dialogs, banners, menu labels after language changes.

## Usage

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Install from raw URL above, or paste `ytblockhandlecomments.js` into new userscript.
3. Open YouTube watch or Shorts page.
4. Right-click author handle, or use comment `⋯` menu, to block/unblock.
5. Open `Tampermonkey -> YouTube Comment Blocker -> Manage block list`.
6. Optionally save/test YouTube Data API v3 key for API lookup or page-lookup fallback.
7. Use search, filters, block/keyword automation dialog, bulk actions.
8. Enable channel-ID detection, choose pair rules, run `Create Pair` / `Update Pair` for channel-ID matching.
9. In Settings, toggle keyword automation; configure rules/actions in block/keyword automation dialog.

Typical pair flow:

1. Block handles.
2. In Settings, keep default YouTube channel-page lookup or choose API lookup.
3. Optionally save/test API key for lookup/fallback.
4. Enable channel-ID detection.
5. Run `Create Pair` for missing handles, or enable lookup on handle add.
6. Choose refresh interval and whether `Update Pair` verifies stored channel IDs, re-resolves handles, or both.
7. Review `Last Pair Run` details or watch-page banner when updates needed.

## Storage

Main rules:

```ts
{
  version: 2,
  updatedAt: number,
  items: Array<
    | { type: 'handle', value: string }
    | { type: 'id', value: string }
    | { type: 'regex', value: string, flags?: string }
  >
}
```

Pair metadata:

```ts
{
  version: 1,
  enableUidDetection: boolean,
  lastPairCheckAt: number | null,
  pairNotificationDismissedAt: number | null,
  pairs: Array<{
    handle: string,
    uid: string,
    verifiedAt: number | null,
    status: 'verified' | 'stale' | 'mismatch' | 'unverified',
    source: string,
    lastResolvedUid?: string | null,
    lastError?: string | null
  }>
}
```

App settings:

```ts
{
	version: 1,
	handleCaseSensitive: boolean,
	autoAddRegexHandles: boolean,
	blockMatchMode: 'handle' | 'pair',
	pairUpdateUidCheck: boolean,
	pairUpdateHandleLookup: boolean,
	handleLookupMethod: 'scraper' | 'api',
	handleLookupFallbackApi: boolean,
	handleLookupInterval: 'always' | '60' | '300' | '600' | '3600' | '43200' | '86400' | '604800' | '2592000' | 'custom',
	handleLookupCustomSeconds: number,
	handleLookupOnAdd: boolean,
	keywordAutomationEnabled: boolean,
	themeMode: 'light' | 'dark' | 'system' | 'system-inverted' | 'youtube' | 'youtube-inverted' | 'custom',
	themeCustom: { background: string, surface: string, text: string, muted: string, border: string, primary: string, danger: string },
	keywordRules: string[],
	keywordFields: { commentText: boolean, handle: boolean, pinned: boolean },
	keywordActions: { dislike: boolean, blockHandle: boolean, createPair: boolean },
  logging: { fileEnabled: boolean, consoleEnabled: boolean, level: 'error' | 'warn' | 'info' | 'debug', retention: 100 | 500 | 1000, consolePrefix: string, consoleTimestampEnabled: boolean, consoleTimeFormat: string, consoleTimeZone: string, consoleTimeZoneInput: string },
  verboseLevel: 0 | 1 | 2 | 3 | 4 | 5,
  dislikeMode: 'none' | 'new-hidden' | 'always',
  commentBlockMode: 'hide' | 'placeholder' | 'placeholder-reveal',
  fontSizeLevel: 1 | 2 | 3 | 4 | 5,
  uiScaleLevel: 1 | 2 | 3 | 4 | 5
}
```

API config:

```ts
{
  version: 2,
  apiKey: string,
  lastTestResult: {
    checkedAt: number,
    ok: boolean,
    category: 'ok' | 'invalid' | 'quota' | 'forbidden' | 'network' | 'unknown',
    httpStatus: number | null,
    message: string
  } | null
}
```

Notes:

- Rule storage key: `blocked_v2`
- Pair metadata key: `pair_meta_v1`
- App settings key: `app_settings_v1`
- API config key: `youtube_data_api_v3_config`
- Legacy `blockedHandles` and `blockedHandles_v1` migrate only absent valid `blocked_v2`; later deletes/clears cannot restore legacy entries.
- Cross-tab `blocked_v2` sync uses per-entry revisions/tombstones; concurrent additions merge, conflicts converge deterministically.
- Default `dislikeMode`: `none`
- Default `commentBlockMode`: `hide`
- Default `blockMatchMode`: `handle`; `pair` requires UID Detection and stored `id` rules
- Default channel-ID lookup fetches same-origin public channel page at `https://www.youtube.com/@<handle>` and parses `externalId`, `channelId`, then `itemprop="channelId"`. Undocumented HTML path may change.
- Lookup results cached in pair metadata/memory. Default refresh: 10 minutes page lookup, one week API lookup. Explicit selected-handle update bypasses cache.
- Page lookup failures preserve data; prompt retry or tested API fallback. API lookup needs saved key; costs one quota unit/request.
- At least one pair update check remains enabled; default re-resolves handles.
- Missing/unverified pair: use `handle` mode until UID rule created.
- Keyword matching case-insensitive; checks comment text by default; no actions until enabled.
- Logging off by default. Saved logs remain in Tampermonkey storage; downloadable as text. Browser controls download location.
- Console timestamps support calendar (`iso`, `iso-date`, `iso-basic-date`), week (`iso-week-date`), ordinal (`iso-ordinal-date`) dates. Custom formats combine `yyyy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, `W` for ISO basic/extended time/timezone forms.
- Rejected Tampermonkey settings, rule, pair, API-key, or log writes preserve previous value; UI requests retry.
- Default `verboseLevel`: `3`; V0/V1 omit payloads, V2 keeps one field, V3 three, V4 six, V5 ten. Nested API keys, tokens, URLs, accounts, comments, handles, user IDs removed before console/saved-log output.
- Default `fontSizeLevel` and `uiScaleLevel`: `3`; level `2` matches previous visual size.
- Pair metadata/API config excluded from import/export.
- Older handles may be lowercase; exact handle matching guaranteed only after re-saving or newly adding them.

## Testing

- Run `node --test`
- Run `npm run check:build`
- Local no-deps `node:test` harness with small DOM shim.
- Regression coverage: manager search, dialog i18n refresh, pair result UI state, sorting/filtering helpers, quota counters, navigation observer reset, pair update skip/force, regex safety/import literals.

## Notes

- `handle` default identity method; `pair` matches `id` rules only with `UID Detection` enabled.
- Pair creation/handle re-checks use YouTube Data API v3 `channels.list` with `forHandle` filter.
- Optional stored-UID verification uses `channels.list` with saved channel ID.
- UID matching local after pair data exists; API calls only during pair actions.
- `Update Pair` skips fresh verified pairs until stale; selected-handle bulk updates force lookup.
- Watch-page pair review banner stays quiet during stale interval after `Later` or recent pair check.
- Different resolved UID replaces old `id` rule, preventing stale-ID matches.
- API-key test uses same API family with fixed public channel probe.
- Search manager-only; comment-hide hot path uses cached sets.
- Regex auto-add stores matched handle as `handle`, avoiding later regex pass.
- Regex selection updates visible checkboxes/counters without full rerender.
- Regex expand/collapse and pagination update only affected row.
- API-key tests track repeated `quota` failures; show reset-window guidance.
- Pair run details filter/sort; failed handles copy/export.
- Regex targets handles only; keywords target comment text, handles, pinned labels.
- Plain-text import/export round-trips regex literals as `/pattern/flags`.
- Block-list export downloads displayed JSON/text without pair metadata/API config.
- Comment hiding scoped to watch-page/Shorts comments.
- Pair review banner scoped to watch pages.
- Navigation resets transient observers/metadata caches, avoiding retained old DOM nodes.
- YouTube-theme detection watches root, current `ytd-app`, direct `ytd-app` replacements only.
- Nested dialogs apply Escape, Enter, Tab focus, backdrop clicks to top dialog only.
- API tests/pair actions restore controls after errors; overlapping pair requests share one run.
- Performance counters available in settings and `window.__ytCommentBlockerPerf`.
- Logging limited to low-frequency app/pair/API events; never per-comment matching hot path.

## Userscript Metadata

- `@name`: `YouTube Comment Blocker`
- `@version`: `1.5.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`, `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

## Author

- **Mango_Clark**
- License: MIT
