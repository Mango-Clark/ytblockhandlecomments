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
