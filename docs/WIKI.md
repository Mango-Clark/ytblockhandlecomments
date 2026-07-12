# 📚 YouTube Comment Blocker Wiki — v1.4.0

[English](WIKI.md) | [한국어](WIKI.ko.md)

This document describes the current implementation in more detail than
[`README.md`](../README.md).

## 1. Overview

The userscript hides YouTube comments by channel identity on watch pages and Shorts pages.

Source layout:

- `src/` contains role-based source slices, with Korean and English i18n dictionaries split into
  separate files.
- `ytblockhandlecomments.js` remains the single Tampermonkey distribution file.
- `npm run build` regenerates the root userscript from `src/`.
- `npm run check:build` verifies the root userscript is in sync.
- Chrome/Tampermonkey does not load `src/` files directly; it uses only the generated root
  userscript.
- The generated root userscript is compacted to reduce install/update payload size.
- Commits that change source behavior should include both the changed `src/` files and the rebuilt
  `ytblockhandlecomments.js`.

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

- Pair metadata import/export
- Background polling for pair refresh

## 2. Metadata And Runtime

- `@version`: `1.4.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`
- Runtime starts at `document-idle`

Comment matching remains intentionally scoped to watch-page and Shorts comments. Matching comments
can be hidden completely, replaced with a gray placeholder, or replaced with a click-to-reveal
placeholder. Auto dislike defaults to off and is configurable as off, only when a comment is newly
hidden, or always while a blocked comment is hidden; already pressed dislike buttons are not
toggled.

Keyword automation can inspect comment text, author handles, and pinned labels. It is
case-insensitive and runs only the selected actions: dislike, add the author handle to the block
list, or create a UID pair after adding the handle.

Logging can independently retain local entries for download and write to the browser console.
It records only low-frequency app, API-test, and pair-operation events.

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
	handleCaseSensitive: boolean,
	autoAddRegexHandles: boolean,
	blockMatchMode: 'handle' | 'pair',
	pairUpdateUidCheck: boolean,
	pairUpdateHandleLookup: boolean,
	keywordAutomationEnabled: boolean,
	themeMode: 'light' | 'dark' | 'system' | 'system-inverted' | 'youtube' | 'youtube-inverted' | 'custom',
	themeCustom: { background: string, surface: string, text: string, muted: string, border: string, primary: string, danger: string },
	keywordRules: string[],
	keywordFields: { commentText: boolean, handle: boolean, pinned: boolean },
	keywordActions: { dislike: boolean, blockHandle: boolean, createPair: boolean },
	logging: {
		fileEnabled: boolean,
		consoleEnabled: boolean,
		level: 'error' | 'warn' | 'info' | 'debug',
		retention: 100 | 500 | 1000
	},
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
  quotaFailureCount: number,
  lastQuotaFailureAt: number | null,
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
- Default `app_settings_v1.dislikeMode` is `none`
- Default `app_settings_v1.commentBlockMode` is `hide`
- Default `app_settings_v1.blockMatchMode` is `handle`
- At least one of `app_settings_v1.pairUpdateUidCheck` and `pairUpdateHandleLookup` stays enabled;
  handle lookup is the default
- Keyword automation is enabled by default to preserve existing behavior. It can be disabled without deleting
  its case-insensitive rules, fields, or actions; matching defaults to comment text and has no enabled action
  by default
- `app_settings_v1.themeMode` defaults to `system`. System and YouTube modes follow their respective current
  dark setting, while the inverted modes use its opposite. Custom colors are six-digit hex values and are
  validated before saving
- Theme styles apply only to the userscript's dialogs, panels, lists, and notices; they never style YouTube UI
- YouTube-theme synchronization watches only native YouTube dark-state signals, not userscript theme classes
- Logging is off by default. File logging retains entries in Tampermonkey storage until users download
  or clear them; the browser controls the downloaded file location
- `app_settings_v1.verboseLevel` defaults to `3`. V0/V1 omit diagnostic payloads, V2 records one
  field, V3 records three fields, and V4/V5 retain all available fields
- Default `app_settings_v1.fontSizeLevel` and `app_settings_v1.uiScaleLevel` are `3`; level `2`
  matches the previous visual size
- Pair metadata and API config are excluded from import/export

## 4. Matching Model

Identity matching:

- `app_settings_v1.blockMatchMode` chooses the active identity rule type
- `handle` is the default and matches stored `handle` rules
- `pair` matches stored `id` rules after UID Detection is enabled
- Regex rules are tested against extracted handle text only
- Regex rules are rejected when they exceed safety limits for pattern length, flags, target length,
  or known high-risk backtracking shapes

Case sensitivity:

- Controlled by `app_settings_v1.handleCaseSensitive`
- `false`: lowercase normalized comparison
- `true`: exact handle comparison
- Older lowercase-only handles may need re-saving for strict exact matching

Optional UID behavior:

- Controlled by both `app_settings_v1.blockMatchMode` and `pair_meta_v1.enableUidDetection`
- `id` rules are active only in `pair` mode while UID detection is enabled
- Turning UID detection off keeps stored `id` rules and pair metadata
- Runtime UID matching compares stored `id` rules to channel IDs already present in the comment DOM;
  it does not call the YouTube Data API
- Optional regex auto-add stores a regex-matched handle as a `handle` rule, so subsequent comments
  from the same channel are checked by handle before regex

Per-comment matching order:

1. Selected identity rule type (`id` for `pair`, `handle` for `handle`)
2. Regex

Keyword automation:

- Reads only the configured comment text, author handle, and/or pinned-label fields
- Uses case-insensitive substring matching against up to 50 saved keywords
- Runs each selected action once per comment DOM node
- `Create UID pair` also adds the author handle first and runs only when an API key is saved

## 5. Pair And API Flow

UID lookup:

1. Read the saved API key from `youtube_data_api_v3_config`
2. Call `GET https://www.googleapis.com/youtube/v3/channels`
3. Send `part=id`, `forHandle=@handle`, `key=<apiKey>`
4. Read `items[0].id`

Stored UID verification:

1. Call the same endpoint with `part=id` and `id=<stored UID>`
2. Keep the pair verified when the stored channel ID still resolves
3. Optionally run the independent handle re-resolution check to detect a replacement UID

API-key test:

1. Use the saved API key
2. Call the same API family with `part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw`
3. Store the latest result in `lastTestResult`
4. Show categorized diagnostics in the manager

Fallback behavior:

- Handle mode still works when UID lookup fails; pair mode needs an existing verified `id` rule
- Failed pairs stay `unverified` or `stale`
- Existing pair data is not silently removed on lookup failure
- When a pair update resolves a different UID, the stored pair and `id` rule are replaced with the
  latest UID so stale IDs no longer keep matching the old channel

API minimization:

- `Create Pair` looks up only missing or unverified handle pairs
- Default `Update Pair` skips fresh verified pairs until the stale interval expires
- Pair update settings can independently verify the stored UID and re-resolve the handle; at least
  one check is always enabled
- Selected-handle bulk `Update Pair` is treated as an explicit user request and refreshes selected
  handles even if their pair is still fresh
- Watch-page pair review prompts are suppressed for the same stale interval after `Later` or a
  recent pair check

## 6. Manager Dialog

Sections:

- Script info section with the current userscript version
- Matching, API key, UID pair, and navigation controls
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
- Show first 20 matches by default, with paged `Show more`
- Cache count-only results for collapsed rows and full match arrays only on expand/select
- Update visible selection UI and regex expand/collapse state without rebuilding the full list for
  row-only actions

Pair results:

- Pair runs return summary counts plus per-handle outcomes
- Manager shows `Last Pair Run`
- Pair run details support outcome filtering, run-order/outcome/handle sorting, and failed-handle
  copy/export
- Watch-page banner updates can open a detail dialog

Removal behavior:

- Removing a `handle` rule also removes paired UID rule and pair metadata
- `Clear block list` clears rules and pair metadata

## 7. Dialogs, Menus, And Live i18n

Settings dialog:

- Uses a category-list layout inspired by `GM_setting`: each task group has a title, controls, and short help text
- Shows an introductory note that changes are saved automatically
- Groups controls into matching, comment display, keyword automation, logging, display size, and maintenance sections
- Handle case sensitivity
- Identity block method: `handle` rules or UID pair `id` rules
- Regex matched-handle auto-add
- Auto-dislike mode
- A master keyword-automation toggle, with its regex rule editor and keyword rules, match inputs, and per-match
  actions moved to the block and keyword automation dialog
- Theme mode control with light, dark, system, inverted system, YouTube, inverted YouTube, and custom choices
- Custom theme editor for background, surface, text, muted text, border, primary, and destructive colors with
  default restoration and input validation
- Independent saved-log and browser-console toggles, log level, retention count, download, and clear controls
- Blocked-comment display mode
- Five-level text and UI scale controls; level 2 matches the previous size and level 3 is the default
- Button to open the block list from settings, with a matching button back to settings in the block list
- Navigation buttons between the block list, settings, and the block and keyword automation dialog
- Red destructive reset button and confirmation action for app display and matching settings
- YouTube Data API v3 key/test controls
- UID detection, pair summary, and pair actions
- Pair update checks for stored UID verification and handle re-resolution
- Loading bars while API key tests and pair actions are waiting for API responses
- Debug counters from `window.__ytCommentBlockerPerf`

Security:

- `Dialog.show()` no longer inserts raw HTML
- String bodies render as plain text

Live i18n:

- Menu commands are unregistered and re-registered after language changes
- Open dialogs can refresh labels in place through dialog refresh hooks
- The pair banner also rerenders in place

Menu injection:

- The `⋯` menu no longer uses an always-on global popup observer
- A short-lived observer starts from the clicked comment's `ytd-menu-renderer`, so button-wrapper
  changes do not prevent handle discovery
- Reused popups and menus inserted after the popup both receive one handle-specific item
- The injected item uses a `CB` marker, refreshes to an unhide action for blocked handles, and
  disconnects its observer after popup handling, timeout, or navigation

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

The export dialog can return to the block list or download the same rule-only data as
`youtube-comment-blocker-export.json` or `youtube-comment-blocker-export.txt`.

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

If API-key tests repeatedly report `quota`, the manager tracks consecutive quota failures and
shows guidance with an estimated 24-hour reset window from the latest quota failure.

## 11. Remaining Work

After `v1.4.0`, the large manager, security, i18n, regex-selection performance, Shorts
comment-hiding, long-session memory cleanup, pair-update minimization, visible-version, settings
dialog, regex auto-add, and manager polish TODO items are considered implemented. Future work
should focus on incremental improvements rather than baseline feature completion.
