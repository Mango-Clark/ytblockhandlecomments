# Docs Rules

- Implementation-rule changes: update root + affected child `AGENTS.md` together.

## Common

- English first; Korean pair immediately after.
- Align paired structure, terminology, links, commands, dates, versions.
- Preserve code blocks, inline code, paths, commands, dates, versions exactly.
- Keep paired section order identical.
- Apply [DavidAnson/markdownlint](https://github.com/DavidAnson/markdownlint) rules.
- No extra locales unless requested.
- Update English doc before Korean pair.
- Major category/shared workflow change: add concise summary to parent `AGENTS.md`.

## README

- Update `README.md` before `README.ko.md`.
- Feature descriptions match implementation; never claim incomplete workflows.

## WIKI

- Update `WIKI.md` before `WIKI.ko.md` for behavior/storage changes.
- Document user behavior, storage effects, config constraints.
- Exclude reference-only implementation details from README.

## Changelog

- Update `CHANGELOG.md` before `CHANGELOG.ko.md`.
- Use Keep a Changelog sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`.
- Keep `Unreleased` top; use `YYYY-MM-DD` dates.
- Record user-visible changes; omit routine formatting/internal-only edits.

## TODO

- `TODO.md` planning-only; never auto-commit TODO-only changes.
- Run `npm run lint:markdown` after every Markdown change, including `TODO.md`, changelogs, README/WIKI, and every `AGENTS.md` file.
- Keep exactly these ordered sections: `P0 — Critical`, `P1 — High`, `P2 — Normal`, `P3 — Low`, `Blocked`, `Backlog`, and `Done`.
- Use `- [ ]` for open work; `- [x]` only for completed work in `Done`.
- One concise actionable task per top-level item; nested bullets only for acceptance details.
- TODO item with code scope: record baseline commit hash used when written.
- Every top-level TODO item: indented `(0)` detail directly below title, containing backticked full commit hash.
- Use current `HEAD` hash when creating/revising TODO items; update affected `(0)` when baseline changes.
- Prefix top-level items per section sequentially: `(A)`, `(B)`, ..., `(Z)` then `(AA)`, `(AB)`, `(AC)`, ... , `(BA)`, ...; restart each priority/status section; IDs may repeat across sections.
- Prefix nested acceptance details sequentially: `(1)`, `(2)`, `(3)`, ...; restart per top-level item.
- Format TODO item: checkbox title, blank line, indented detail bullets; `(0)` baseline commit, `(1)` onward acceptance details; all detail bullets indented under title.
- Example:

  ```md
  - [x] (A) README `Features` 가독성 개선

    - (0) `4f619727a1f20661d20683d1af6f2ce8c1b079c7`
    - (1) 기능을 사용자 관점의 주제별 그룹으로 재구성
    - (2) 긴 단일 bullet을 짧고 스캔 가능한 설명으로 정리
    - (3) `README.md`와 `README.ko.md` 구조·기능 항목 동기화
  ```

- Do not add assignees or deadlines.
- Preserve existing meaning; merge duplicates/same-outcome items only.
- Classify `P0` as execution blockers, data loss, security issues, or critical bugs.
- Classify `P1` as core functionality, blocking dependencies, or required fixes.
- Classify `P2` as normal features and important improvements that are not urgent.
- Classify `P3` as refactoring, optimization, documentation, or convenience work.
- Unexecutable work: `Blocked` + indented `- Blocked by: reason`.
- Put ideas whose priority or implementation is not yet clear in `Backlog`.
- Move to `Done` only after implementation + relevant verification.
- Order each priority section highest-to-lowest urgency.
- On TODO edit, verify no duplicates, missing sections, owners, or deadlines.
