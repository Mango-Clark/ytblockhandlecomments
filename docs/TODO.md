<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

## P3 — Low

## Blocked

## Backlog

## Done

- [x] (A) Separate UCID pairing directions and lookup policies; simplify settings and redundant checks.
  - (0) Baseline: `388ab9082aac239f22156a8a73c3db1ae761d556`.
  - (1) Create handle-to-UCID pairs; update handles from stable UCIDs; preserve blocking on lookup or persistence failure.
  - (2) Configure creation, updates, and immediate pairing independently; preserve low-mode and refresh behavior.
  - (3) Provide settings section navigation, separate settings from list operations, and preserve input/list state on return.
  - (4) Migrate UCID fields and synchronization metadata idempotently; preserve revisions, deletions, and unrelated changes.
  - (5) Remove obsolete pairing checks and only proven redundant checks elsewhere; retain state and boundary protection.
  - (6) Update paired docs and generated output; run static checks/build and independent review. Do not execute tests or `npm run verify`.
  - (7) Lint, Markdown lint, typecheck, build, generated-output check, and independent review passed. Tests and full verify were not run by user instruction.
