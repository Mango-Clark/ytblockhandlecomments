# AGENTS.md

Repo rules. Short. Concrete.

## Purpose

Align docs, versioning, Git. Change files only for code/rule needs.
Child `AGENTS.md`: parent gets one key sentence; details stay child.
Substantial child/shared workflow change: add concise parent summary.

## Quick Rules

- Implementation-rule change: update this file + all affected child `AGENTS.md` same patch.

- Use `dev` unless user says otherwise.
- Update `README.md` first, then `README.ko.md`.
- Behavior/storage change: update `docs/WIKI.md` first, then `docs/WIKI.ko.md`.
- Update `docs/CHANGELOG.md` first, then `docs/CHANGELOG.ko.md`.
- Apply [DavidAnson/markdownlint](https://github.com/DavidAnson/markdownlint) rules to every changed `*.md`, including changelogs, README/WIKI, TODO, and `AGENTS.md` files.
- After every `*.md` change, run `npm run lint:markdown`; sync `.markdownlint.json` and `.markdownlintignore` with project doc rules.
- Review every `*.md` after code changes.
- Never bump versions without explicit user instruction.
- Bump `VERSION` or package manifest only when explicitly instructed + shipping user-visible change.
- For mechanical version/docs references, use `npm run bump:version -- <MAJOR.MINOR.PATCH>`.
- For version update, build, commit, and matching tag `vMAJOR.MINOR.PATCH`, run `npm run bump:version -- <MAJOR.MINOR.PATCH>`.
- Check `docs/TODO.md`. Mark done items. On version bump, remove old done items.
- Source/generated userscript/Tampermonkey rules: see `src/AGENTS.md`.
- Run ESLint via project-local binary, e.g. `.\node_modules\.bin\eslint.cmd .` on Windows.
- Never git-track local-only ESLint setup/install outputs unless requested.
- Before PR/commit, clean `git status`.
- Request maintainer review for code/changelog changes.
- Commit each small patch/root-cause fix.
- Never batch unrelated fixes.
- Separate docs-only, tests-only, build/tooling, behavior commits when feasible.
- Keep worktree clean.

## Docs

- Docs language/pairing/structure/changelog/todo: see `docs/AGENTS.md`.

## Git

- Default branch `dev`.
- Never touch `master`.
- No shared-branch history rewrite.
- Temporary branches OK. Merge back before delivery.
- Clear branch names: `feature/<slug>`, `fix/<slug>`, `docs/<slug>`.
- Release tags: `vMAJOR.MINOR.PATCH`, e.g. `v0.6.0`.
- Keep release tag naming consistent; never mix `0.6.0` and `v0.6.0`.
- `docs/TODO.md`-only changes exempt from git push requirement.
- Validate with `git status` and `git diff --stat`.

## Changelog

- Follow Keep a Changelog 1.1.0.
- Sections: Added, Changed, Deprecated, Removed, Fixed, Security.
- Keep `Unreleased` first.
- Use `YYYY-MM-DD`.

## TODO

- Implementation-rule change: update relevant child `AGENTS.md`; keep details consistent.

- Mark done: `- [x]`.
- After version bump, remove old done items.
- Before TODO implementation, read full acceptance details; inspect related code, docs, settings, existing UI patterns.
- Match neighboring workflows: reuse components, terminology, navigation, spacing, controls, defaults, state handling.
- UI/UX changes: update all affected entry points/screens together; preserve responsive behavior, accessibility, loading, empty, error, disabled states.
- Never add parallel controls/alternate interactions when existing project pattern covers same action.
- Before marking done, verify full flow across adjacent screens; record only verified work in `Done`.
- TODO code-scope items must include baseline commit hash used when written.

## Reliability

- Before behavior changes, check races: concurrent runs, shared state, cross-tab storage order, async callback ordering.
- Avoid partial writes: pair source/generated/docs/version updates; verify synced files.
- Prefer idempotence: repeated scripts, migrations, storage updates, user actions produce same final state where practical.

## Audit And Autofix

- Zero changes valid.
- Never change file solely for autofix.
- Edit only concrete `path:line` bugs.

Allowed:

- Security bug.
- Perf bug causing real freeze/hot-path slowdown.
- QOL/correctness bug causing broken behavior.

Disallowed:

- Style-only change.
- Broad refactor.
- Speculative improvement.
- Dependency add without clear need.

Patch rule:

- One root cause per patch.
- Smallest diff.
- Run relevant tests/lint.
- Unsure: report finding. Never edit.

## Commit

- Always commit after patch.
- Before final commit, run project-local ESLint when available; report result.
- Use Conventional Commits: `<type>(<scope>): <imperative summary>`.
- Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.
- Scope optional; keep consistent for repeated areas, e.g. `manager`, `docs`, `build`.
- English commit messages.
- Imperative mood after colon.
- Subject under 50 chars when feasible.
- Body only when why unclear.
- Prefer one commit per focused patch.
- Commit completed patch before next.

## Precedence

- Direct user instruction wins.
- Then this file.
- Then parent `AGENTS.md`.
