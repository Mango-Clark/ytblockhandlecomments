# 📌 YouTube Comment Blocker — v0.5.1

[English](README.md) | [한국어](README.ko.md)

Full reference: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

A Tampermonkey userscript for hiding YouTube comments by channel identity. `v0.5.1` keeps the
`v0.4.x` manager and Shorts support, then adds long-session memory cleanup, lower-noise pair
updates, and visible script version information in the manager dialog.

Quick install:

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

Source layout:

- Edit role-based source files in `src/`
- Run `npm run build` to regenerate `ytblockhandlecomments.js`
- Run `npm run check:build` to verify the root userscript matches `src/`

## Documentation

- Wiki: [docs/WIKI.md](docs/WIKI.md) | [docs/WIKI.ko.md](docs/WIKI.ko.md)
- Changelog: [docs/CHANGELOG.md](docs/CHANGELOG.md) | [docs/CHANGELOG.ko.md](docs/CHANGELOG.ko.md)
- TODO: [docs/TODO.md](docs/TODO.md)
- About review helper: [docs/ABOUT.md](docs/ABOUT.md)

## Features

- Right-click an author handle to block or unblock it
- Adds `Hide comments from this channel` to the comment `⋯` menu
- Hides matching comments in real time on YouTube watch pages and Shorts pages
- Supports `handle`, `id`, and `regex` rules in `blocked_v2`
- Applies regex length, flag, target, and heuristic safety checks before storing or matching rules
- Supports optional UID detection with handle↔UID metadata in `pair_meta_v1`
- Stores a local-only YouTube Data API v3 key and validates it before pair maintenance
- Supports case-sensitive handle matching
- Supports block-list search, type filters, tag filters, row selection, and bulk actions
- Shows the current userscript version in the manager dialog
- Shows regex rows with matched-handle counts and one-click matching-handle selection
- Reuses cached regex match results so matching-handle selection no longer rebuilds the full list
- Pages expanded regex match lists in the manager so very large match sets do not render at once
- Shows handle-level pair results after create/update runs
- Supports filtering/sorting pair results and copying/exporting failed handles
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
8. Turn on `UID Detection` and run `Create Pair` / `Update Pair` when you want UID-backed matching.

Typical pair flow:

1. Block one or more handles.
2. Save and test your API key.
3. Turn on `UID Detection`.
4. Run `Create Pair` for missing handles.
5. Review `Last Pair Run` details or the watch-page banner when updates are needed.

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
  handleCaseSensitive: boolean
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

- Handle blocking always stays enabled
- `id` rules participate only while `UID Detection` is enabled
- UID lookup uses YouTube Data API v3 `channels.list` with the `forHandle` filter
- UID matching is local after pair data exists; API calls happen only during pair actions
- `Update Pair` skips fresh verified pairs until their stale interval expires, while selected-handle
  bulk updates still force a lookup for those selected handles
- If a pair update resolves a different UID, the old `id` rule is replaced so stale IDs stop
  matching old channels
- API-key testing uses the same API family with a fixed public channel probe
- Search is manager-only; comment-hide hot-path lookup still uses cached sets
- Regex selection now updates visible checkboxes and counters without full-list rerendering
- Regex expand/collapse and match-list pagination update only the affected row
- API-key tests track repeated `quota` failures and show reset-window guidance in the manager
- Pair run details can be filtered/sorted, and failed handles can be copied or exported
- Regex rules only target handles, not comment text
- Plain-text import/export round-trips regex literals as `/pattern/flags`
- Comment hiding is intentionally scoped to watch-page and Shorts comments
- The pair review banner remains intentionally scoped to watch pages
- Navigation resets transient comment observers and metadata caches so long YouTube sessions do not
  retain old comment DOM nodes
- Performance counters are exposed on `window.__ytCommentBlockerPerf`

## Userscript Metadata

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.5.1`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

## Author

- **Mango_Clark**
- License: MIT
