# 📌 YouTube Comment Blocker — v1.2.0

[English](README.md) | [한국어](README.ko.md)

Full reference: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

A Tampermonkey userscript for hiding YouTube comments by channel identity. `v1.2.0` keeps the
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

- Right-click an author handle to block or unblock it
- Adds `Hide comments from this channel` to the comment `⋯` menu
- Hides matching comments in real time on YouTube watch pages and Shorts pages
- Configurable blocked-comment display: hide completely, show a gray placeholder, or click to reveal
- Configurable comment auto-dislike mode, defaulting to off: off, only when newly hidden, or always while hidden
- Supports keyword automation over comment text, author handles, and pinned labels with independent dislike, handle-block, and UID-pair actions
- Supports independent local log retention and browser-console logging, with level and retention controls plus log-file download
- Supports V0-V5 diagnostic-detail settings for log payloads, defaulting to balanced V3 output
- Supports `handle`, `id`, and `regex` rules in `blocked_v2`
- Supports selectable identity matching: `handle` rules by default or UID pair `id` rules; regex rules remain independent
- Applies regex length, flag, target, and heuristic safety checks before storing or matching rules
- Supports optional UID detection with handle↔UID metadata in `pair_meta_v1`
- Stores a local-only YouTube Data API v3 key and validates it before pair maintenance
- Supports case-sensitive handle matching
- Supports a separate settings dialog with API, UID, regex auto-add, display sizing, and debug counters
- Uses a category-list settings layout with task-grouped controls, descriptions, and automatic saves
- Groups settings controls by matching, comment display, display size, and maintenance
- Supports resetting app display and matching settings after a confirmation prompt
- Supports five-level text and UI scale settings; level 2 matches the previous size and level 3 is the default
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
6. Save your YouTube Data API v3 key and optionally run `Test API Key`.
7. Use search, filters, regex tools, and bulk actions to maintain the list.
8. Turn on `UID Detection`, choose `UID pair rules`, and run `Create Pair` / `Update Pair` when you want UID-backed matching.
9. In Settings, add keyword rules and choose the inputs and actions that should run after a match.

Typical pair flow:

1. Block one or more handles.
2. Save and test your API key.
3. Turn on `UID Detection`.
4. Run `Create Pair` for missing handles.
5. Choose whether `Update Pair` verifies stored UIDs, re-resolves handles, or both.
6. Review `Last Pair Run` details or the watch-page banner when updates are needed.

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
	keywordRules: string[],
	keywordFields: { commentText: boolean, handle: boolean, pinned: boolean },
	keywordActions: { dislike: boolean, blockHandle: boolean, createPair: boolean },
  logging: { fileEnabled: boolean, consoleEnabled: boolean, level: 'error' | 'warn' | 'info' | 'debug', retention: 100 | 500 | 1000 },
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
- Default `dislikeMode` is `none`
- Default `commentBlockMode` is `hide`
- Default `blockMatchMode` is `handle`; `pair` requires UID Detection and matches stored `id` rules
- At least one pair update check stays enabled; the default re-resolves handles
- If a pair is missing or unverified, switch back to `handle` mode until a UID rule is created
- Keyword matching is case-insensitive; it checks comment text by default and runs no actions until enabled
- Logging is off by default. Saved log entries stay in Tampermonkey storage and can be downloaded as a text file; browser download location is browser-controlled
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
- Performance counters are exposed in the settings dialog and on `window.__ytCommentBlockerPerf`
- Logging is limited to low-frequency app and pair/API events, never the per-comment matching hot path

## Userscript Metadata

- `@name`: `YouTube Comment Blocker`
- `@version`: `1.2.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

## Author

- **Mango_Clark**
- License: MIT
