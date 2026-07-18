# AGENTS.md

Repo rules. Short. Concrete.

## Purpose

Align docs, versioning, Git. Change files only for code/rule needs.
Child `AGENTS.md`: keep parent rule to one key sentence; detail stays child.
Substantial child rule/shared workflow change: update relevant parent with concise summary.

## Quick Rules

- Any implementation-rule change must update this file and every affected child `AGENTS.md` in the same patch.

- Work on `dev` unless user says otherwise.
- Update `README.md` first, then `README.ko.md`.
- Update `docs/WIKI.md` first, then `docs/WIKI.ko.md` when behavior/storage changes.
- Update `docs/CHANGELOG.md` first, then `docs/CHANGELOG.ko.md`.
- Apply [DavidAnson/markdownlint](https://github.com/DavidAnson/markdownlint) rules to every `*.md` change, including changelogs, README/WIKI, TODO, and `AGENTS.md` files.
- Review every `*.md` when code changes.
- Do not bump versions unless the user explicitly instructs a version bump.
- Bump `VERSION` or package manifest only when explicitly instructed and shipping user-visible change.
- Use `npm run bump:version -- <MAJOR.MINOR.PATCH>` for mechanical version/docs references.
- Run `npm run bump:version -- <MAJOR.MINOR.PATCH>` for version update, build, commit, and matching tag `vMAJOR.MINOR.PATCH`.
- Check `docs/TODO.md`. Mark done items. Remove old done items when version bumps.
- Source/generated userscript/Tampermonkey rules: see `src/AGENTS.md`.
- Run ESLint via project-local binary, e.g. `.\node_modules\.bin\eslint.cmd .` on Windows.
- Do not git-track local-only ESLint setup files or install outputs unless user asks.
- Keep `git status` clean before PR or commit.
- Request maintainer review for code/changelog changes.
- Commit after each small patch or root-cause fix.
- Do not batch unrelated fixes into one commit.
- Separate docs-only, tests-only, build/tooling, and behavior commits when feasible.
- Keep worktree clean.

## Docs

- Docs language/pairing/structure/changelog: see `docs/AGENTS.md`.

## Git

- Default branch `dev`.
- Do not touch `master`.
- No history rewrite on shared branches.
- Temporary branches OK. Merge back before delivery.
- Use clear branch names: `feature/<slug>`, `fix/<slug>`, `docs/<slug>`.
- Release tags must use `vMAJOR.MINOR.PATCH`, e.g. `v0.6.0`.
- Keep historical and new release tag naming consistent; do not mix `0.6.0` and `v0.6.0`.
- `docs/TODO.md` only changes are exempt from git push requirement.
- Validate with `git status` and `git diff --stat`.

## Changelog

- Follow Keep a Changelog 1.1.0.
- Sections: Added, Changed, Deprecated, Removed, Fixed, Security.
- Keep `Unreleased` at top.
- Use `YYYY-MM-DD`.

## TODO

- When implementation rules change, update relevant child `AGENTS.md` files and keep details consistent.

- Mark `- [x]` when done.
- Remove old done items after version bump.
- Before implementing a TODO item, read its full acceptance details and inspect related code, docs, settings, and existing UI patterns.
- Keep each implementation consistent with neighboring workflows: reuse existing components, terminology, navigation, spacing, controls, defaults, and state handling.
- For UI/UX changes, update every affected entry point and related screen together; preserve responsive behavior, accessibility, loading, empty, error, and disabled states.
- Do not create parallel controls or alternate interaction patterns when an existing project pattern covers the same action.
- Verify the complete user flow across adjacent screens before marking the TODO item done; record only verified work in `Done`.
- TODO code-scope items must state the baseline commit hash used when the TODO was written.

## Reliability

- Check race conditions before behavior changes: concurrent runs, shared state, cross-tab storage order, and async callback ordering.
- Avoid partial writes: keep source/generated/docs/version updates paired, and verify files that must stay in sync.
- Prefer idempotent changes: repeated scripts, migrations, storage updates, and user actions should produce the same final state where practical.

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

- Always commit after a patch.
- Before final commit, run project-local ESLint when available and report result.
- Use Conventional Commits: `<type>(<scope>): <imperative summary>`.
- Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.
- Scope is optional but should stay consistent for repeated areas, e.g. `manager`, `docs`, `build`.
- Commit messages in English.
- Use imperative mood after colon.
- Keep subject under 50 chars when feasible.
- Include body only when why is not obvious.
- Prefer one commit per focused patch.
- Before next patch, commit previous completed patch.

## Precedence

- Direct user instruction wins.
- Then this file.
- Then parent `AGENTS.md`.
