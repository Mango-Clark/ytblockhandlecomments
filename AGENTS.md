# AGENTS.md

Codex rules for this repo. Short. Concrete.

## Purpose

Keep docs, versioning, Git workflow aligned. Change files only when code or repo rules need it.

## Quick Rules

- Work on `dev` unless user says else.
- Update `README.md` first, then `README.ko.md`.
- Update `docs/WIKI.md` first, then `docs/WIKI.ko.md` when behavior/storage changes.
- Update `docs/CHANGELOG.md` first, then `docs/CHANGELOG.ko.md`.
- Review every `*.md` when code changes.
- Bump `VERSION` or package manifest only when shipping user-visible change.
- Check `docs/TODO.md`. Mark done items. Remove old done items when version bumps.
- Edit userscript source in `src/`, then run `npm run build`.
- Keep root `ytblockhandlecomments.js` in sync with `npm run check:build`.
- Tampermonkey loads only root `ytblockhandlecomments.js`, not `src/`.
- Commit changed `src/` files together with rebuilt `ytblockhandlecomments.js`.
- Keep `git status` clean before PR or commit.
- Request maintainer review for code or changelog changes.
- Commit after each small patch or root-cause fix.
- Do not batch unrelated fixes into one commit.
- Commit docs-only, tests-only, build/tooling, and behavior changes separately when feasible.
- Keep worktree clean.

## Docs

- English first. Korean right after.
- Keep code blocks, inline code, paths, commands, dates, versions exact.
- Keep section order same across languages.
- Do not add extra locales unless asked.

## Git

- Default branch `dev`.
- Do not touch `master`.
- No history rewrite on shared branches.
- Temporary branches OK. Merge back before delivery.
- Use clear branch names: `feature/<slug>`, `fix/<slug>`, `docs/<slug>`.
- Release tags must use `vMAJOR.MINOR.PATCH`, e.g. `v0.6.0`.
- Keep historical and new release tag naming consistent; do not mix `0.6.0` and `v0.6.0`.
- Validate with `git status` and `git diff --stat`.

## Changelog

- Follow Keep a Changelog 1.1.0.
- Sections: Added, Changed, Deprecated, Removed, Fixed, Security.
- Keep `Unreleased` at top.
- Use `YYYY-MM-DD`.

## TODO

- Mark `- [x]` when done.
- Remove old done items after version bump.

## Audit And Autofix

- Zero changes valid.
- Do not change file just to satisfy autofix.
- Edit only concrete `path:line` bugs.

Allowed:

- Security bug.
- Perf bug with real freeze or hot-path slowdown.
- QOL/correctness bug with broken behavior.

Disallowed:

- Style-only change.
- Broad refactor.
- Speculative improvement.
- Dependency add without clear need.

Patch rule:

- One root cause per patch.
- Smallest diff.
- Run relevant tests/lint.
- If unsure, report finding. Do not edit.

## Commit

- Use Conventional Commits: `<type>(<scope>): <imperative summary>`.
- Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.
- Scope is optional but should be consistent for repeated areas, e.g. `manager`, `docs`, `build`.
- Commit messages in English.
- Use imperative mood after the colon.
- Keep subject under 50 chars when feasible.
- Include body only when why is not obvious.
- Prefer one commit per focused patch.
- Before starting the next patch, commit the previous completed patch.

## Precedence

- Direct user instruction wins.
- Then this file.
- Then parent `AGENTS.md`.
