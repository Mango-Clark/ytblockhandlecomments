# 📌 YouTube Comment Blocker by Handle — v0.2.0

[English](README.md) | [한국어](나를읽어.md)

A Tampermonkey userscript that lets you block YouTube comments from specific author handles (@handle). Hidden comments disappear in real time, and the block list can be managed, imported, or exported via the menu.

---

## ✅ Features

- 🔇 Right-click an author handle to block or unblock
- Adds "Hide comments from this channel" to the ⋯ menu automatically
- Real-time updates using MutationObserver + IntersectionObserver
- 🔧 Block list popup:

  - Review or unblock entries (handle, channel ID, or regex)
  - Export as JSON (v2) or newline text
  - Import from JSON (v2/v1) or newline text (@handle, /regex/flags, or channel ID)
- 📝 Settings via `GM_registerMenuCommand`:

  - `🔍 Manage block list`
  - `🗑️ Clear block list`
  - `🌐 Language: KO/EN`

---

## 🧠 Usage

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Create a new userscript and paste the contents of `ytblockhandlecomments.js`
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

## ⚠️ Limitations & Notes

- Handles are normalized to lowercase (comparison is case-insensitive)
- Channel ID blocking is preferred when available; handle is used as fallback
- Storage is versioned and migrates legacy data automatically
- Context menus use delegated events
- Cross-tab synchronization via `GM_addValueChangeListener`
- Regex patterns apply to handle text only (not comment body)

---

## 👤 Author

- **Mango_Clark**
- License: MIT
