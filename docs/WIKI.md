# 📚 YouTube Comment Blocker Wiki — v1.5.0

[English](WIKI.md) | [한국어](WIKI.ko.md)

Current implementation details beyond [`README.md`](../README.md).

## 1. Overview

Userscript hides YouTube comments by channel identity on watch and Shorts pages.

Source layout:

- `src/`: role-based source slices; separate Korean/English i18n dictionaries.
- `ytblockhandlecomments.js`: single Tampermonkey distribution file.
- `npm run build`: regenerate root userscript from `src/`.
- `npm run check:build`: verify root userscript sync.
- Chrome/Tampermonkey loads only generated root userscript, not `src/`.
- Generated userscript compacted for smaller install/update payload.
- Behavior-changing commits include changed `src/` files + rebuilt `ytblockhandlecomments.js`.

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

- Right-click comment author handle
- Channel, search, video-description, and comment-body handle links keep YouTube native context menu
- Comment `⋯` menu injection
- `Manage block list` Tampermonkey menu command
- Watch-page pair review banner

Supported comment-hiding page modes:

- `watch`
- `shorts`

Comment-host discovery observes matching watch/Shorts root only. Host checks batched per frame; stop after 20 failed mutation batches. Navigation/new page key resets budget.

For Shorts, observer attaches to nearest non-comment panel around comment roots, never single comment renderer, keeping sibling comments/replies in scope during panel updates.

Page sync responds to `yt-navigate-finish`, `yt-page-data-updated`, `popstate`, `history.pushState()`, and `history.replaceState()`. Transient observation state resets only when derived page key changes.

Out of scope:

- Pair metadata import/export
- Background pair-refresh polling

## 2. Metadata And Runtime

- `@version`: `1.5.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`
- Runtime starts at `document-idle`

Comment matching intentionally limited to watch/Shorts comments. Matches can be fully hidden, replaced by gray placeholder, or click-to-reveal placeholder. Auto dislike defaults off; modes: off, newly hidden only, or always while hidden. Already pressed dislike buttons never toggle.

Comment automation identity derives channel ID, handle, body, and pinned label. Reused element identity changes invalidate cached metadata and one-time keyword, dislike, and blocked-display state.

Keyword automation checks comment text, author handles, and pinned labels. Case-insensitive; runs selected actions only: dislike, block author handle, or create UID pair after adding handle.

Logging independently supports local download entries and browser console. Records only low-frequency app, API-test, and pair-operation events.

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
  logging: {
    fileEnabled: boolean,
    consoleEnabled: boolean,
    level: 'error' | 'warn' | 'info' | 'debug',
    retention: 100 | 500 | 1000,
    consolePrefix: string,
    consoleTimestampEnabled: boolean,
    consoleTimeFormat: string,
    consoleTimeZone: string,
    consoleTimeZoneInput: string
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

- Legacy `blockedHandles` and `blockedHandles_v1` migrate only if valid `blocked_v2` absent; later delete/clear never restores legacy entries
- Cross-tab `blocked_v2` changes carry optional entry revisions, tombstones, and clear revision. Concurrent additions merge; highest revision resolves add/delete/clear conflicts without echo writes.
- Default `app_settings_v1.dislikeMode`: `none`
- Default `app_settings_v1.commentBlockMode`: `hide`
- Default `app_settings_v1.blockMatchMode`: `handle`
- At least one of `app_settings_v1.pairUpdateUidCheck` and `pairUpdateHandleLookup` remains enabled; handle lookup default
- `handleLookupMethod` defaults to `scraper`; `api` opt-in. `handleLookupFallbackApi` defaults to `false`; `handleLookupOnAdd` to `true`.
- Keyword automation enabled by default for existing behavior. Disable without deleting case-insensitive rules, fields, or actions. Default matching: comment text; no default enabled action.
- `app_settings_v1.themeMode` defaults to `system`. System/YouTube modes follow respective current dark setting; inverted modes use opposite. Custom colors require validated six-digit hex.
- Theme styles affect userscript dialogs, panels, lists, notices only; never YouTube UI.
- YouTube-theme sync watches native YouTube dark-state signals only, not userscript theme classes.
- Theme discovery stops after finding `ytd-app`; in YouTube mode, direct body-child changes only check `ytd-app` replacement, avoiding rediscovery from comment/feed mutations.
- Logging off by default. File logs remain in Tampermonkey storage until download/clear; browser controls download location.
- Rejected settings, block-list, pair-metadata, API-key, or log writes leave in-memory state unchanged and show error, not success, enabling correction/retry.
- Console logging defaults to `[YTCB]`, timestamps off. Presets: extended/basic calendar dates, week dates, ordinal dates, time. Custom ISO formats combine `yyyy`, `yy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, and `W`; basic/extended time supports timezone tokens. Timezones: system, UTC offsets `-12`–`+14`, listed IANA cities, validated custom IANA or KST-style abbreviations.
- `app_settings_v1.verboseLevel` defaults to `3`. V0/V1 omit diagnostic payloads; V2 records one field, V3 three, V4 six, V5 ten. Before console/saved-log output, nested API keys, tokens, URLs, accounts, comments, handles, and user IDs removed; circular/oversized payloads safely truncated.
- Default `app_settings_v1.fontSizeLevel` and `app_settings_v1.uiScaleLevel`: `3`; level `2` matches previous size.
- Pair metadata and API config excluded from import/export.

## 4. Matching Model

Identity matching:

- `app_settings_v1.blockMatchMode` selects active identity rule type
- `handle` default; matches stored `handle` rules
- `pair` matches stored `id` rules after UID Detection enabled
- Regex tests extracted handle text only
- Regex rejected when exceeding pattern-length, flags, target-length, or known high-risk backtracking-shape limits

Case sensitivity:

- Controlled by `app_settings_v1.handleCaseSensitive`
- `false`: lowercase-normalized comparison
- `true`: exact handle comparison
- Older lowercase-only handles may require re-saving for strict matching

Optional UID behavior:

- Controlled by `app_settings_v1.blockMatchMode` + `pair_meta_v1.enableUidDetection`
- `id` rules active only in `pair` mode with UID detection enabled
- Disabling UID detection preserves stored `id` rules and pair metadata
- Runtime UID matching compares stored `id` rules with channel IDs already in comment DOM; no YouTube Data API call
- Optional regex auto-add stores matched handle as `handle`, enabling handle check before regex on later comments
- Channel IDs read first from `/channel/UC...` links, then `data-channel-id` and `channel-id` attributes. In pair mode, handle without channel ID increments `window.__ytCommentBlockerPerf.missingChannelIds`.

Per-comment matching order:

1. Selected identity rule type (`id` for `pair`, `handle` for `handle`)
2. Regex

Keyword automation:

- Reads configured comment text, author handle, and/or pinned-label fields only
- Case-insensitive substring match against up to 50 keywords
- Runs each selected action once per comment DOM node
- `Create channel-ID pair` first adds author handle; default page lookup needs no API key

## 5. Pair And API Flow

Channel ID lookup:

1. Default: fetch `https://www.youtube.com/@<url-encoded-handle>` from userscript YouTube origin.
2. Parse `externalId`, `channelId`, then `itemprop="channelId"` from public channel HTML.
3. Undocumented parser may break with YouTube HTML changes. HTTP/no-channel-ID failures preserve pair data and show retry/API-fallback guidance.
4. Explicit API mode calls `GET https://www.googleapis.com/youtube/v3/channels` with `part=id`, `forHandle=@handle`, and `key=<apiKey>`.

Stored UID verification:

1. Call same endpoint with `part=id` and `id=<stored UID>`
2. Keep pair verified while stored channel ID resolves
3. Optionally independently re-resolve handle to detect replacement UID

API-key test:

1. Use saved API key
2. Call same API family with `part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw`
3. Save latest result in `lastTestResult`
4. Show categorized manager diagnostics

Fallback behavior:

- Handle mode works after channel-ID lookup failure; pair mode requires existing verified `id` rule
- Failed pairs remain `unverified` or `stale`
- Lookup failure never silently removes pair data
- Different resolved UID replaces stored pair and `id` rule, preventing stale ID matching
- API fallback defaults off. When enabled with saved key, runs only after page lookup failure; when disabled, makes no API request.

API minimization:

- `Create Pair` looks up missing/unverified handle pairs only
- Pair results cached in metadata and per-page memory. Default refresh: 10 minutes for page lookup, one week for API lookup; selected-handle `Update Pair` forces refresh.
- Intervals: every handle update, 1m, 5m, 10m, 1h, 12h, 1d, 1w, 1M, or validated custom seconds.
- New handles resolve immediately by default; Settings can disable.
- Pair update independently supports stored UID verification and handle re-resolution; at least one always enabled.
- Selected-handle bulk `Update Pair` explicitly refreshes selected handles even when fresh.
- Watch-page pair review prompts suppressed for same stale interval after `Later` or recent pair check.

## 6. Manager Dialog

Sections:

- Script info with current userscript version
- Matching, API key, UID pair, navigation controls
- Regex add
- Rule list

Rule-list tools:

- Case-insensitive substring search on display labels
- Type filters: `all`, `handle`, `id`, `regex`
- Handle-tag filters: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- Row selection, visible select-all, bulk actions
- Counter: `selected / visible / total`

Regex rows:

- Show matched blocked-handle count
- Support `Select matching handles`
- Expand inline handle list
- First 20 matches default; paged `Show more`
- Cache counts for collapsed rows; full arrays only on expand/select
- Row-only actions update visible selection and expand/collapse state without full-list rebuild

Pair results:

- Pair runs return summary counts + per-handle outcomes
- Manager shows `Last Pair Run`
- Details support outcome filtering, run-order/outcome/handle sorting, failed-handle copy/export
- Watch-page banner updates can open details

Removal behavior:

- Removing `handle` also removes paired UID rule and metadata
- `Clear block list` clears rules and pair metadata

## 7. Dialogs, Menus, And Live i18n

Settings dialog:

- Category-list layout inspired by `GM_setting`: task groups have title, controls, brief help
- Nested dialogs route Escape, Enter, Tab, and backdrop actions to top dialog only; close restores opener focus
- API tests/pair actions use `finally` cleanup. Concurrent manual/keyword pair requests share active run instead of success-like busy skip.
- Debug metrics include page mode, comments-host/extraction failure counters, latest selector reason; exclude comment text, URLs, API keys, account data
- Intro note: changes auto-save
- Groups: matching, comment display, keyword automation, logging, display size, maintenance
- Default choices marked with muted `(Default)`
- Handle case sensitivity
- Identity method: `handle` rules or UID pair `id` rules
- Regex matched-handle auto-add
- Auto-dislike mode
- Master keyword-automation toggle; regex editor, keyword rules, inputs, actions in block/keyword automation dialog
- Theme modes: light, dark, system, inverted system, YouTube, inverted YouTube, custom
- Custom theme colors: background, surface, text, muted text, border, primary, destructive; default restore + validation
- Independent saved-log/browser-console toggles, level, retention, download, clear
- Blocked-comment display mode
- Five-level text/UI scale; level 2 previous size, level 3 default
- Settings-to-block-list and block-list-to-settings buttons
- Navigation among block list, settings, block/keyword automation dialog
- Red destructive reset + confirmation for display/matching settings
- YouTube Data API v3 key/test controls
- UID detection, pair summary/actions
- Pair checks: stored UID verification + handle re-resolution
- Loading bars during API key tests/pair actions
- Debug counters from `window.__ytCommentBlockerPerf`

Security:

- `Dialog.show()` never inserts raw HTML
- String bodies render plain text

Live i18n:

- Menu commands unregister/re-register after language change
- Open dialogs refresh labels in place via refresh hooks
- Pair banner rerenders in place

Menu injection:

- `⋯` menu has no always-on global popup observer
- Short-lived observer starts from clicked comment's `ytd-menu-renderer`; wrapper changes cannot block handle discovery
- Reused popups and later-inserted menus each receive one handle-specific item
- Item uses `CB` marker, changes to unhide for blocked handles, disconnects after handling, timeout, or navigation

Comment observation:

- `watch` uses existing `ytd-comments#comments, ytd-comments` host lookup
- `shorts` uses comment-node-driven discovery; promotes shared container only when narrower than `body`, `html`, or `ytd-app`
- Page-key changes reset transient `IntersectionObserver` registrations and metadata caches, preventing reused hosts retaining detached nodes across videos
- Pair banner remains watch-only

## 8. Cross-Tab Sync

Remote Tampermonkey changes refresh local state for:

- `blocked_v2`
- `pair_meta_v1`
- `youtube_data_api_v3_config`
- `app_settings_v1`
- `lang`

Refresh updates lookup caches, open UI, and watch-page banner.

## 9. Import And Export

Import/export supports `blocked_v2` only.

Supported plain-text entries:

- `@handle`
- `UC...`
- `/regex/`
- `/regex/flags`

Regex export escapes `/` as `\/`; import accepts escaped form.

Export dialog returns to block list or downloads same rule-only data as `youtube-comment-blocker-export.json` or `youtube-comment-blocker-export.txt`.

Supported JSON shapes:

- V2 objects with `items`
- Legacy V1 objects with `handles`

## 10. Troubleshooting

If comments are not hiding:

1. Confirm watch or Shorts page.
2. Confirm rule exists in manager.
3. For UID matching, confirm `UID Detection` on.
4. Confirm API key saved.
5. If pair missing or `unverified`, run `Create Pair` or `Update Pair`.

If pair maintenance fails:

1. Run `Test API Key`.
2. Check saved `lastTestResult` category/message.
3. Review `Last Pair Run` for handle failures/mismatches.

Repeated `quota` API-key tests increment consecutive failures and show estimated 24-hour reset guidance from latest failure.

## 11. Remaining Work

After `v1.5.0`, large manager, security, i18n, regex-selection performance, Shorts comment hiding, long-session memory cleanup, pair-update minimization, visible-version, settings dialog, regex auto-add, and manager-polish TODOs complete. Future work: incremental improvements, not baseline feature completion.
