# 📌 YouTube Comment Blocker — v1.4.0

[English](README.md) | [한국어](README.ko.md)

Full reference: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

A Tampermonkey userscript for hiding YouTube comments by channel identity. `v1.4.0` keeps the
`v0.6.x` safety, settings, and pair-maintenance fixes, then refines the separate settings dialog,
regex auto-add, debug counters, pair result tools, quota guidance, paged regex match lists,
role-based source files, and compact generated userscript output.

Quick install:

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

Source layout:

- Edit role-based source files in `src/`
- Run `npm run build` to regenerate `ytblockhandlecomments.js`
- Run `npm run check:build` to verify the root userscript matches `src/`
- Tampermonkey installs only the root `ytblockhandlecomments.js`; `src/` is development source
- The generated root userscript is compacted; keep readable edits in `src/`
- Commit both changed `src/` files and the rebuilt root userscript

## Documentation

- Wiki: [docs/WIKI.md](docs/WIKI.md) | [docs/WIKI.ko.md](docs/WIKI.ko.md)
- Changelog: [docs/CHANGELOG.md](docs/CHANGELOG.md) | [docs/CHANGELOG.ko.md](docs/CHANGELOG.ko.md)
- TODO: [docs/TODO.md](docs/TODO.md)
- About review helper: [docs/ABOUT.md](docs/ABOUT.md)

## Features

- Right-click a comment author handle to block or unblock it without overriding other YouTube handle links
- Adds `Hide comments from this channel` to the comment `⋯` menu
- Hides matching comments in real time on YouTube watch pages and Shorts pages
- Limits comment-host discovery to watch/Shorts roots with bounded retries, avoiding feed-wide mutation observation
- Uses a stable Shorts comment-panel host so added comment threads remain observed
- Detects YouTube SPA navigation from page-data and history updates without resetting unchanged page keys
- Configurable blocked-comment display: hide completely, show a gray placeholder, or click to reveal
- Configurable comment auto-dislike mode, defaulting to off: off, only when newly hidden, or always while hidden
- Re-applies keyword and auto-dislike actions when YouTube reuses a comment DOM node for a new author or body
- Supports a unified block and keyword automation dialog for regex rules, keyword matching fields, and independent dislike, handle-block, and UID-pair actions
- Supports independent local log retention and browser-console logging, with level and retention controls plus log-file download
- Supports configurable console-log prefixes and optional timestamps with ISO/custom formats and timezone selection
- Supports V0-V5 diagnostic-detail settings for log payloads, defaulting to balanced V3 output
- Supports `handle`, `id`, and `regex` rules in `blocked_v2`
- Supports selectable identity matching: `handle` rules by default or UID pair `id` rules; regex rules remain independent
- Applies regex length, flag, target, and heuristic safety checks before storing or matching rules
- Supports optional channel-ID detection with handle-to-channel-ID metadata in `pair_meta_v1`
- Extracts comment channel IDs from channel links and stable channel-ID attributes; pair-mode misses increment a diagnostic counter
- Resolves handles from their public YouTube channel page by default, with cached results and optional YouTube Data API v3 lookup/fallback
- Supports case-sensitive handle matching
- Supports a separate settings dialog with API, UID, regex auto-add, display sizing, and debug counters
- Uses a category-list settings layout with task-grouped controls, descriptions, and automatic saves
- Groups settings controls by matching, comment display, keyword automation, logging, display size, and maintenance
- Marks default saved-setting choices with a muted `(Default)` label
- Supports resetting app display and matching settings after a confirmation prompt
- Supports five-level text and UI scale settings; level 2 matches the previous size and level 3 is the default
- Supports light, dark, system, inverted system, YouTube, inverted YouTube, and custom themes for userscript UI only
- Keeps YouTube-theme synchronization limited to native YouTube dark-state signals
- Adds in-dialog navigation buttons between settings and the block list
- Can auto-save handles first hidden by regex so later checks use handle matching
- Supports block-list search, type filters, tag filters, row selection, and bulk actions
- Shows the current userscript version in the manager dialog
- Shows regex rows with matched-handle counts and one-click matching-handle selection
- Reuses cached regex match results so matching-handle selection no longer rebuilds the full list
- Pages expanded regex match lists in the manager so very large match sets do not render at once
- Shows handle-level pair results after create/update runs
- Supports filtering/sorting pair results and copying/exporting failed handles
- Lets the block-list export dialog return to the list or download the current rules as JSON or plain text
- Shows loading bars while API key tests or pair create/update actions are waiting on the network
- Shows structured quota guidance after repeated API-key quota failures
- Refreshes manager UI, dialogs, banner text, and menu labels after language changes

## Usage

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Install from the raw URL above, or paste `ytblockhandlecomments.js` into a new userscript.
3. Open a YouTube watch page or Shorts page.
4. Right-click a comment author's handle, or use the comment `⋯` menu, to block/unblock.
5. Open `Tampermonkey -> YouTube Comment Blocker -> Manage block list`.
6. Optionally save and test a YouTube Data API v3 key for API lookup or page-lookup fallback.
7. Use search, filters, the block and keyword automation dialog, and bulk actions to maintain the list.
8. Turn on channel-ID detection, choose pair rules, and run `Create Pair` / `Update Pair` when you want channel-ID-backed matching.
9. In Settings, enable or disable keyword automation, then use the block and keyword automation dialog to configure its rules and actions.

Typical pair flow:

1. Block one or more handles.
2. In Settings, keep the default YouTube channel-page lookup or explicitly choose API lookup.
3. Optionally save and test an API key for API lookup or fallback.
4. Turn on channel-ID detection.
5. Run `Create Pair` for missing handles, or enable lookup when a handle is added.
6. Choose the refresh interval and whether `Update Pair` verifies stored channel IDs, re-resolves handles, or both.
7. Review `Last Pair Run` details or the watch-page banner when updates are needed.

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
- Legacy `blockedHandles` and `blockedHandles_v1` migrate only when a valid `blocked_v2` store is absent; later deletes and clears cannot restore legacy entries.
- Cross-tab `blocked_v2` sync uses per-entry revisions and tombstones, so concurrent additions merge and add/delete/clear conflicts converge deterministically.
- Default `dislikeMode` is `none`
- Default `commentBlockMode` is `hide`
- Default `blockMatchMode` is `handle`; `pair` requires UID Detection and matches stored `id` rules
- Default channel-ID lookup fetches the same-origin public channel page at `https://www.youtube.com/@<handle>` and parses `externalId`, `channelId`, then `itemprop="channelId"`. This undocumented HTML path can change.
- Lookup results are cached in pair metadata and in memory. The default refresh interval is 10 minutes for page lookup and one week for API lookup; an explicit selected-handle update bypasses the cache.
- Page lookup failures keep existing data and tell users to retry or enable tested API fallback. API lookup requires the saved key and consumes one quota unit per request.
- At least one pair update check stays enabled; the default re-resolves handles
- If a pair is missing or unverified, switch back to `handle` mode until a UID rule is created
- Keyword matching is case-insensitive; it checks comment text by default and runs no actions until enabled
- Logging is off by default. Saved log entries stay in Tampermonkey storage and can be downloaded as a text file; browser download location is browser-controlled
- If Tampermonkey rejects a settings, rule, pair, API-key, or log write, the previous saved value remains active and the UI asks you to retry
- Default `verboseLevel` is `3`; V0/V1 omit diagnostic payloads, V2 limits payload fields, V3 keeps three fields, and V4/V5 keep all fields
- Default `fontSizeLevel` and `uiScaleLevel` are `3`; level `2` matches the previous visual size
- Pair metadata and API config are excluded from import/export
- Older handles may already be stored in lowercase, so exact handle matching is guaranteed only
  after re-saving or newly adding those handles

## Testing

- Run `node --test`
- Run `npm run check:build`
- The repo uses a local no-deps `node:test` harness with a small DOM shim
- Current regression coverage includes manager search, dialog i18n refresh, pair result UI state,
  pair result sorting/filtering helpers, quota guidance counters, navigation observer reset, pair
  update skip/force behavior, and regex safety/import literals

## Notes

- `handle` is the default identity blocking method; `pair` matches `id` rules only while `UID Detection` is enabled
- Pair creation and handle re-checks use YouTube Data API v3 `channels.list` with the `forHandle` filter
- Optional stored-UID verification uses `channels.list` with the saved channel ID
- UID matching is local after pair data exists; API calls happen only during pair actions
- `Update Pair` skips fresh verified pairs until their stale interval expires, while selected-handle
  bulk updates still force a lookup for those selected handles
- The watch-page pair review banner stays quiet for the stale interval after `Later` or a recent
  pair check
- If a pair update resolves a different UID, the old `id` rule is replaced so stale IDs stop
  matching old channels
- API-key testing uses the same API family with a fixed public channel probe
- Search is manager-only; comment-hide hot-path lookup still uses cached sets
- Regex auto-add stores a matched handle as a `handle` rule, so later matches avoid a second regex
  pass for that channel
- Regex selection now updates visible checkboxes and counters without full-list rerendering
- Regex expand/collapse and match-list pagination update only the affected row
- API-key tests track repeated `quota` failures and show reset-window guidance in the manager
- Pair run details can be filtered/sorted, and failed handles can be copied or exported
- Regex rules only target handles; keyword rules can target comment text, author handles, and pinned labels
- Plain-text import/export round-trips regex literals as `/pattern/flags`
- Block-list export can download the displayed JSON or text representation without including pair metadata or API configuration
- Comment hiding is intentionally scoped to watch-page and Shorts comments
- The pair review banner remains intentionally scoped to watch pages
- Navigation resets transient comment observers and metadata caches so long YouTube sessions do not
  retain old comment DOM nodes
- YouTube-theme detection watches only the root, the current `ytd-app`, and direct `ytd-app` replacement events
- Nested dialogs keep Escape, Enter, Tab focus handling, and backdrop clicks on the top dialog only
- API tests and pair actions restore their controls after unexpected errors; overlapping pair requests share one run
- Performance counters are exposed in the settings dialog and on `window.__ytCommentBlockerPerf`
- Logging is limited to low-frequency app and pair/API events, never the per-comment matching hot path

## Userscript Metadata

- `@name`: `YouTube Comment Blocker`
- `@version`: `1.4.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

## Author

- **Mango_Clark**
- License: MIT
