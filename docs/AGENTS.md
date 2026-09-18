# Docs Rules

Generated user docs are built from `src/docs/` templates via `npm run build`.
Edit templates only; `docs/AGENTS.md` is direct-managed.

## Common

- English first; update the Korean pair immediately after.
- Keep paired structure, terminology, links, commands, dates, and versions aligned.
- Preserve code blocks, inline code, paths, commands, dates, and versions exactly.
- Keep paired section order identical.
- Follow DavidAnson/markdownlint rules.
- Do not add locales unless requested.

## README

- Edit `src/docs/README.md`, then `src/docs/README.ko.md`, then build.
- Feature descriptions must match implemented behavior.

## WIKI

- For behavior/storage changes, edit `src/docs/docs/WIKI.md`, then the Korean pair, then build.
- Document user behavior, storage effects, and configuration constraints.
- Keep implementation-only reference details out of README.

## Changelog

- Edit `src/docs/docs/CHANGELOG.md`, then the Korean pair, then build.
- Record technical changes, including internal implementation, build/tooling, storage, test-affecting, and non-visible behavior changes.
- Omit only changes with no meaningful technical effect, such as pure formatting or wording cleanup.
- Follow Keep a Changelog 1.1.0 sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Keep `Unreleased` first. Use `YYYY-MM-DD`.

## TODO

- `src/docs/docs/TODO.md` is planning-only; never auto-commit TODO-only changes.
- Keep exactly these ordered sections: `P0 — Critical`, `P1 — High`, `P2 — Normal`, `P3 — Low`, `Blocked`, `Backlog`, `Done`.
- Use `- [ ]` for open work and `- [x]` only in `Done`.
- One concise actionable task per top-level item; nested bullets only for acceptance details.
- Every code-scope top-level item must include an indented `(0)` detail with the full baseline commit hash.
- Use current `HEAD` when creating or materially revising a TODO item.
- Prefix top-level items sequentially per section: `(A)`, `(B)`, ... `(Z)`, `(AA)`, ... .
- Prefix acceptance details `(1)`, `(2)`, ... and restart per item.
- Do not add assignees or deadlines.
- Merge duplicate/same-outcome items without changing intent.
- `P0`: blockers, data loss, security, critical bugs.
- `P1`: core functionality, blocking dependencies, required fixes.
- `P2`: normal features and important non-urgent improvements.
- `P3`: refactoring, optimization, documentation, convenience work.
- Put currently unexecutable work in `Blocked` with `- Blocked by: reason`.
- Put unclear-priority ideas in `Backlog`.
- Move work to `Done` only after implementation and relevant verification.
- Keep each priority section ordered highest-to-lowest urgency.
