# 📌 YouTube Comment Blocker by Handle — v0.2.2

[English](README.md) | [한국어](README.ko.md)

A Tampermonkey userscript that lets you block YouTube comments from specific author handles (@handle). Hidden comments disappear in real time, and the block list can be managed, imported, or exported via the menu.

Quick install: open this raw URL in Tampermonkey to install/update

- https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js

---

## ✅ Features

- 🔇 Right-click an author handle to block or unblock
- Adds "Hide comments from this channel" to the ⋯ menu automatically
- Real-time updates using MutationObserver + IntersectionObserver
- 🔧 Block list popup:

  - Review or unblock entries (handle, channel ID, or regex)
  - Add regex patterns directly via an inline form
  - Export as JSON (v2) or newline text
  - Import from JSON (v2/v1) or newline text (@handle, /regex/flags, or channel ID)
- 📝 Settings via `GM_registerMenuCommand`:

  - `🔍 Manage block list`
  - `🗑️ Clear block list`
  - `🌐 Language: KO/EN`

---

## 🧠 Usage

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Install via the raw URL above, or create a new userscript and paste the contents of `ytblockhandlecomments.js`
3. On any YouTube page:

   - Right-click an author handle to block or unblock
   - Right-click elsewhere → Tampermonkey → YouTube Comment Blocker by Handle → Manage/Clear block list

---

## 💾 Storage

- Storage key: `blocked_v2`
- Storage value: `{ version: 2, updatedAt: number, items: Array<{ type: 'handle'|'id'|'regex', value: string, flags?: string }> }`
- Migrates from legacy keys: `blockedHandles` (string[]/text) and `blockedHandles_v1`
- Uses Tampermonkey `GM_getValue` and `GM_setValue`
- Import/export: JSON (v2/v1) and newline text

---

## 🧾 Userscript Metadata

Key entries used by this script:

- `@name`: YouTube Comment Blocker by Handle
- `@version`: 0.2.2
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`, `GM_registerMenuCommand`
- `@updateURL`/`@downloadURL`: points to the raw GitHub URL for easy updates

---

## ⚠️ Limitations & Notes

- Handles are normalized to lowercase (comparison is case-insensitive)
- Channel ID blocking is preferred when available; handle is used as fallback
- Storage is versioned and migrates legacy data automatically
- Context menus use delegated events
- Cross-tab synchronization via `GM_addValueChangeListener`
- Regex patterns apply to handle text only (not comment body)
- Language toggle updates new dialogs/menus; some open UI may need reopen

---

## 👤 Author

- **Mango_Clark**
- License: MIT
