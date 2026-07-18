# Docs Rules

- Implementation-rule changes update root and affected child `AGENTS.md` together.

## Common

- English first; Korean pair immediately after.
- Keep paired structure, terminology, links, commands, dates, versions aligned.
- Preserve code blocks, inline code, paths, commands, dates, versions exactly.
- Keep paired section order identical.
- Do not add extra locales unless the user asks.
- Update the English document before its Korean pair.
- Major category/shared workflow change: update parent `AGENTS.md` with concise summary.

## README

- Update `README.md` before `README.ko.md`.
- Feature descriptions must match implementation; do not claim incomplete workflows.

## WIKI

- Update `WIKI.md` before `WIKI.ko.md` when behavior or storage changes.
- Document user behavior, storage effects, config constraints.
- Keep reference-only implementation details out of README.

## Changelog

- Update `CHANGELOG.md` before `CHANGELOG.ko.md`.
- Follow Keep a Changelog sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`.
- Keep `Unreleased` at the top and use `YYYY-MM-DD` dates.
- Record user-visible changes; omit routine formatting/internal-only edits.

## TODO

- `TODO.md` is planning-only; do not auto-commit TODO-only changes.
- Keep exactly these sections in this order: `P0 — Critical`, `P1 — High`, `P2 — Normal`, `P3 — Low`, `Blocked`, `Backlog`, and `Done`.
- Use `- [ ]` for open work and `- [x]` only for completed work in `Done`.
- One concise, actionable task per top-level item; nested bullets only for acceptance details.
- When a TODO item has code scope, record the baseline commit hash used when the TODO was written.
- Every top-level TODO item must place that hash in an indented `(0)` detail directly below its title, formatted as a backticked full commit hash.
- Use the current `HEAD` hash when creating or revising TODO items; update each affected `(0)` detail when the baseline changes.
- Prefix top-level items with per-section IDs in order: `(A)`, `(B)`, ..., then `(AA)`, `(AB)`, `(AC)`, ... , `(BA)`, ...; restart IDs in each priority/status section, so different sections may reuse the same ID.
- Prefix nested acceptance details with numeric IDs in order: `(1)`, `(2)`, `(3)`, ...; restart numbering under each top-level item.
- Do not add assignees or deadlines.
- Preserve existing meaning; merge duplicates/same-outcome items only.
- Classify `P0` as execution blockers, data loss, security issues, or critical bugs.
- Classify `P1` as core functionality, blocking dependencies, or required fixes.
- Classify `P2` as normal features and important improvements that are not urgent.
- Classify `P3` as refactoring, optimization, documentation, or convenience work.
- Unexecutable work: `Blocked` + indented `- Blocked by: reason`.
- Put ideas whose priority or implementation is not yet clear in `Backlog`.
- Move to `Done` only after implementation and relevant verification.
- Order items from highest urgency to lowest within each priority section.
- On TODO edit, verify no duplicates, missing sections, owners, or deadlines.
