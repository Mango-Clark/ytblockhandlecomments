# Changelog

[English](CHANGELOG.md) | [한국어](변경사항.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
## [0.2.3] – 2025-08-17

### Fixed
- Apply blocks/unblocks in real time without page refresh by re-evaluating existing comment nodes on refresh and removing the cache guard that prevented updates.
