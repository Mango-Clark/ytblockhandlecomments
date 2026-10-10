<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# 📚 YouTube Comment Blocker Wiki — v1.5.4

[English](WIKI.md) | [한국어](WIKI.ko.md)

Current implementation details beyond [`README.md`](../README.md).

## 1. Overview

Userscript hides YouTube comments by channel identity on watch and Shorts pages.

Source layout:

- `src/`: role-based source slices; separate Korean/English i18n dictionaries.
- Numeric prefixes are a recommended reading order; ES module imports determine runtime order. Letter suffixes keep split modules beside their parent feature.
- `03-app-settings-storage.ts`, `04-storage-v2.ts`, `05-pair-meta-storage.ts`, `06-api-config-storage.ts`, and `15-logger.ts` share the error-safe `03a-gm-backed-store.ts` adapter while retaining separate schemas and synchronization rules.
- GM-backed stores record missing, present, invalid, and failed reads. A failed read keeps fallback state in memory, blocks writes, migrations, and remote merges until a later instance can read the storage successfully, and shows a reload diagnostic without exposing stored values or raw errors.
- `12-block-list-manager.ts` is the stable public entry point. `12a`–`12d` own list state, cache invalidation, typed list-row rendering, settings save/API lifecycle, import/export data and persistence helpers, and pair-result presentation; `12e-manager-runtime.ts` composes the remaining manager UI.
- `13-app.ts` coordinates storage, matching, pairing, menus, and navigation; `14-bootstrap.ts` guards one-time startup and exposes the test surface.
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

YouTube `/embed*` player documents are excluded by userscript metadata, so external embedded players do not start the script.

Comment-host discovery observes matching watch/Shorts root only. Host checks batched per frame; stop after 20 failed mutation batches. Navigation/new page key resets budget.

For Shorts, observer attaches to nearest non-comment panel around comment roots, never single comment renderer, keeping sibling comments/replies in scope during panel updates.

Page sync responds to `yt-navigate-finish`, `yt-page-data-updated`, `popstate`, `history.pushState()`, and `history.replaceState()`. Transient observation state resets only when derived page key changes.

Out of scope:

- Pair metadata import/export
- Background pair-refresh polling

## 2. Metadata And Runtime

- `@version`: `1.5.4`
- `@match`: `https://www.youtube.com/*`
- `@exclude`: `https://www.youtube.com/embed*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`
- Runtime starts at `document-idle`

Comment matching intentionally limited to watch/Shorts comments. Matches can be fully hidden, replaced by gray placeholder, or click-to-reveal placeholder. Auto dislike defaults off; modes: off, newly hidden only, or always while hidden. Already pressed dislike buttons never toggle.

Comment automation identity derives channel ID, handle, body, and pinned label. Reused element identity changes invalidate cached metadata and one-time keyword, dislike, and blocked-display state.

Keyword automation checks comment text, author handles, and pinned labels. Case-insensitive; runs selected actions only: dislike, block author handle, or create UCID pair after adding handle.

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
  version: 2,
  enableUcidDetection: boolean,
  lastPairCheckAt: number | null,
  pairNotificationDismissedAt: number | null,
  pairs: Array<{
    handle: string,
    ucid: string,
    verifiedAt: number | null,
    status: 'verified' | 'stale' | 'mismatch' | 'unverified',
    source: string,
    lastResolvedUcid?: string | null,
    lastError?: string | null
  }>
}
```

App settings:

```ts
{
  version: 2,
  lowPerformanceMode: boolean,
  handleCaseSensitive: boolean,
  autoAddRegexHandles: boolean,
  blockMatchMode: 'handle' | 'pair',
  pairLookup: { create: 'page' | 'api' | 'page-api', update: 'page' | 'api' | 'page-api', onBlock: 'page' | 'api' | 'page-api' },
  pairRefreshInterval: 'always' | '60' | '300' | '600' | '3600' | '43200' | '86400' | '604800' | '2592000' | 'custom',
  pairRefreshCustomSeconds: number,
  pairOnBlock: boolean,
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
    category: 'ok' | 'invalid' | 'quota' | 'forbidden' | 'network' | 'timeout' | 'cancelled' | 'unknown',
    httpStatus: number | null,
    message: string
  } | null
}
```

Saved-log state (`yt_comment_blocker_logs_v1`):

```ts
{
  version: 2,
  clearRevision: { counter: number, writer: string },
  entries: Array<{
    id: string,
    revision: { counter: number, writer: string },
    at: number,
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    detail?: string
  }>
}
```

Notes:

- Legacy `blockedHandles` and `blockedHandles_v1` migrate only if valid `blocked_v2` absent; later delete/clear never restores legacy entries
- Cross-tab `blocked_v2` changes carry optional entry revisions, tombstones, and clear revision. Concurrent additions merge; highest revision resolves add/delete/clear conflicts without echo writes.
- Cross-tab `pair_meta_v1` changes carry per-handle revisions and deletion tombstones. Clear uses a revision that suppresses older pairs; later additions remain visible. UCID detection uses revision ordering, while check and notification timestamps merge monotonically by the greatest timestamp. Repeated remote delivery is idempotent.
- Default `app_settings_v1.dislikeMode`: `none`
- Default `app_settings_v1.commentBlockMode`: `hide`
- Default `app_settings_v1.blockMatchMode`: `handle`
- Keyword automation enabled by default for existing behavior. Disable without deleting case-insensitive rules, fields, or actions. Default matching: comment text; no default enabled action.
- `app_settings_v1.themeMode` defaults to `system`. System/YouTube modes follow respective current dark setting; inverted modes use opposite. Custom colors require validated six-digit hex.
- Theme styles affect userscript dialogs, panels, lists, notices only; never YouTube UI.
- YouTube-theme sync watches native YouTube dark-state signals only, not userscript theme classes.
- Theme discovery stops after finding `ytd-app`; in YouTube mode, direct body-child changes only check `ytd-app` replacement, avoiding rediscovery from comment/feed mutations.
- Logging off by default. File logs remain in Tampermonkey storage until clear; downloads use UTC ISO timestamps and the browser controls their location.
- Legacy array logs receive bounded deterministic IDs and migrate in memory to version 2 on the next write, preventing long entries from duplicating after reload or cross-tab merge. Same-turn entries batch into one write; status/download still flush pending entries immediately.
- Cross-tab log additions merge by entry revision. Clear carries its own revision so stale remote entries do not return; retention reductions trim immediately.
- Live log changes update only saved-log status, preview, and action availability in an open settings dialog; unrelated dialogs and unsaved settings input are not rerendered.
- Rejected settings, block-list, pair-metadata, API-key, or log writes leave in-memory state unchanged and show error, not success, enabling correction/retry.
- Console logging defaults to `[YTCB]`, timestamps off. Presets: extended/basic calendar dates, week dates, ordinal dates, time. Custom ISO formats combine `yyyy`, `yy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, and `W`; basic/extended time supports timezone tokens. Timezones: system, UTC offsets `-12`–`+14`, listed IANA cities, validated custom IANA or KST-style abbreviations.
- `app_settings_v1.verboseLevel` defaults to `3`. V0/V1 omit diagnostic payloads; V2 records one field, V3 three, V4 six, V5 ten. This changes payload breadth, not event count. Before console/saved-log output, fields named for API keys, tokens, accounts, comments, handles, or user identifiers are omitted. Recognizable credential and identifier values such as Bearer tokens, JWTs, Google or mixed-character API keys, URLs, handles, channel IDs, and email addresses are redacted; circular/oversized payloads are safely truncated.
- Default `app_settings_v1.fontSizeLevel` and `app_settings_v1.uiScaleLevel`: `3`; level `2` matches previous size.
- Pair metadata and API config excluded from import/export.

## 4. Matching Model

Identity matching:

- `app_settings_v1.blockMatchMode` selects active identity rule type
- `handle` default; matches stored `handle` rules
- `pair` matches stored `id` rules after UCID Detection enabled
- Regex tests extracted handle text only
- Regex patterns are limited to 256 input characters with unique `gimsuy` flags; matching uses the first 128 characters of a handle. Runtime validation restores literal slashes and line terminators escaped by `RegExp.source` before checking length, so engine-added escaping does not disable an accepted rule.
- Structural validation bounds nested groups, alternatives, and consecutive repetitions before native matching to prevent [ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS). The 5 ms check after matching is only a result filter, not an execution timeout.
- The conservative subset allows literals, character classes, anchors, ordinary/noncapturing groups, alternatives, and repetitions within complexity limits (4,096 estimated paths, 1,024 expanded units, at most 128 repetitions). Lookarounds, backreferences, named groups, and repeated groups that can match empty text are unsupported. Some otherwise valid patterns, such as `^@.*promo.*$`, exceed these limits; use simpler rules such as `^@.*promo`.
- Groups containing alternatives or variable repetition cannot be repeated more than once, including fixed counts such as `(a|aa){12}`. Deterministic groups such as `(?:ab){12}` and alternatives outside repeated groups remain supported.
- Unsupported regex rules are skipped during loading and cross-tab synchronization, and are not added by the editor or JSON/text import. Valid handle, ID, and regex rules remain active.

Case sensitivity:

- Controlled by `app_settings_v1.handleCaseSensitive`
- `false`: lowercase-normalized comparison
- `true`: exact handle comparison
- Older lowercase-only handles may require re-saving for strict matching

Optional UCID behavior:

- Controlled by `app_settings_v1.blockMatchMode` + `pair_meta_v1.enableUcidDetection`
- `id` rules active only in `pair` mode with UCID detection enabled
- Disabling UCID detection preserves stored `id` rules and pair metadata
- Runtime UCID matching compares stored `id` rules with channel IDs already in comment DOM; no YouTube Data API call
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

- Creation resolves a blocked handle to UCID. Updates resolve the stored UCID to its current handle; they never reassign the UCID based on the previous handle.
- Creation, updates, and immediate pairing each select `page`, `api`, or `page-api`. New installs default to page-only; old lookup/fallback choices migrate to all three policies.
- Page lookup fetches the handle or `/channel/<UCID>` page and reads only `ytInitialData.metadata.channelMetadataRenderer`. Recommendations are not channel identity evidence.
- API creation uses `channels.list?part=id&forHandle=@handle`; updates use `part=id,snippet&id=<UCID>`. Updates require the returned ID to match and `snippet.customUrl` to contain an `@handle`.
- Page-first API fallback requires a saved key and runs only after page failure. Cancellation never starts fallback. API-only and API-key tests require a key; page lookup remains available without one.
- Blocking applies the handle rule immediately, then creates a pair asynchronously when `pairOnBlock` is enabled (default). Failure preserves existing blocking. Keyword pair actions use the creation policy.
- A renamed handle replaces the previous handle rule and metadata while preserving the UCID rule. A destination paired with another UCID is rejected. Lookup failure preserves the previous association.
- Before writes, reread shared storage and check the original rule/pair revisions. Removed or changed blocks are skipped. Partial-write rollback restores only unchanged touched rules, preserving unrelated changes.
- Full updates honor the refresh interval; selected updates force lookup. Default intervals are 10 minutes for page/page-first and one week for API. Existing explicit intervals and custom seconds are retained.
- Cache entries are separated by operation, direction, and method and invalidated on policy or key changes. At most eight requests run concurrently; low-performance mode pauses automatic work and serializes manual work. Queued creation skips pairs already completed by another request.
- Requests and response bodies have timeouts. Manual callers share the active app run; closing a dialog detaches its UI without cancelling that shared run. Results retain input order.
- The API-key test uses `part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw`, saves categorized diagnostics, and retains quota guidance.
- Pair and settings payloads are version 2 under their existing storage keys. Legacy `uid`, `lastResolvedUid`, and `enableUidDetection` migrate to UCID fields, including sync entries/scalars; revisions and deletion tombstones survive. New fields take precedence. A failed migration leaves stored legacy data intact. Refresh older tabs after updating.

## 6. Manager Dialog

Sections:

- Script info with current userscript version
- Settings navigation, pair operations/status/results; configuration editors live in Settings
- Regex add
- Rule list

Lifecycle ownership:

- Each opened block-list dialog owns its selection, filters, pagination, caches, scheduled search work, and disposal.
- API-key tests and pair runs use independent busy state and operation generations. Closing or replacing a dialog invalidates its generation, so late asynchronous results cannot update the new dialog or restore stale loading state.
- Disposal cancels scheduled search rendering and clears transient sets, maps, row references, and computed-view caches while preserving the explicitly saved adjacent-dialog view state.

Rule-list tools:

- Case-insensitive substring search on display labels
- Type filters: `all`, `handle`, `id`, `regex`
- Handle-tag filters: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- Same-page restoration of search, filters, valid selections, and scroll position after visiting adjacent manager dialogs
- One-click filter reset that preserves the current selection
- Row selection, filtered select-all across pages, bulk actions
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

- Removing `handle` also removes paired UCID rule and metadata
- `Clear block list` clears rules and pair metadata

### Performance And Low-Performance Mode

- Settings → **Low-performance mode** is off by default, saved as `app_settings_v1.lowPerformanceMode`, synchronized across tabs, and cleared by settings reset. Existing stores without this field retain normal mode.
- Normal mode renders 100 block-list/pair-result rows per page; low mode renders 50. Search/filtering and select-all operate on all matching entries across pages. Page and selection survive adjacent-dialog navigation; filter changes return to page one.
- Low mode debounces search by 200ms and pauses automatic channel lookup on block addition and keyword-triggered pair creation. Saved automation preferences remain unchanged. Manual pair creation/update remains available with one concurrent request instead of eight. Requests already started finish; queued automatic work is skipped. Disabling low mode does not replay skipped lookups.
- Existing handle/UCID/regex matching, keyword blocking, and dislike actions remain available. With pair matching, new UCID links require manual pair creation while low mode is enabled.
- Comment work yields after 50 nodes or 8ms in normal mode, or 20 nodes or 4ms in low mode. Low-mode continuation waits 50ms; normal continuation uses the next animation frame. A single comment operation can exceed the cooperative time budget. Pending work is discarded on host/navigation reset.
- Settings/list initialization renders once. Pair summaries are cached until data or expiry changes; status reads do not repeatedly normalize the entire pair store. Log status reads avoid copying all entries or flushing writes. Storage-only refreshes preserve unsaved settings inputs.
- Performance tests cover 100/500/1,000 rules, bounded row counts and batches, cleanup, save rollback, and cross-tab behavior. Actual Chrome memory/crash improvement must be checked in the affected browser; automated DOM tests do not establish a RAM reduction percentage.

## 7. Dialogs, Menus, And Live i18n

Settings dialog:

- Left navigation jumps to matching, comments, automation, pairing, API key, display/theme, logs/diagnostics, and reset; narrow screens use a top menu. Section changes preserve drafts; returning to the list preserves filters, selection, and page.
- Nested dialogs route Escape, Enter, Tab, and backdrop actions to top dialog only; close restores opener focus
- API tests/pair actions use `finally` cleanup. Requests have bounded timeouts. Concurrent manual requests share the active run; automatic requests wait for it instead of being skipped. Closing a dialog detaches the view; it does not cancel the shared app run.
- Debug metrics include page mode, comments-host/extraction failure counters, latest selector reason; exclude comment text, URLs, API keys, account data
- Intro note: changes auto-save
- Eight sections share the API section layout: heading above vertical fields/help/actions, consistent borders and spacing. Sections match navigation: matching, comments, automation, pairing, API key, display/theme, logs/diagnostics, reset.
- Select/text labels sit above their controls; checkbox labels stay inline. Custom refresh seconds stay below their interval selector. Input widths shrink to fit narrow screens.
- Default choices marked with muted `(Default)`
- Handle case sensitivity
- Identity method: `handle` rules or UCID pair `id` rules
- Regex matched-handle auto-add
- Auto-dislike mode
- Master keyword-automation toggle; regex editor, keyword rules, inputs, actions in block/keyword automation dialog
- Theme modes: light, dark, system, inverted system, YouTube, inverted YouTube, custom
- Custom theme colors: background, surface, text, muted text, border, primary, destructive; default restore + validation
- Logging subgroups for output destinations, recorded detail, console formatting, and saved-log management
- Saved count/last-entry status, console preview, test output, immediate retention trim, download, and confirmed clear
- Blocked-comment display mode
- Five-level text/UI scale; level 2 previous size, level 3 default
- Settings-to-block-list and block-list-to-settings buttons
- Navigation among block list, settings, block/keyword automation dialog
- Red destructive reset + confirmation for display/matching settings
- YouTube Data API v3 key/test controls
- UCID detection and independent pairing policies; operations/results live in the block list
- Pair updates resolve current handles from stable UCIDs.
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

- Only matching-related settings invalidate the cached comment matcher. Display, theme, logging, pair-policy, and API-configuration UI changes refresh open dialogs without rebuilding matchers or scheduling a comment scan.
- Repeated userscript evaluation retains one stylesheet and one application boot; consecutive notices reuse one toast live region and replace its pending timers.
- `watch` uses existing `ytd-comments#comments, ytd-comments` host lookup
- `shorts` uses comment-node-driven discovery; promotes shared container only when narrower than `body`, `html`, or `ytd-app`
- Page-key changes reset transient `IntersectionObserver` registrations and metadata caches, preventing reused hosts retaining detached nodes across videos
- Comment mutations are combined once per animation frame. Offscreen comments are observed without running matching or keyword actions until they enter the viewport; visible comments are reevaluated after relevant mutations or settings changes.
- Previously blocked comments remain eligible for offscreen rule-removal updates; callbacks for detached or no-longer-observed comments are ignored.
- Pair banner remains watch-only

## 8. Cross-Tab Sync

Remote Tampermonkey changes refresh local state for:

- `blocked_v2`
- `pair_meta_v1`
- `youtube_data_api_v3_config`
- `app_settings_v1`
- `lang`

Refresh updates lookup caches, open UI, and watch-page banner.

Pair metadata uses per-handle last-writer revisions with tombstones for deletes and a clear revision for full clears. Scalar UCID-detection changes use revision ordering; `lastPairCheckAt` and `pairNotificationDismissedAt` never move backward. A merged snapshot is written back only when it adds newer state, and a rejected merge write restores the local state.

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
3. For UCID matching, confirm `UCID Detection` on.
4. If pair missing or `unverified`, run `Create Pair` or `Update Pair`.
5. If API lookup or fallback is enabled, confirm an API key is saved and tested.

If pair maintenance fails:

1. Review `Last Pair Run` for handle failures/mismatches.
2. For page lookup, retry or enable API fallback with a saved, tested key.
3. For API lookup or fallback, run `Test API Key` and check the saved `lastTestResult` category/message.

Repeated `quota` API-key tests increment consecutive failures and show estimated 24-hour reset guidance from latest failure.

## 11. Remaining Work

After `v1.5.4`, large manager, security, i18n, regex-selection performance, Shorts comment hiding, long-session memory cleanup, pair-update minimization, visible-version, settings dialog, regex auto-add, and manager-polish TODOs complete. Future work: incremental improvements, not baseline feature completion.
