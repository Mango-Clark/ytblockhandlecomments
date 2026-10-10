# 📌 YouTube Comment Blocker — v{{version}}

{{language_links}}

A Tampermonkey userscript that hides YouTube comments by channel identity on watch and Shorts pages. Manage handle, UCID, and regex rules with configurable automation and local storage.

## Installation and use

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the raw script URL below, or paste `ytblockhandlecomments.js` into a new userscript.
3. On a YouTube video or Shorts page, right-click a comment author’s handle or use the comment `⋯` menu to block/unblock the channel.
4. Open the script’s Tampermonkey menu to manage the block list, settings, or UI language.

<https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## Features

- **Blocking:** handle rules by default, optional UCID pair rules, independent regex rules, and optional case-sensitive handle matching. Only comment-author interactions are enhanced.
- **Comments and automation:** hide, gray placeholder, or click-to-reveal; optional auto-dislike; regex auto-add; keyword checks on text, handles, or pinned labels with selected actions. Reused comment nodes are processed again.
- **Block list:** search, type/tag filters, selection, bulk actions, JSON/text import/export and downloads. Regex matches can be counted, selected, expanded, and paged without rebuilding the whole list.
- **Settings:** eight uniform sections with vertical fields and help: matching, comments, automation, pairing, API key, display/theme, logs/diagnostics, reset. Side navigation becomes a top menu on narrow screens. Changes save automatically; defaults are marked.
- **Appearance:** five text/UI size levels and light, dark, system, inverted system, YouTube, inverted YouTube, or custom themes. Native YouTube dark-state signals drive synchronization; colors affect only the script UI.
- **Performance:** cached matching and bounded comment-host discovery. Lists use 100 entries per page. Optional low-performance mode uses 50, smaller batches, delayed search, and manual-only pairing with one request at a time; skipped automatic lookups are not replayed.
- **Logs:** separate local and console outputs, configurable level/retention/prefix/timezone/ISO or custom timestamps, test output, download, confirmed clear, and V0–V5 detail. Sensitive values are redacted; logging stays outside per-comment matching.
- **State:** drafts and block-list search, filters, selection, page, and scroll survive navigation and language changes. SPA navigation resets transient observers; dialogs provide keyboard focus management.

## UCID pairing

1. Blocking a handle applies immediately. Immediate pair creation is on by default and runs asynchronously; failure preserves existing blocks and links.
2. Creation resolves **handle → UCID** and saves a pair plus an `id` rule. Updates resolve **UCID → latest handle**, retain the UCID, and replace the old handle after a rename. Missing UCIDs use the creation path.
3. Configure creation, updates, and immediate pairing independently: channel page only, official API only, or page first with API fallback. Page-only lookup needs no API key; API requests need a saved key.
4. For UCID matching, enable UCID detection and choose UCID pair rules. Until the required UCID rule exists, use handle mode. Keyword pair creation uses the creation policy; low-performance mode pauses automatic lookup but permits manual actions.
5. Choose the refresh interval or custom seconds (minimum one second). Defaults are 10 minutes for page lookup and one week for API lookup. Full updates honor the interval; selected-handle updates force lookup.
6. Run pair operations in the block list. Review status, per-handle results, filters/sorting, failed-handle copy/export, progress bars, and the watch-page review banner. API-key tests provide repeated-quota guidance.
7. Page lookup reads the channel’s own metadata; API updates require a matching UCID and an `@handle` custom URL. Missing data, conflicts, cancellation, and lookup failures preserve existing connections.

## Languages

UI and README support `en-us`, `ko-kr`, `ja-jp`, `de-de`, `zh-cn`, `zh-tw`, `fr-fr`, `pt-br`, `ru-ru`, and `id-id`. Select a language in Settings → Display/theme or the Tampermonkey language menu. Saved choices take priority; automatic mode checks browser preferences, then uses `en-us`.

Regional variants match the same supported language (`en-GB` → `en-us`, `pt-PT` → `pt-br`). Chinese scripts/regions distinguish simplified and traditional: Hans/CN/SG → `zh-cn`, Hant/TW/HK/MO → `zh-tw`; bare `zh` uses simplified. Existing saved `en`/`ko` selections remain valid. Wiki and changelog remain English/Korean; other guides retain their existing languages.

## Storage and privacy

- `blocked_v2`: `handle`, `id` (UCID), and `regex` rules. JSON/text import/export keeps its existing format, including `/pattern/flags` regex literals.
- `pair_meta_v1`: UCID links and verification metadata; `app_settings_v1`: settings; `youtube_data_api_v3_config`: API key and test/quota metadata; `lang`: language preference.
- Pair metadata and API keys are excluded from block-list import/export. API keys are stored locally and sent only when making official API requests. Downloaded logs use UTC ISO timestamps; the browser controls their destination.
- Cross-tab synchronization uses entry revisions and deletion markers to merge additions and prevent deleted rules/logs returning. Failed reads block unsafe writes; rejected writes preserve previous data.
- Legacy block lists migrate only when valid current data is absent. UID fields migrate to UCID while retaining storage keys, revisions, deletion markers, and timestamps. Refresh tabs running older script versions after updating.
- Detailed payload schemas, console timestamp tokens, and implementation behavior are documented in the Wiki linked below.

## Defaults

- Handle matching; full hiding; auto-dislike off; immediate pairing on; all three lookup policies use channel pages on new installations.
- Text/UI size level 3; level 2 matches the older size. Diagnostic detail V3; V0/V1 omit payloads, V2 keeps 1 field, V3 3, V4 6, V5 10.
- Low-performance mode and logging are off. Keyword checks are case-insensitive, target comment text by default, and perform no actions until enabled.
- Existing settings and custom refresh intervals are preserved during updates. Lookup and UI language changes do not reset block rules or saved drafts.

## Limits and notes

- Page lookup is undocumented and may fail after YouTube HTML changes. Official API calls use quota; UCID matching is local once rules exist. API-key tests use a fixed public channel probe.
- Older handles may have been saved lowercase; exact case matching is guaranteed only after re-saving or adding them again. Regex targets handles; keyword checks target only the selected fields.
- Regex input is validated for length, flags, and conservative structural complexity; matching targets are limited to 128 characters. Hidden comments and review banners are scoped to supported watch/Shorts surfaces; banners appear on watch pages only.
- YouTube/API response text, saved user content, channel identifiers, protocol fields, and machine-readable logs are not translated. The userscript excludes embedded players and uses only the listed Tampermonkey grants.

## Documentation

- Wiki: [English](docs/WIKI.md) / [한국어](docs/WIKI.ko.md)
- Changelog: [English](docs/CHANGELOG.md) / [한국어](docs/CHANGELOG.ko.md)
- Contribution guide: [English](CONTRIBUTING.md) / [한국어](CONTRIBUTING.ko.md)
- [TODO](docs/TODO.md) / [Review helper](docs/ABOUT.md)

## Development and verification

- Work on `dev`; edit role-based TypeScript in `src/`. Numeric prefixes guide reading, while ES module imports determine runtime order. Shared storage lives in `03a-gm-backed-store.ts`; manager modules are `12a`–`12e`.
- Edit documentation templates in `src/template/`, not generated README/docs. `npm run build` transactionally regenerates all localized READMEs and the compact `ytblockhandlecomments.js`; Tampermonkey loads only that root script.
- Keep all ten UI catalogs and README translations aligned. `en.ts` defines the message contract; `locales.ts` owns language names, README paths, and contributors. `i18n-mason.toml` records locale scope. Preserve placeholders and machine-facing text.
- `npm run verify` runs lint, Markdown lint, typecheck, deterministic `node:test` cases, build, and generated-output checks. Component commands remain independently available. Report any explicitly skipped checks.
- Commit source and generated output together using Conventional Commits; obtain independent review. Do not change versions or push without explicit authorization. Releases use `npm run bump:version -- <MAJOR.MINOR.PATCH>`.

```sh
npm run lint
npm run lint:markdown
npm run typecheck
npm run build
npm run check:build
npm run verify
```

Optional future browser coverage remains separate from the dependency-free verification suite; no live YouTube session is required by automated tests.

## Translation contributors

{{translation_contributors}}

## Author

- **Mango_Clark**
- License: MIT
