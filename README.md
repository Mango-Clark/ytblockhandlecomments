# 📌 YouTube Comment Blocker — v0.4.0-pre2

[English](README.md) | [한국어](README.ko.md)

Full reference: [WIKI.md](WIKI.md) | [WIKI.ko.md](WIKI.ko.md)

A Tampermonkey userscript for hiding YouTube comments by channel identity. Handle blocking remains
the default flow, and `v0.4.0-pre2` adds case-sensitive handle matching, block-list selection and
filtering, and bulk pair actions on top of the existing YouTube Data API v3 UID flow.

Quick install: open this raw URL in Tampermonkey to install or update

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

---

## Features

- Right-click an author handle to block or unblock it
- Adds `Hide comments from this channel` to the comment `⋯` menu
- Hides matching comments in real time on YouTube watch pages
- Supports `handle`, `id`, and `regex` rules in `blocked_v2`
- Adds optional `UID Detection` in the manager dialog
- Adds a local-only YouTube Data API key section in the manager dialog
- Stores handle↔UID pair metadata in `pair_meta_v1`
- Provides `Create Pair` and `Update Pair` actions
- Shows per-handle status badges: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- Adds a local `Handle Case Sensitive` setting in the manager dialog
- Adds per-row checkboxes, filtered select-all, and selected-count UI in the block list
- Adds `all|handle|id|regex` type filters and handle-tag filters in the block list
- Adds bulk actions for deleting selected items and creating/updating pairs for selected handles
- Shows a watch-page banner when stale or mismatch pairs need review
- Import/export stays focused on block rules only; pair metadata is local-only

---

## Usage

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Install from the raw URL above, or paste `ytblockhandlecomments.js` into a new userscript.
3. Open a YouTube watch page.
4. Right-click a comment author's handle to block or unblock it.
5. Open `Tampermonkey -> YouTube Comment Blocker -> Manage block list`.
6. Save your own YouTube Data API v3 key in the manager before running pair actions.
7. Use the manager to toggle handle case sensitivity, toggle UID detection, filter the list,
   select entries, run bulk actions, add regex rules, and import/export rules.

Typical UID flow:

1. Block one or more handles normally.
2. Open `Manage block list`.
3. Save your YouTube Data API v3 API key.
4. Turn on `UID Detection`.
5. Run `Create Pair` for missing pairs.
6. Use type/tag filters and bulk actions when you want to target only part of the block list.
7. Later run `Update Pair` when stale or mismatch items appear.

---

## Storage

Main rule storage:

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

Pair metadata storage:

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
    source: string
  }>
}
```

App settings storage:

```ts
{
  version: 1,
  handleCaseSensitive: boolean
}
```

Notes:

- Rule storage key: `blocked_v2`
- Pair metadata key: `pair_meta_v1`
- App settings key: `app_settings_v1`
- API config key: `youtube_data_api_v3_config`
- Legacy rule keys `blockedHandles` and `blockedHandles_v1` still migrate automatically
- Pair metadata is not included in import/export in `v0.4.0-pre2`
- The API key is stored locally in Tampermonkey and is not embedded in the script

---

## Notes

- Handle matching always stays enabled
- Handle matching defaults to case-insensitive comparison and can be switched to exact matching
- Older handle entries may already be stored in lowercase, so exact matching is guaranteed only
  after re-saving or newly adding those handles
- UID matching is optional and controlled by the `UID Detection` toggle
- In the current implementation, `id` matching is active only while UID detection is enabled
- UID lookup uses YouTube Data API v3 `channels.list` with the `forHandle` filter
- Pair actions require a user-supplied API key saved locally from the manager dialog
- Bulk pair actions only operate on selected `handle` entries
- If UID lookup fails, handle blocking still works and the pair stays `unverified` or becomes
  `stale`
- Regex rules apply to handle text only, not comment body text
- Comment hiding is intentionally scoped to watch-page comments
- Lightweight performance counters are exposed on `window.__ytCommentBlockerPerf`

---

## Userscript Metadata

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.4.0-pre2`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`

---

## Author

- **Mango_Clark**
- License: MIT
