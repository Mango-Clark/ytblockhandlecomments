# Changelog

[English](CHANGELOG.md) | [한국어](CHANGELOG.ko.md)

Notable project changes documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- None

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- None

## [1.5.0] - 2026-07-18

### Added

- Marked default saved-setting choices in Settings dialog with muted `(Default)` label.
- Configurable cached handle-to-channel-ID lookup using public YouTube channel page by default; explicit API lookup, API fallback, intervals, on-add resolution.

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- Added privacy-limited page, comments-host, extraction diagnostics to debug metrics.
- Restored API/pair controls after async errors; merged overlapping pair requests into one active run.
- Routed nested-dialog keyboard/backdrop actions to top dialog only; restored opener focus after close.
- Limited YouTube-theme discovery to direct `ytd-app` lifecycle changes; disabled theme observers outside YouTube theme modes.
- Preserved settings, rules, pair metadata, API keys, logs when Tampermonkey rejects write; showed retry guidance instead of success.
- Prevented legacy block-list entries reappearing after migrated v2 rule deletion or list clear.
- Prevented concurrent cross-tab block-list writes losing additions; add/delete/clear conflicts converge deterministically.
- Restricted handle context-menu interception to comment authors; preserved YouTube context menu for other handle links.
- Stopped comment-host discovery fallback to broad page roots; bounded failed mutation retries.
- Attached Shorts comment observation to stable panel, not single comment renderer.
- Added page-key-deduplicated YouTube SPA detection for page-data and History API updates.
- Added fallback channel-ID extraction paths and pair-mode diagnostics for missing comment channel IDs.
- Reapplied keyword/auto-dislike actions when YouTube reuses comment DOM node for new identity.

### Security

- None

## [1.4.0] - 2026-07-12

### Added

- Release-script options to fast-forward and optionally push `master` after required `origin/dev` push.

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- Prevented YouTube theme observers reacting to userscript theme-class changes and repeatedly refreshing page.

### Security

- None

## [1.3.0] - 2026-07-11

### Added

- V0-V5 diagnostic-detail settings for log payloads.
- JSON/plain-text downloads and return action in block-list export dialog.
- Per-option explanations for keyword automation settings.
- Unified block/keyword automation dialog for regex rules and detailed keyword settings.
- Selectable system, YouTube, inverted, custom userscript UI themes.

### Changed

- Added spacing before settings matching group; highlighted reset actions as destructive.
- Moved detailed keyword settings from Settings, leaving master enable/disable control.

### Deprecated

- None

### Removed

- None

### Fixed

- Restored idempotent comment `⋯` menu injection for reused/delayed YouTube popups.

### Security

- None

## [1.2.0] - 2026-07-11

### Added

- Independent local log retention and browser-console logging settings with configurable level, retention, text-file download.

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- None

## [1.1.0] - 2026-07-11

### Added

- Selectable identity blocking with default `handle` rules or UID pair `id` rules.
- Independent pair-update checks for stored UID verification and handle re-resolution.
- Configurable keyword automation for comment text, author handles, pinned labels.

### Changed

- Pair creation still resolves `handle` to UID regardless of update-check settings.
- Keyword actions deduplicate per comment; avoid duplicate block-list/pair requests.

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- None

## [1.0.2] - 2026-07-11

### Added

- Configurable console-log prefixes, optional timestamps, ISO/custom time formats, timezone selection.

### Changed

- Settings dialog now category-list layout with grouped controls, descriptions, automatic-save note.

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- None

## [1.0.1] - 2026-07-04

### Added

- Loading bars while API key tests and pair create/update actions await API responses.
- Navigation buttons between settings dialog and block list.
- Five-level text size and UI scale settings.

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- Block-list dialog now appends existing settings, API, pair sections to dialog body.

### Security

- None

## [1.0.0] - 2026-07-04

### Added

- None

### Changed

- Changed readable `src/` source slices from JavaScript to TypeScript; generated userscript unchanged.
- Changed tests from JavaScript to TypeScript; Node test runner workflow unchanged.
- Changed build/version scripts from JavaScript to TypeScript; existing npm commands preserved.
- Userscript builds now bundle explicit TypeScript modules with esbuild; generated output excluded from ESLint.
- Added TypeScript project boundaries for source, script, test files, preventing editor diagnostics treating split userscript files as one strict module.
- Added project `typecheck` script running TypeScript checks for source, scripts, tests.

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- None

## [0.9.0] - 2026-06-24

### Added

- Blocked-comment display modes: full hide, placeholder, click-to-reveal.
- Confirmation-gated reset button for app display/matching settings.

### Changed

- Grouped related settings-dialog controls for easier scanning.

### Deprecated

- None

### Removed

- None

### Fixed

- Prevented blocked top-level comment threads hiding or auto-disliking child replies.

### Security

- None

## [0.8.0] - 2026-06-23

### Added

- Three-mode auto-dislike setting for blocked comments: off, newly hidden only, always while hidden.

### Changed

- Default auto-dislike mode now off.
- Split Korean/English i18n dictionaries into separate source files.

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- None

## [0.7.0] - 2026-06-18

### Added

- Separate settings dialog for API, UID detection, regex auto-add, debug counters.
- Optional regex matched-handle auto-add; future channel comments use handle matching before regex.

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- Shared UID deletion keeps matching rules while other pairs use same UID.
- Remote `blocked_v2` sync normalizes/deduplicates items locally.
- Watch-page pair review banner stays hidden for full stale interval after `Later` or recent pair check.
- Invalid imports remain open, exposing validation failures.

### Security

- API fetches use `referrerPolicy: 'no-referrer'`.
- Import text capped before `JSON.parse`.
- Pasted API keys sanitized before storage.

## [0.6.0] - 2026-05-20

### Added

- No-dependency `node:test` harness with local DOM shim for userscript regression tests.
- Pair-run result filtering, sorting, failed-handle copy/export helpers.
- Structured quota guidance after repeated YouTube Data API quota test failures.
- Role-based `src/` files with no-dependency build/check script for root userscript distribution file.

### Changed

- Added automated tests for manager search, dialog i18n refresh, pair result disclosure state, navigation observer reset, pair update skip/force behavior, regex safety/import literal round-trips.
- Build writes compact root userscript; readable source remains in `src/`.
- Moved support docs to `docs/`; updated internal links; kept root `README*.md` landing pages.
- Expanded regex match lists paginate results and update only affected regex row.

### Deprecated

- None

### Removed

- None

### Fixed

- None

### Security

- None

## [0.5.1] - 2026-05-20

### Added

- None

### Changed

- UID mismatch handling replaces stale stored UID rules with latest resolved UID instead of retaining old channel ID.

### Deprecated

- None

### Removed

- None

### Fixed

- Plain-text regex import accepts exported `/pattern/flags` literals and escaped slash patterns.

### Security

- Added regex pattern, flag, target-length, heuristic safety checks reducing page freezes from catastrophic user regexes during comment matching/manager scans.

## [0.5.0] - 2026-05-20

### Added

- Manager dialog shows current userscript version.

### Changed

- Default `Update Pair` skips fresh verified pairs until stale interval expires; selected-handle bulk updates force refreshes for explicit requests.

### Fixed

- Reset transient comment observers/metadata caches on video navigation so long YouTube sessions avoid retaining detached comment DOM nodes.

## [0.4.0] - 2026-04-12

### Added

- New `app_settings_v1` storage for handle case-sensitivity settings
- Block-list row checkboxes, visible-results select-all, selected-count display
- `all|handle|id|regex` type filtering and handle-tag filtering in manager dialog
- Bulk actions: delete selected entries; create/update pairs for selected handles
- Manager search with indexed substring lookup
- Regex rows expose matched-handle counts, inline expansion, matching-handle selection
- Detailed per-handle pair-run results in manager and watch-page follow-up dialog
- API key testing with stored diagnostics in `youtube_data_api_v3_config`
- Menu command/dialog refresh hooks for live i18n updates
- `GM_unregisterMenuCommand` userscript grant

### Changed

- Handle rules preserve stored casing; compare per `handleCaseSensitive`
- Pair metadata matching follows same handle comparison policy as block rules
- Manager dialog adds dedicated handle case-sensitivity section and expanded list-maintenance toolbar
- Cross-tab sync refreshes local state when `app_settings_v1` and `lang` change
- API config storage now version 2; retains latest key-test result
- Watch-page pair banner can show detailed pair-run results after updates
- Refactored manager dialog to share per-render view state for visible/selected rule calculations
- Regex-row matching uses dialog-session cache; computes full match arrays only on expand or `Select matching handles`
- Selection-only actions update visible checkboxes, counters, bulk-action state without rebuilding full rule-list DOM
- Expanded comment-hiding pipeline from `/watch` to `/watch` and `/shorts/<id>`
- Refactored page sync/comments-host discovery around explicit page-mode helper
- Kept pair-banner watch-only; reused comment matching/mutation path on Shorts

### Fixed

- Comment DOM text and `/@...` links preserve exact handle casing for case-sensitive mode
- Filtered tag views show only matching handle entries, excluding unrelated `id`/`regex` rows
- Optional UID detection toggle backed by new `pair_meta_v1` storage
- Handle↔UID pair creation/refresh actions in manager dialog
- Pair status badges and metadata for blocked handles
- Watch-page banner prompts pair review for stale/mismatch items
- Cross-tab pair-metadata synchronization
- Local-only YouTube Data API v3 API key storage in manager dialog
- Pair creation/update use `channels.list` with `forHandle` filter
- Manager dialog gains UID section, pair summary cards, pair timestamps
- UID resolution requires user API key instead of channel-page scraping
- `id` rule matching controlled by UID detection toggle, not always active
- Removing handle rule also removes paired UID rule and pair metadata
- Pair actions disabled until API key saved
- Docs describe API-key UID flow and local-only key storage
- Preserved handle-only blocking fallback when UID lookup fails or pair cannot be verified
- Reduced reliance on fragile YouTube channel-page HTML for UID lookup
- Removed main `Select matching handles` latency by avoiding whole-list rerenders on regex-row selection
- Reduced repeated manager work rebuilding search/selection state within same interaction cycle
- Blocked comments/replies now hide on supported Shorts pages instead of watch-only skipping
- Storage refresh targets active attached comments host, enabling immediate post-block hiding on Shorts

## [0.3.0] – 2026-04-07

### Added

- Lightweight performance counters at `window.__ytCommentBlockerPerf`

### Changed

- Scoped comment observation to watch pages/comments host instead of full page
- Switched refresh from broad subtree rescans to incremental processing of affected comment roots
- Cached comment handle/channel metadata per node; deduplicated `IntersectionObserver.observe()` registration

### Fixed

- Reduced YouTube UI delay from global DOM observation/repeated comment rescans

## [0.2.4] – 2025-08-17

### Added

- Userscript metadata: add `@homepage`

### Changed

- Userscript metadata: edit `@namespace`

## [0.2.3] – 2025-08-17

### Fixed

- Apply blocks/unblocks live without refresh by re-evaluating comment nodes and removing update-blocking cache guard.

## [0.2.2] – 2025-08-15

### Changed

- Docs: bump README (EN/KO) version to v0.2.2
- Docs: add one-click install raw URL and Userscript metadata section
- Docs: clarify language toggle behavior for open UI

## [0.2.1] – 2025-08-15

### Added

- Inline regex input in block-list dialog
- “Build/Test Regex” button opening regexr.com
- Sticky separated regex toolbar unaffected by scrolling

### Changed

- Reduced regex-section button height for tighter UI
- Added bilingual link bars to README/changelogs
- Updated userscript @namespace and @updateURL/@downloadURL to GitHub repo

## [0.2.0] – 2025-08-15

### Added

- Channel ID blocking with ID-first matching, handle fallback
- Regex handle blocking with validation/import/export
- i18n (Korean/English) and accessibility improvements (ARIA roles, aria-live)
- IntersectionObserver visibility processing and WeakSet node caching
- Tampermonkey language-toggle menu

### Changed

- Storage upgraded to v2 schema `{version:2, items:[{type:'id'|'handle'|'regex', ...}]}` with automatic migration
- Switched from inline hiding styles to class toggling for batched updates

### Fixed

- Reduced redundant scans via scoped refresh and rAF debounce

## [0.1.5] – 2025-08-15

### Fixed

- Optimized cross-tab sync: prevent remote-update echo writes causing cascading updates/exponential slowdown across many tabs

### Changed

- Storage avoids redundant writes when handle list unchanged

## [0.1.4] – 2025-08-14

### Changed

- Fixed block-list dialog footer so Import, Export, Close remain visible

## [0.1.3] – 2025-08-14

### Changed

- Enlarged default dialog UI for readability

### Fixed

- Widened export-list dialog
- Exported text uses real line breaks between handles

## [0.1.2] – 2025-08-08

### Added

- Added `@updateURL` and `@downloadURL` userscript metadata
- Documented storage versioning, delegated context-menu events, cross-tab sync, JSON import/export

### Changed

- Rewrote README in English; added Korean translation

## [0.1.1] – 2025-08-08

### Fixed

- Corrected "Tampermonkey" spelling in README

## [0.1.0] – 2025-08-08

### Added

- Refactored codebase to class-based OOP
- Separated automatic menu injection into `MenuEnhancer` class
- Added block-list export formats: JSON and line-by-line text
- Added JSON-schema/multi-format import
- Added versioned storage key `blockedHandles_v1` and automatic migration from legacy `blockedHandles`
- Added cross-tab sync with `GM_addValueChangeListener`
- Normalized handles to lowercase
- Added dialog focus trap
- Improved performance via MutationObserver and requestAnimationFrame debounce

### Changed

- Switched direct DOM binding to delegated event handling
- Improved list UI with dynamic rendering

### Deprecated

- Retained `blockedHandles` key; no longer used internally

### Fixed

- Fixed missed blocking in some comment threads

### Security

- Reduced XSS risk by prioritizing dialog text nodes

## [0.0.1] – 2025-07-06

### Added

- Block/unblock comment authors by right-clicking their `@handle`
- Added `MutationObserver` for live comment blocking
- Block-list popup UI for review/unblock
- Export/import block list as newline-separated text
- Added two Tampermonkey menu commands:
  - 🔍 Manage block list
  - 🗑️ Clear block list
- Custom toast notifications and simple dialog UI
