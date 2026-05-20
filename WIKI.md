# 📚 YouTube Comment Blocker Wiki — v0.5.1

[English](WIKI.md) | [한국어](WIKI.ko.md)

This document describes the current implementation in more detail than `README.md`.

## 1. Overview

The userscript hides YouTube comments by channel identity on watch pages and Shorts pages.

Supported rule types in `blocked_v2`:

- `handle`
- `id`
- `regex`

Supported local stores:

- `blocked_v2`
- `pair_meta_v1`
- `app_settings_v1`
- `youtube_data_api_v3_config`

User-facing entry points:

- Right-click a comment author handle
- Comment `⋯` menu injection
- `Manage block list` Tampermonkey menu command
- Watch-page pair review banner

Supported page modes for comment hiding:

- `watch`
- `shorts`

Out of scope:

- Comment-body keyword blocking
- Pair metadata import/export
- Background polling for pair refresh

## 2. Metadata And Runtime

- `@version`: `0.5.1`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`
- Runtime starts at `document-idle`

Comment matching and hiding remain intentionally scoped to watch-page and Shorts comments.

## 3. Storage Model

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

- Legacy `blockedHandles` and `blockedHandles_v1` still migrate automatically
- Pair metadata and API config are excluded from import/export

## 4. Matching Model

Always-on behavior:

- Handle matching always stays enabled
- Regex rules are tested against extracted handle text only
- Regex rules are rejected when they exceed safety limits for pattern length, flags, target length,
  or known high-risk backtracking shapes

Case sensitivity:

- Controlled by `app_settings_v1.handleCaseSensitive`
- `false`: lowercase normalized comparison
- `true`: exact handle comparison
- Older lowercase-only handles may need re-saving for strict exact matching

Optional UID behavior:

- Controlled by `pair_meta_v1.enableUidDetection`
- `id` rules are active only while UID detection is enabled
- Turning UID detection off keeps stored `id` rules and pair metadata
- Runtime UID matching compares stored `id` rules to channel IDs already present in the comment DOM;
  it does not call the YouTube Data API

Per-comment matching order:

1. Channel ID
2. Handle
3. Regex

## 5. Pair And API Flow

UID lookup:

1. Read the saved API key from `youtube_data_api_v3_config`
2. Call `GET https://www.googleapis.com/youtube/v3/channels`
3. Send `part=id`, `forHandle=@handle`, `key=<apiKey>`
4. Read `items[0].id`

API-key test:

1. Use the saved API key
2. Call the same API family with `part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw`
3. Store the latest result in `lastTestResult`
4. Show categorized diagnostics in the manager

Fallback behavior:

- Handle blocking still works when UID lookup fails
- Failed pairs stay `unverified` or `stale`
- Existing pair data is not silently removed on lookup failure
- When a pair update resolves a different UID, the stored pair and `id` rule are replaced with the
  latest UID so stale IDs no longer keep matching the old channel

API minimization:

- `Create Pair` looks up only missing or unverified handle pairs
- Default `Update Pair` skips fresh verified pairs until the stale interval expires
- Selected-handle bulk `Update Pair` is treated as an explicit user request and refreshes selected
  handles even if their pair is still fresh

## 6. Manager Dialog

Sections:

- Script info section with the current userscript version
- Handle case-sensitivity section
- YouTube Data API v3 section
- UID detection / pair summary section
- Regex add section
- Rule list section

Rule-list tools:

- Search by case-insensitive substring on display labels
- Type filters: `all`, `handle`, `id`, `regex`
- Handle-tag filters: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- Row selection, visible-results select-all, bulk actions
- Counter shown as `selected / visible / total`

Regex rows:

- Show matched blocked-handle count
- Support `Select matching handles`
- Expand inline handle list
- Show first 20 matches by default, with `Show all`
- Cache count-only results for collapsed rows and full match arrays only on expand/select
- Update visible selection UI without rebuilding the full list for selection-only actions

Pair results:

- Pair runs return summary counts plus per-handle outcomes
- Manager shows `Last Pair Run`
- Watch-page banner updates can open a detail dialog

Removal behavior:

- Removing a `handle` rule also removes paired UID rule and pair metadata
- `Clear block list` clears rules and pair metadata

## 7. Dialogs, Menus, And Live i18n

Security:

- `Dialog.show()` no longer inserts raw HTML
- String bodies render as plain text

Live i18n:

- Menu commands are unregistered and re-registered after language changes
- Open dialogs can refresh labels in place through dialog refresh hooks
- The pair banner also rerenders in place

Menu injection:

- The `⋯` menu no longer uses an always-on global popup observer
- A short-lived observer starts only after a relevant menu-button click
- It disconnects after popup handling, timeout, or navigation

Comment observation:

- `watch` still uses the existing `ytd-comments#comments, ytd-comments` host lookup
- `shorts` uses comment-node-driven host discovery and only promotes a shared container when it is
  narrower than broad page containers such as `body`, `html`, or `ytd-app`
- Page-key changes reset transient `IntersectionObserver` registrations and comment metadata
  caches so reused YouTube comments hosts do not retain detached comment nodes across many videos
- Pair banner gating remains watch-only

## 8. Cross-Tab Sync

Remote Tampermonkey changes refresh local state for:

- `blocked_v2`
- `pair_meta_v1`
- `youtube_data_api_v3_config`
- `app_settings_v1`
- `lang`

On refresh, lookup caches, open UI, and the watch-page banner are updated.

## 9. Import And Export

Supported import/export targets `blocked_v2` only.

Supported plain-text entries:

- `@handle`
- `UC...`
- `/regex/`
- `/regex/flags`

Regex literals escape `/` as `\/` on export and accept the escaped form on import.

Supported JSON shapes:

- V2 objects with `items`
- Legacy V1 objects with `handles`

## 10. Troubleshooting

If comments are not hiding:

1. Confirm you are on a watch page or Shorts page.
2. Confirm the rule exists in the manager.
3. If expecting UID matching, confirm `UID Detection` is on.
4. Confirm the API key is saved.
5. If the pair is missing or `unverified`, run `Create Pair` or `Update Pair`.

If pair maintenance fails:

1. Run `Test API Key`.
2. Check the saved `lastTestResult` category and message.
3. Review `Last Pair Run` for handle-level failures or mismatches.

## 11. Remaining Work

After `v0.5.1`, the large manager, security, i18n, regex-selection performance, Shorts
comment-hiding, long-session memory cleanup, pair-update minimization, and visible-version TODO
items are considered implemented. Future work should focus on incremental improvements rather than
baseline feature completion.
