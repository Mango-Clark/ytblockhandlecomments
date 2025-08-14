# 📌 YouTube Comment Blocker by Handle — v0.1.3

A Tampermonkey userscript that lets you block YouTube comments from specific author handles (@handle). Hidden comments disappear in real time, and the block list can be managed, imported, or exported via the menu.

---

## ✅ Features

- 🔇 Right-click an author handle to block or unblock
- Adds "Hide comments from this channel" to the ⋯ menu automatically
- Real-time DOM updates using MutationObserver
- 🔧 Block list popup:

  - Review or unblock handles
  - Export handles as JSON or newline text
  - Import handles from JSON or newline text
- 📝 Settings via `GM_registerMenuCommand`:

  - `🔍 Manage block list`
  - `🗑️ Clear block list`

---

## 🧠 Usage

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Create a new userscript and paste the contents of `ytblockhandlecomments.js`
3. On any YouTube page:

   - Right-click an author handle to block or unblock
   - Right-click elsewhere → Tampermonkey → YouTube Comment Blocker by Handle → Manage/Clear block list

---

## 💾 Storage

- Storage key: `'blockedHandles_v1'`
- Storage value: `{ version: 1, updatedAt: number, handles: string[] }`
- Uses Tampermonkey `GM_getValue` and `GM_setValue`
- Supports import/export in JSON format for backups

---

## ⚠️ Limitations & Notes

- Handle comparison is **case-sensitive** (`@Mango_Clark` ≠ `@mango_clark`)
- Storage is versioned and migrates legacy data automatically
- Context menus use **delegated events**, avoiding direct DOM bindings
- Cross-tab synchronization is supported via `GM_addValueChangeListener`
- The dialog's `textarea` relies on direct DOM access and may be fragile

---

## 👤 Author

- **Mango_Clark**
- License: MIT

