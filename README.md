# 📌 YouTube Comment Blocker — v1.5.0

[English](README.md) | [한국어](README.ko.md)

Full reference: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

A Tampermonkey userscript for hiding YouTube comments by channel identity. `v1.5.0` keeps the
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

### Core blocking

- Block or unblock a comment author by right-clicking its handle.
- Leave other YouTube handle links untouched.
- Add `Hide comments from this channel` to the comment `⋯` menu.
- Hide matching comments in real time on watch pages and Shorts.
- Store `handle`, `id`, and `regex` rules in `blocked_v2`.
- Choose `handle` matching or UID-pair `id` matching; regex rules remain independent.
- Match handles case-sensitively when enabled.

### Comment automation

- Choose hidden comments, gray placeholders, or click-to-reveal placeholders.
- Configure comment auto-dislike: off, newly hidden only, or always while hidden.
- Re-apply keyword and auto-dislike actions when YouTube reuses comment DOM nodes.
- Configure regex rules, keyword fields, dislike, handle-block, and UID-pair actions in one dialog.
- Apply regex length, flag, target, and heuristic safety checks before storing or matching.
- Auto-save handles first hidden by regex for later handle matching.

### Settings and themes

- Use a separate settings dialog for API, UID, regex auto-add, display sizing, and debug counters.
- Organize settings by matching, comment display, keyword automation, logging, display size, and maintenance.
- Save settings automatically and mark default choices with `(Default)`.
- Reset display and matching settings after confirmation.
- Adjust text and UI scale across five levels; level 2 matches the previous size and level 3 is default.
- Choose light, dark, system, inverted system, YouTube, inverted YouTube, or custom userscript UI themes.
- Keep YouTube-theme synchronization limited to native YouTube dark-state signals.

### Block-list management

- Search and filter the block list by rule type or handle tag.
- Select rows and run bulk actions.
- Show the current userscript version in the manager.
- Show regex matched-handle counts and select matching handles with one click.
- Cache regex results and paginate expanded match lists for large result sets.
- Return from export to the list or download displayed rules as JSON or plain text.

### Channel pairing

- Detect optional channel IDs and store handle-to-channel-ID metadata in `pair_meta_v1`.
- Extract comment channel IDs from links and stable channel-ID attributes.
- Resolve handles from public channel pages by default, with cached YouTube Data API v3 lookup/fallback.
- Create or update UID pairs and show handle-level results.
- Filter or sort pair results and copy/export failed handles.
- Show loading bars during API-key tests and pair actions.
- Show structured quota guidance after repeated API-key quota failures.

### Logging and diagnostics

- Keep local log retention and browser-console logging independent.
- Configure log level, retention, prefix, timestamps, formats, and timezone.
- Configure privacy-redacted V0-V5 diagnostic detail; V3 is the default.
- Count missed channel IDs in pair mode with diagnostic counters.

### Navigation and performance

- Limit comment-host discovery to watch/Shorts roots with bounded retries.
- Keep added Shorts comment threads observed through a stable comment-panel host.
- Detect SPA navigation from page data and history without resetting unchanged page keys.
- Add navigation buttons between settings and the block list.
- Refresh manager UI, dialogs, banner text, and menu labels after language changes.

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
- Console timestamps support calendar (`iso`, `iso-date`, `iso-basic-date`), week (`iso-week-date`), and ordinal (`iso-ordinal-date`) dates. Custom formats combine `yyyy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, and `W` for ISO basic or extended time and timezone forms.
- If Tampermonkey rejects a settings, rule, pair, API-key, or log write, the previous saved value remains active and the UI asks you to retry
- Default `verboseLevel` is `3`; V0/V1 omit diagnostic payloads, V2 keeps one field, V3 three, V4 six, and V5 ten. Nested API keys, tokens, URLs, accounts, comments, handles, and user identifiers are removed before console or saved-log output.
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
- `@version`: `1.5.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

## Author

- **Mango_Clark**
- License: MIT
