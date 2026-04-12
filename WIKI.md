# 📚 YouTube Comment Blocker Wiki — v0.4.0-pre1

[English](WIKI.md) | [한국어](WIKI.ko.md)

This document is the detailed reference for the current implementation. `README.md` stays focused
on installation and day-to-day usage, while this wiki explains storage, matching, UID pair
behavior, and known constraints in more detail.

For the shorter overview, see [README.md](README.md).

---

## 1. Overview

The userscript hides YouTube comments by channel identity on watch pages.

Supported rule types in `blocked_v2`:

- `handle`: normalized `@handle`
- `id`: YouTube channel ID such as `UC...`
- `regex`: regular expression tested against the extracted handle text

Supported pair metadata in `pair_meta_v1`:

- `enableUidDetection`: on/off toggle for UID-based matching
- `pairs[]`: stored handle↔UID relationship metadata
- `verifiedAt`, `status`, `source`: validation and troubleshooting fields

Additional local config:

- `youtube_data_api_v3_config`: stores the user-supplied API key locally for pair actions

User-facing entry points:

- Right-click a comment author's handle
- Use the injected item in the comment `⋯` menu
- Open `Manage block list` from the Tampermonkey menu
- Use `Create Pair` / `Update Pair` inside the manager
- Respond to the stale or mismatch banner on watch pages

What the script still does not do:

- It does not block comment text by keyword
- It does not export or import pair metadata
- It does not run background polling to refresh pairs automatically

---

## 2. Environment

The script is designed for:

- Browsers supported by Tampermonkey
- `https://www.youtube.com/*`
- Runtime start at `document-idle`

Actual comment-hiding behavior is intentionally narrower:

- Matching and hiding are scoped to YouTube watch pages (`/watch`)
- Comment refresh attaches to the comments host, not every page surface
- The `⋯` menu enhancer still watches YouTube popup creation on `document.body`

---

## 3. Installation And Updates

### Install from the raw script

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open:

   ```text
   https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
   ```

3. Confirm the install in Tampermonkey.

### Metadata summary

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.4.0-pre1`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`

---

## 4. Common Workflows

### Block or unblock from a handle

1. Open a YouTube watch page.
2. Right-click a comment author's handle.
3. Confirm `Block` or `Unblock`.

This always adds or removes a `handle` rule.

### Block or unblock from the `⋯` menu

The script remembers the handle for the last opened comment action menu and injects one extra item:

- `Hide comments from this channel`
- `Unhide this channel's comments`

This also adds or removes a `handle` rule.

### Turn on UID detection

1. Open `Manage block list`.
2. Save your YouTube Data API v3 API key.
3. Turn on `UID Detection`.
4. Existing handle rules keep working.
5. `id` rules start participating in comment matching.

### Create pairs

1. Open the manager.
2. Click `Create Pair`.
3. The script resolves missing handle↔UID pairs.
4. On success, it stores pair metadata and adds the matching `id` rule.
5. On failure, handle blocking remains active and the pair becomes `unverified`.

### Update pairs

1. Click `Update Pair` from the manager or the watch-page banner.
2. Existing pairs are looked up again.
3. If the UID is unchanged, `verifiedAt` is refreshed.
4. If the UID differs, the pair becomes `mismatch`.
5. Existing handle and stored `id` rules are not removed automatically on mismatch.

---

## 5. Matching Model

### Always-on behavior

Handle matching is always enabled.

### Optional UID behavior

UID matching is controlled by `pair_meta_v1.enableUidDetection`.

Current implementation detail:

- `id` rules are only active while UID detection is enabled
- Turning UID detection off keeps the stored `id` rules and pair metadata, but stops UID-based
  comment matching

### Per-comment matching order

For each comment node:

1. Channel ID match
2. Handle match
3. Regex match against the handle

The first positive match toggles `tm-hidden`.

### Extracted metadata

Per comment node, the script tries to read:

- `handle` from `#author-text > span`, `#author-handle`, or `a[href^="/@"]`
- `id` from `a[href*="/channel/UC"]`

That metadata is cached in a `WeakMap` and invalidated on refreshed nodes.

---

## 6. Pair Metadata Model

Storage key:

```text
pair_meta_v1
```

Stored shape:

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

Status meaning:

- `verified`: the latest successful check matched the stored UID
- `stale`: the pair has not been verified for 7 days
- `mismatch`: the latest lookup returned a different UID
- `unverified`: lookup failed or no verified UID is stored yet

Manager badges:

- `handle-only`
- `paired`
- `stale`
- `mismatch`
- `unverified`

The `handle-only` badge means the handle is blocked but there is no usable pair-backed UID rule for
it yet.

API key config storage:

```ts
{
  version: 1,
  apiKey: string
}
```

The API key is stored separately from block rules and pair metadata and is not included in
import/export.

---

## 7. UID Lookup Strategy

Current lookup behavior:

1. Read the user-saved YouTube Data API v3 key from local Tampermonkey storage
2. Call `GET https://www.googleapis.com/youtube/v3/channels`
3. Send `part=id`, `forHandle=@handle`, `key=<apiKey>`
4. Read `items[0].id` from the API response

This follows the official `channels.list` documentation, where `forHandle` identifies the channel
associated with a YouTube handle and exactly one filter parameter should be supplied.

Fallback behavior:

- If lookup fails, handle blocking still works
- Failed or old pairs stay `unverified` or `stale`
- The script does not silently delete existing pair data on lookup failure
- If no API key is saved, pair creation and update actions are blocked

---

## 8. Block List Manager

The manager dialog now contains three maintenance areas:

### UID section

- Local-only YouTube Data API key input
- `UID Detection` toggle
- `Create Pair`
- `Update Pair`
- Pair summary cards
- Last pair-check timestamp

### Regex section

- Inline regex add form
- `Build/Test Regex` button for `regexr.com`

### Rule list

- Shows all `handle`, `id`, and `regex` entries
- Shows pair badges and metadata for handle entries
- Supports per-row removal

Removal behavior:

- Removing a `handle` rule also removes its stored pair metadata and paired `id` rule
- `Clear block list` clears both rule storage and pair metadata

---

## 9. Import And Export

Supported import/export applies to `blocked_v2` only.

### JSON export

```json
{
  "version": 2,
  "exportedAt": 1710000000000,
  "items": [
    { "type": "handle", "value": "@examplechannel" },
    { "type": "id", "value": "UC1234567890ABCDE" },
    { "type": "regex", "value": "^@spam", "flags": "i" }
  ]
}
```

### Plain-text export

```text
@examplechannel
UC1234567890ABCDE
/^@spam/i
```

### JSON import

- V2 objects with `items`
- Legacy V1 objects with `handles`

### Plain-text import

- `@handle`
- `UC...`
- `/regex/`

Current boundary:

- Pair metadata is intentionally excluded from import/export in `v0.4.0-pre1`
- The API key is also excluded from import/export and is stored locally only

---

## 10. Cross-Tab Sync And Notifications

The script listens for remote Tampermonkey storage changes on:

- `blocked_v2`
- `pair_meta_v1`

When another tab updates one of those values:

- The local in-memory state is refreshed
- Lookup sets are rebuilt
- Current comments are rechecked
- A toast announces the sync

Watch-page notification behavior:

- If UID detection is enabled and at least one pair is `stale` or `mismatch`, the script shows a
  banner
- The banner offers `Update Now` and `Later`
- `Later` suppresses the banner for roughly one day

---

## 11. Real-Time Hiding And Performance

High-level runtime flow:

1. The app starts on the next animation frame after load.
2. On `/watch`, it finds or waits for the comments host.
3. It observes only the comment area for new nodes.
4. It refreshes affected comment roots incrementally.
5. Matching comments receive `tm-hidden`.

Performance notes:

- Comment observation is scoped to the watch-page comments host
- Incremental refresh is preferred over full rescans
- `IntersectionObserver` is used to re-apply hiding for observed nodes entering the viewport
- Lightweight counters are exposed on `window.__ytCommentBlockerPerf`

---

## 12. Limitations And Troubleshooting

Current limitations:

- UID lookup depends on a valid YouTube Data API v3 key with quota available
- Pair metadata is local-only and not part of import/export
- Some menu text still requires reopening the UI or refreshing after a language change
- Regex rules only target handles, not comment text

If comments are not hiding:

1. Confirm you are on a watch page.
2. Confirm the rule exists in the manager.
3. If you expect UID matching, confirm `UID Detection` is enabled.
4. Confirm a valid API key is saved in the manager.
5. If the pair is missing or `unverified`, run `Create Pair` or `Update Pair`.
6. Refresh the page after a fresh install or update if YouTube was already open.

If UID matching does not activate:

1. Open the manager and check whether the handle shows `paired`, `stale`, or `mismatch`.
2. If it shows `handle-only` or `unverified`, run `Create Pair`.
3. If it shows `stale` or `mismatch`, run `Update Pair`.
4. If lookup still fails, the script safely falls back to handle-only behavior.

---

## 13. Future Work

Open items from `TODO.md` still relevant after `v0.4.0-pre1`:

- Improve lookup efficiency with sorting and binary search
- Refresh some menu and dialog labels immediately after language changes
- Narrow the `⋯` menu observer instead of watching `document.body` continuously
- Remove or harden the dialog string-HTML insertion path
- Add richer list filtering or selection controls
- Add API key validation/testing UX and better quota/error reporting

The pair system is now implemented, but its lookup source and failure handling are still expected
to evolve over time.
