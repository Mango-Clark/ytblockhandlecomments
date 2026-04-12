# 📚 YouTube Comment Blocker Wiki — v0.3.0

[English](WIKI.md) | [한국어](WIKI.ko.md)

This document is the detailed reference for the project. `README.md` stays focused on quick
install and day-to-day usage, while this wiki explains the current behavior, supported data
formats, internal matching model, and known constraints in more detail.

For the shorter overview, see [README.md](README.md).

---

## 1. Overview

YouTube Comment Blocker is a Tampermonkey userscript for hiding comments from selected YouTube
channels. The script is centered on channel identity rather than comment text.

Current rule types:

- `handle`: normalized `@handle` values such as `@examplechannel`
- `id`: YouTube channel IDs such as `UCxxxxxxxxxxxx`
- `regex`: regular expressions evaluated against the extracted handle text

Current user-facing entry points:

- Right-click a comment author's handle to block or unblock that handle
- Open the comment `⋯` menu to use `Hide comments from this channel`
- Open the block list manager from the Tampermonkey menu
- Import or export rules from the manager dialog

What the script does not do:

- It does not block comment text by keyword
- It does not moderate uploads, chat, replies outside the current match scope, or server-side
  account behavior
- It does not currently expose a dedicated UI for manually typing channel IDs

---

## 2. Supported Environment

The script is designed for:

- A browser environment supported by Tampermonkey
- YouTube desktop pages matched by `https://www.youtube.com/*`
- Runtime activation after `document-idle`

Practical behavior is narrower than the `@match` value:

- The comment-hiding observer logic is scoped to YouTube watch pages (`/watch`)
- Comment scanning is attached to the comments host, not to every page on YouTube
- The `⋯` menu enhancer watches for YouTube's popup menu renderer so it can inject one custom
  menu item when a comment action menu opens

If you browse other YouTube surfaces, the script may still be loaded by Tampermonkey, but the
comment-hiding workflow is intentionally focused on watch-page comments.

---

## 3. Installation And Updates

### Install via the hosted raw script

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the project's raw script URL in the browser:

   ```text
   https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
   ```

3. Confirm the install in Tampermonkey.

### Install manually

1. Create a new userscript in Tampermonkey.
2. Replace the template with the contents of `ytblockhandlecomments.js`.
3. Save the script.

### Update behavior

The userscript metadata includes both `@updateURL` and `@downloadURL`, pointing at the same raw
GitHub file. In a normal Tampermonkey setup, this makes manual or automatic update checks easier.

Current metadata summary:

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.3.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`

---

## 4. Quick Start

The shortest useful workflow is:

1. Open a YouTube video watch page.
2. Scroll to the comments section.
3. Right-click a comment author's handle such as `@examplechannel`.
4. Confirm the block dialog.
5. The matching comments are hidden in real time on the current page.

To manage saved entries later:

1. Open Tampermonkey's menu for the page.
2. Choose `Manage block list`.
3. Review, remove, import, export, or add regex entries.

---

## 5. Common Workflows

### Block or unblock from the author handle

When you right-click a comment author's handle, the script intercepts the handle element and opens
its own confirmation dialog.

- If the handle is not blocked, the dialog offers `Block`
- If the handle is already blocked, the dialog offers `Unblock`
- The saved rule type is always `handle`

This is the fastest everyday flow and the main intended entry point.

### Block or unblock from the `⋯` menu

The script also enhances the YouTube comment action menu.

- When you open the menu for a comment, the script remembers the last detected handle
- When YouTube renders the popup menu, the script appends one extra item
- The label toggles between `Hide comments from this channel` and
  `Unhide this channel's comments`

This path also creates or removes a `handle` rule only.

### Manage the block list

From the Tampermonkey page menu, open:

- `🔍 Manage block list`
- `🗑️ Clear block list`
- `🌐 Language: KO/EN`

`Manage block list` opens the custom dialog for reviewing all stored entries.

### Add a regex rule

Inside the manager dialog, the sticky regex bar lets you add a regex rule directly.

Supported input styles in the regex add form:

- `^@spam`
- `/^@promo/i`

The regex add form validates the pattern before saving it.

### Clear all rules

`Clear block list` removes all saved entries from the main storage key. A confirmation dialog is
shown first.

### Change language

The script supports Korean and English through a small built-in i18n dictionary.

- The current language is read from `GM_getValue('lang')`
- If no saved language exists, the script falls back to the browser language and defaults to `ko`
  if needed
- The menu command toggles between `ko` and `en`

Some UI text updates are only visible the next time that UI is opened. See
[Language Behavior And Cross-Tab Sync](#10-language-behavior-and-cross-tab-sync).

---

## 6. Rule Types And Matching Model

The storage model supports three rule types. All three can coexist.

### `handle` rules

Handle rules are normalized through the script's `norm()` helper.

- A value must begin with `@`
- Whitespace is trimmed
- The stored value is lowercased
- Matching is case-insensitive in practice because the stored handle is normalized

Examples:

```text
@ExampleChannel   -> @examplechannel
 @spam.user       -> @spam.user
```

### `id` rules

Channel ID rules are validated against a `UC...` pattern before saving.

- Example shape: `UCXXXXXXXXXXXXXXXXXXXXXX`
- ID matching is preferred when a comment DOM node exposes a channel link with `/channel/UC...`
- The current UI does not provide a dedicated manual ID input field
- IDs are mainly useful through JSON import or advanced manual editing workflows

### `regex` rules

Regex rules are tested against the extracted handle text only.

- They do not inspect the comment body
- They do not inspect display names separately from handles
- Invalid regex patterns are rejected before saving

Examples:

```text
^@spam
^@promo_.*
```

### Matching order

For each comment node, the script evaluates in this order:

1. Channel ID
2. Handle
3. Regex against the handle

The first positive match hides the comment node by toggling the `tm-hidden` class.

---

## 7. Block List Manager

The manager dialog is the main maintenance UI for saved rules.

Features currently exposed there:

- List every saved rule in one scrollable dialog
- Remove any saved rule with the per-row `Unblock` button
- Add regex rules from the sticky header area
- Open `regexr.com` in a new tab for regex building/testing
- Open import or export dialogs

Display format in the list:

- Handle entries are shown as `@handle`
- Channel IDs are shown as raw `UC...` values
- Regex entries are shown as `/pattern/flags`

What the manager does not currently do:

- It does not let you edit an entry in place
- It does not group entries by type
- It does not provide search, sort, or bulk selection yet

---

## 8. Import And Export Formats

The script supports both structured JSON and plain text flows.

### JSON export

The export dialog includes a JSON textarea using this shape:

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

This is the most reliable format for backup and round-trip import, especially for regex rules with
flags.

### Plain-text export

The export dialog also includes a plain-text textarea with one entry per line.

Example:

```text
@examplechannel
UC1234567890ABCDE
/^@spam/i
```

This view is convenient for reading or hand-editing simple lists.

### JSON import

The import dialog accepts:

- V2-style objects with an `items` array
- Legacy V1-style objects with a `handles` array

Examples:

```json
{
  "version": 2,
  "items": [
    { "type": "handle", "value": "@examplechannel" },
    { "type": "regex", "value": "^@promo", "flags": "i" }
  ]
}
```

```json
{
  "version": 1,
  "handles": ["@examplechannel", "@anotherone"]
}
```

### Plain-text import

When the input is not valid JSON, the script splits the text by commas and newlines and interprets
each part as one entry.

Recognized plain-text forms:

- `@handle`
- `UC...`
- `/regex/`

Notes about plain-text regex import:

- Plain text reliably recognizes slash-delimited regex without flags, such as `/^@spam/`
- If you need regex flags like `i`, use JSON import for accurate preservation
- JSON import/export is the safest backup format overall

### Merge behavior

Import does not wipe the current list automatically.

- Imported entries are merged with existing entries
- The save path validates and deduplicates the combined result
- Invalid handles, invalid IDs, or invalid regex rules are dropped during normalization

---

## 9. Storage Model And Migration

The primary storage key is:

```text
blocked_v2
```

Current stored shape:

```ts
{
  version: 2,
  updatedAt: number,
  items: Array<
    | { type: 'id', value: string }
    | { type: 'handle', value: string }
    | { type: 'regex', value: string, flags?: string }
  >
}
```

Legacy keys still recognized during initialization:

- `blockedHandles`
- `blockedHandles_v1`

Migration behavior:

- The script loads v2, v1, and legacy entries
- The combined list is normalized into the v2 schema
- Duplicates are removed before saving back to `blocked_v2`

Validation rules enforced by the save path:

- Handles must normalize to a lowercased `@handle`
- Channel IDs must match the script's `UC[0-9A-Za-z_-]{10,}` pattern
- Regex rules must compile successfully

---

## 10. Language Behavior And Cross-Tab Sync

### Language behavior

The script ships with Korean and English strings in the same file.

Current behavior:

- New dialogs use the current value returned by `getLang()`
- The language toggle stores the next value in `GM_setValue('lang', next)`
- The toast after changing language appears immediately

Current limitation:

- Already-open dialogs do not live-refresh
- Tampermonkey menu labels are registered at startup, so some menu text may not refresh until the
  script is reloaded or the page is refreshed

### Cross-tab sync

The script listens for remote `blocked_v2` changes through `GM_addValueChangeListener`.

When another tab updates the block list:

- The current tab updates its in-memory entries
- Lookup sets are rebuilt
- A refresh is scheduled for the current comments host
- A toast announces that the block list was synced from another tab

Cross-tab sync currently covers the block list storage, not a full live refresh of every other UI
state.

---

## 11. Real-Time Hiding And Performance Design

The script is designed to reduce unnecessary rescanning while still reacting quickly to new
comments and YouTube SPA navigation.

### High-level flow

1. The app boots on the next animation frame after load.
2. On `/watch`, it looks for the comments host.
3. If the host does not exist yet, it observes the watch root until comments appear.
4. Once attached, it observes comment-area mutations only.
5. Added or changed comment roots are refreshed incrementally.
6. Matching comment nodes receive `tm-hidden`.

### Extracted metadata per comment

For each comment node, the script tries to cache:

- `handle` from `#author-text > span`, `#author-handle`, or `a[href^="/@"]`
- `id` from `a[href*="/channel/UC"]`

This metadata is stored in a `WeakMap` cache and invalidated only when needed.

### Why both MutationObserver and IntersectionObserver are used

- `MutationObserver` handles newly inserted comment nodes efficiently
- `IntersectionObserver` reapplies hiding when observed nodes enter the viewport

### Current performance counters

The script exposes lightweight counters on:

```js
window.__ytCommentBlockerPerf
```

Current fields include:

- `mutationBatches`
- `fullRefreshes`
- `incrementalRefreshes`
- `scannedNodes`
- `lastDurationMs`
- `totalDurationMs`

### Current performance tradeoffs

- Comment observation is scoped to the watch-page comments host to reduce global page cost
- Incremental refresh is preferred over full rescans when possible
- The `⋯` menu injection path still uses a `document.body` subtree observer, which is functional
  but broader than ideal

---

## 12. Limitations, Notes, And Troubleshooting

### Current limitations

- Comment hiding is intentionally focused on watch-page comments
- Regex rules apply to handles only, not comment text
- The everyday UI creates `handle` rules; `id` rules are mainly an advanced import path
- Some language changes are only visible after reopening UI or refreshing the page
- Plain-text import is not the safest way to preserve regex flags; use JSON when accuracy matters

### If comments are not hiding

Check the following:

1. Make sure you are on a YouTube video watch page (`/watch`).
2. Scroll to the comments area so YouTube actually renders comments.
3. Open `Manage block list` and confirm the entry exists.
4. If you imported regex rules with flags, re-import them as JSON.
5. Refresh the page after a fresh install or update if YouTube was already open.

### If the `⋯` menu item is missing

- Open the menu from an actual comment item, not from another YouTube surface
- Close and reopen the menu once if YouTube rendered it before the script captured the handle
- Confirm Tampermonkey is enabled on `youtube.com`

### If language text looks mixed

- Close and reopen the custom dialog
- Refresh the page so Tampermonkey menu labels are registered again in the new language

---

## 13. Future Work

The items below are planned or proposed work only. They are not implemented in `v0.3.0`.

From `TODO.md`:

- Improve lookup efficiency with sorting and binary search
- Refresh some i18n-controlled UI immediately after language changes
- Narrow the `⋯` menu injection observer instead of watching `document.body` continuously
- Remove or harden the dialog string-HTML insertion path
- Add richer selection/filtering options in the block list UI

From `docs/기획서.md`:

- Optional UID-based detection as an extra layer on top of handle matching
- Handle↔UID pair metadata
- Stale or mismatch status for stored pairs
- Manual pair creation/update flows and stale notifications

Those UID/pair ideas are design-stage notes only. The current released script still operates on
`handle`, `id`, and `regex` rules described above.
