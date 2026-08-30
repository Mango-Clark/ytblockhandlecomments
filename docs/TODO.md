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
