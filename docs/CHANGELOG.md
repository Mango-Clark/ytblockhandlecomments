# Changelog

[English](CHANGELOG.md) | [한국어](CHANGELOG.ko.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added a blocked-comment display mode setting with full hide, placeholder, and click-to-reveal options.
- Added a confirmation-gated reset button for app display and matching settings.

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- Fixed blocked top-level comment threads hiding or auto-disliking child replies.

### Security

- None

## [0.8.0] - 2026-06-23

### Added

- Added a three-mode auto-dislike setting for blocked comments: off, newly hidden only, or always while hidden.

### Changed

- Changed the default auto-dislike mode to off.
- Split Korean and English i18n dictionaries into separate source files.

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

- Added a separate settings dialog for API, UID detection, regex auto-add, and debug counters.
- Added optional regex matched-handle auto-add so future comments from that channel use handle
  matching before regex.

### Changed

- None

### Deprecated

- None

### Removed

- None

### Fixed

- Shared UID deletion now keeps matching rules while other pairs still use the same UID.
- Remote `blocked_v2` sync now normalizes and deduplicates items locally.
- The watch-page pair review banner now stays hidden for the full stale interval after `Later` or
  a recent pair check.
- Invalid imports now stay open so validation failures are visible.

### Security

- API fetches now use `referrerPolicy: 'no-referrer'`.
- Import text is capped before `JSON.parse` runs.
- Pasted API keys are sanitized before storage.

## [0.6.0] - 2026-05-20

### Added

- Added a no-dependency `node:test` harness with a local DOM shim for userscript regression tests.
- Added pair-run result filtering, sorting, and failed-handle copy/export helpers.
- Added structured quota guidance after repeated YouTube Data API quota test failures.
- Added role-based `src/` source files with a no-dependency build/check script for the root
  userscript distribution file.

### Changed

- Covered manager search, dialog i18n refresh, pair result disclosure state, navigation observer
  reset, pair update skip/force behavior, and regex safety/import literal round-trips with
  automated tests.
- Build now writes a compact root userscript while keeping readable source in `src/`.
- Moved support documentation into `docs/` and updated internal links while keeping repository
  landing pages in the root `README*.md`.
- Expanded regex match lists now page results and update only the affected regex row.

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

- UID mismatch handling now replaces stale stored UID rules with the latest resolved UID instead
  of leaving the old channel ID active.

### Deprecated

- None

### Removed

- None

### Fixed

- Plain-text regex import now accepts exported `/pattern/flags` literals and escaped slash
  patterns.

### Security

- Added regex pattern, flag, target-length, and heuristic safety checks to reduce page freezes
  from catastrophic user regexes during comment matching and manager scans.

## [0.5.0] - 2026-05-20

### Added

- Manager dialog now shows the current userscript version.

### Changed

- Default `Update Pair` now skips fresh verified pairs until their stale interval expires, while
  selected-handle bulk updates still force refreshes for explicit user requests.

### Fixed

- Reset transient comment observers and metadata caches on video navigation so long YouTube
  sessions do not retain detached comment DOM nodes.

## [0.4.0] - 2026-04-12

### Added

- New `app_settings_v1` storage for handle case-sensitivity settings
- Block-list row checkboxes, visible-results select-all, and selected-count display
- `all|handle|id|regex` type filtering and handle-tag filtering in the manager dialog
- Bulk actions for deleting selected entries and creating/updating pairs for selected handles
- Manager search with indexed substring lookup
- Regex rows now expose matched-handle counts, inline expansion, and matching-handle selection
- Detailed per-handle pair-run results in the manager and watch-page follow-up dialog
- API key testing with stored diagnostic results in `youtube_data_api_v3_config`
- Menu command refresh and dialog refresh hooks for live i18n updates
- `GM_unregisterMenuCommand` userscript grant

### Changed

- Handle rules now preserve stored casing and compare according to `handleCaseSensitive`
- Pair metadata matching now follows the same handle comparison policy as block rules
- The manager dialog now includes a dedicated handle case-sensitivity section and an expanded
  list-maintenance toolbar
- Cross-tab sync now refreshes local state when `app_settings_v1` and `lang` change
- API config storage is now version 2 and keeps the latest key-test result
- The watch-page pair banner can surface detailed pair-run results after updates
- Refactored the manager dialog to reuse a shared per-render view state for visible and selected
  rule calculations
- Regex-row matching now uses dialog-session caching and computes full match arrays only on expand
  or `Select matching handles`
- Selection-only actions now update visible checkboxes, counters, and bulk-action state without
  rebuilding the full rule list DOM
- Expanded the comment-hiding page pipeline from `/watch` to both `/watch` and `/shorts/<id>`
- Refactored page sync and comments-host discovery around an explicit page-mode helper
- Kept pair-banner behavior watch-only while reusing the same comment matching and mutation path on
  Shorts

### Fixed

- Matched handles from comment DOM text and `/@...` links now preserve exact casing for
  case-sensitive mode
- Filtered tag views now show only matching handle entries instead of unrelated `id` or `regex`
  rows
- Optional UID detection toggle backed by new `pair_meta_v1` storage
- Handle↔UID pair creation and refresh actions in the manager dialog
- Pair status badges and metadata display for blocked handles
- Watch-page banner prompting pair review when stale or mismatch items exist
- Cross-tab synchronization for pair metadata updates
- Local-only YouTube Data API v3 API key storage in the manager dialog
- Pair creation and update now use `channels.list` with the `forHandle` filter
- Expanded the manager dialog with a UID section, pair summary cards, and pair timestamps
- UID resolution now requires a user-supplied API key instead of scraping channel pages
- `id` rule matching is now controlled by the UID detection toggle instead of always being active
- Removing a handle rule now also removes its paired UID rule and pair metadata
- Pair actions are disabled in the manager until an API key is saved
- Documentation now describes the API-key-based UID flow and local-only key storage
- Preserved handle-only blocking as a safe fallback when UID lookup fails or a pair cannot be verified
- Reduced fragility from relying on YouTube channel-page HTML structure for UID lookup
- Removed the main `Select matching handles` latency source by avoiding whole-list rerenders on
  regex-row selection
- Reduced repeated manager work from rebuilding search/selection state multiple times within the
  same interaction cycle
- Blocked comments and replies can now be hidden on supported Shorts pages instead of being skipped
  by watch-only page gating
- Storage-triggered refresh now targets the active attached comments host, allowing immediate
  post-block hiding on Shorts when a host is already connected

## [0.3.0] – 2026-04-07

### Added

- Lightweight performance counters exposed at `window.__ytCommentBlockerPerf`

### Changed

- Scoped comment observation to watch pages and the comments host instead of reacting to the full page
- Switched comment refresh from broad subtree rescans to incremental processing of affected comment roots
- Cached extracted comment handle/channel metadata per node and deduplicated `IntersectionObserver.observe()` registration

### Fixed

- Reduced YouTube UI delay caused by global DOM observation and repeated comment rescans

## [0.2.4] – 2025-08-17

### Added

- Userscript metadata: add `@homepage`

### Changed

- Userscript metadata: edit `@namespace`

## [0.2.3] – 2025-08-17

### Fixed

- Apply blocks/unblocks in real time without page refresh by re-evaluating existing comment nodes on refresh and removing the cache guard that prevented updates.

## [0.2.2] – 2025-08-15

### Changed

- Docs: bump displayed version in README (EN/KO) to v0.2.2
- Docs: add one-click install raw URL and Userscript metadata section
- Docs: clarify language toggle behavior for open UI elements

## [0.2.1] – 2025-08-15

### Added

- Inline regex input form in the block list dialog
- “Build/Test Regex” button that opens regexr.com
- Sticky, separated regex toolbar not affected by scrolling

### Changed

- Reduced button height in regex section for a tighter UI
- Added bilingual link bars to README and changelogs
- Updated userscript @namespace and @updateURL/@downloadURL to GitHub repo

## [0.2.0] – 2025-08-15

### Added

- Channel ID blocking with ID-first matching (handle as fallback)
- Regex-based blocking for handles with validation and import/export support
- i18n (Korean/English) and accessibility improvements (ARIA roles, aria-live)
- IntersectionObserver-based visibility processing and WeakSet node caching
- Tampermonkey menu to toggle language

### Changed

- Storage upgraded to v2 schema `{version:2, items:[{type:'id'|'handle'|'regex', ...}]}` with automatic migration
- Switched from inline style hiding to class toggling for batched updates

### Fixed

- Reduced redundant scans by scoping refresh and debouncing via rAF

## [0.1.5] – 2025-08-15

### Fixed

- Optimized cross-tab synchronization: prevent echo writes on remote updates that caused cascading updates and exponential slowdowns with many tabs

### Changed

- Storage avoids redundant writes when the handle list is unchanged

## [0.1.4] – 2025-08-14

### Changed

- Block list dialog footer fixed so Import, Export, and Close buttons stay visible

## [0.1.3] – 2025-08-14

### Changed

- Enlarged default dialog UI for better readability

### Fixed

- Expanded export list dialog width
- Exported text now uses real line breaks between handles

## [0.1.2] – 2025-08-08

### Added

- Added `@updateURL` and `@downloadURL` metadata for the userscript
- Documented storage versioning, delegated context menu events, cross-tab synchronization, and JSON import/export

### Changed

- Rewrote README in English and provided Korean translation

## [0.1.1] – 2025-08-08

### Fixed

- Corrected "Tampermonkey" spelling in README

## [0.1.0] – 2025-08-08

### Added

- Refactored entire codebase to a class-based OOP structure
- Separated automatic menu injection into the `MenuEnhancer` class
- Provided export formats (JSON and line-by-line text) for the block list
- Handled import via JSON schema and multiple formats
- Introduced versioned storage key `blockedHandles_v1` and automatic migration from legacy `blockedHandles`
- Added cross-tab synchronization with `GM_addValueChangeListener`
- Normalized handles to lowercase
- Improved dialog with focus trap
- Enhanced performance using MutationObserver and requestAnimationFrame-based debounce

### Changed

- Switched from direct DOM binding to delegated event handling
- Improved list UI to render dynamically

### Deprecated

- Kept the `blockedHandles` key but no longer used internally

### Fixed

- Fixed missed blocking in some comment threads

### Security

- Reduced XSS risk by prioritizing text nodes in dialogs

## [0.0.1] – 2025-07-06

### Added

- Block or unblock comment authors by right-clicking their `@handle`
- Introduced `MutationObserver` for real-time comment blocking
- Block list UI with popup to review or unblock handles
- Export/import block list as newline-separated text
- Added two Tampermonkey menu commands:
  - 🔍 Manage block list
  - 🗑️ Clear block list
- Custom toast notifications and simple dialog interface
