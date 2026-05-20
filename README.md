# 📌 YouTube Comment Blocker — v0.5.0

[English](README.md) | [한국어](README.ko.md)

Full reference: [WIKI.md](WIKI.md) | [WIKI.ko.md](WIKI.ko.md)

A Tampermonkey userscript for hiding YouTube comments by channel identity. `v0.5.0` keeps the
`v0.4.x` manager and Shorts support, then adds long-session memory cleanup, lower-noise pair
updates, and visible script version information in the manager dialog.

Quick install:

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## Features

- Right-click an author handle to block or unblock it
- Adds `Hide comments from this channel` to the comment `⋯` menu
- Hides matching comments in real time on YouTube watch pages and Shorts pages
- Supports `handle`, `id`, and `regex` rules in `blocked_v2`
- Supports optional UID detection with handle↔UID metadata in `pair_meta_v1`
- Stores a local-only YouTube Data API v3 key and validates it before pair maintenance
- Supports case-sensitive handle matching
- Supports block-list search, type filters, tag filters, row selection, and bulk actions
- Shows the current userscript version in the manager dialog
- Shows regex rows with matched-handle counts and one-click matching-handle selection
- Reuses cached regex match results so matching-handle selection no longer rebuilds the full list
- Shows handle-level pair results after create/update runs
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

## Notes

- Handle blocking always stays enabled
- `id` rules participate only while `UID Detection` is enabled
- UID lookup uses YouTube Data API v3 `channels.list` with the `forHandle` filter
- UID matching is local after pair data exists; API calls happen only during pair actions
- `Update Pair` skips fresh verified pairs until their stale interval expires, while selected-handle
  bulk updates still force a lookup for those selected handles
- API-key testing uses the same API family with a fixed public channel probe
- Search is manager-only; comment-hide hot-path lookup still uses cached sets
- Regex selection now updates visible checkboxes and counters without full-list rerendering
- Regex rules only target handles, not comment text
- Comment hiding is intentionally scoped to watch-page and Shorts comments
- The pair review banner remains intentionally scoped to watch pages
- Navigation resets transient comment observers and metadata caches so long YouTube sessions do not
  retain old comment DOM nodes
- Performance counters are exposed on `window.__ytCommentBlockerPerf`

## Userscript Metadata

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.5.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

## Author

- **Mango_Clark**
- License: MIT
