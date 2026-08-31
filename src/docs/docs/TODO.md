# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

## P3 — Low

## Blocked

## Backlog

## Done

- [x] (A) Preserve block-list manager view state across adjacent dialogs

  - (0) `ff965fd8508dfd1115c06a09c9d0a0fae0d00d72`
  - (1) Restore search, type and tag filters, valid selections, and scroll position when returning to the manager in the same page session.
  - (2) Prune selections for rules removed locally or by another tab.
  - (3) Add one control that resets all active filters without clearing the current selection.
  - (4) Verify navigation restoration, stale-selection pruning, filter reset, responsive layout, and English/Korean labels.

- [x] (B) Improve logging correctness, controls, and storage reliability

  - (0) `7fc5aca579c2c0c12e0b0506c8b78c86d3d081d3`
  - (1) Correct ISO week-year and IANA timezone calendar-derived timestamp fields with boundary tests.
  - (2) Group logging controls by output, detail, console formatting, and saved-log management while preserving responsive behavior.
  - (3) Show saved entry count, last-entry state, console preview, and a test-output action; disable empty saved-log actions.
  - (4) Align English/Korean explanations with V0/V1 behavior, supported timestamp tokens, recorded event scope, and UTC downloads.
  - (5) Trim saved entries immediately when retention decreases and reduce repeated full-array writes without delaying visible logs.
  - (6) Merge concurrent cross-tab log additions deterministically without reviving entries after an explicit clear.

- [x] (C) Limit live log updates to logging status controls

  - (0) `5836c2f30a3d87574ff0cd419f4505acceae9135`
  - (1) Preserve unsaved settings input while new local or remote logs arrive.
  - (2) Refresh only saved-log status, console preview, and logging action availability.
  - (3) Unsubscribe when the settings dialog closes and avoid refreshing unrelated dialogs.

- [x] (D) Align diagnostic credential redaction with documentation

  - (0) `10aee389949c4457d031bd9e1117df5d235d0753`
  - (1) Redact recognizable JWT, Google API key, and credential-shaped string values under generic fields.
  - (2) Keep ordinary diagnostic strings while continuing to omit fields whose names identify sensitive data.
  - (3) Describe field-name and value-shape redaction accurately in the English and Korean documentation.

- [x] (E) Stabilize legacy log migration across storage listeners

  - (0) `7510f825f47e7c346126aacbdae2051c896a9261`
  - (1) Generate bounded deterministic IDs before legacy entries are written as version 2 state.
  - (2) Prevent long legacy messages from becoming duplicate entries after reload and stale-state merge.
  - (3) Verify real listener ordering, two-writer convergence, and stale additions after clear.

- [x] (F) Canonicalize legacy log IDs across trimmed snapshots

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Remove absolute array positions from legacy content fingerprints.
  - (2) Canonicalize legacy-writer entries already stored as version 2 and distinguish identical occurrences within a snapshot.
  - (3) Verify overlapping legacy snapshots and stale old-tab writes converge without duplicate entries.

- [x] (G) Notify logging status after asynchronous save rollback

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Notify active logging-status subscribers when a failed batched write restores persisted state.
  - (2) Verify optimistic saved-entry status returns to the actual stored count after `GM_setValue` rejection.

- [x] (H) Document scoped live logging status refresh

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Explain in the English WIKI that live log changes update only the logging status controls.
  - (2) Add the matching Korean explanation and keep generated documentation synchronized.

- [x] (I) Optimize the Tampermonkey runtime for high-load pages

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Batch comment mutations per animation frame and release pending observer, timer, and DOM references on navigation or close.
  - (2) Defer offscreen comment work until intersection while preserving visible-comment updates and observer fallback behavior.
  - (3) Cache hot-path matching configuration and reuse block-list data, search, pair-status, and regex computations.
  - (4) Prevent duplicate bootstrap, styles, global listeners, and toast timers; bound long-lived lookup caches.
  - (5) Verify deterministic operation counts with 1,000 rules and 500 comments while preserving all existing features.
