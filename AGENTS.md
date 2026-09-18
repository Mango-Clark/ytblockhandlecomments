# AGENTS.md

Repo rules. Short. Concrete.

## Purpose

Keep development correct, stable, reviewable, and token-efficient.
Rules apply hierarchically: root, then the nearest affected child `AGENTS.md`.
Direct user instruction has highest precedence.

## Core Rules

- Default branch: `dev`. Never modify `master` directly.
- Preserve existing user changes; never discard unrelated work.
- One root cause per patch. Keep diffs minimal and focused.
- Do not batch unrelated fixes.
- Prefer existing project patterns over parallel implementations.
- If unsure whether a change is correct, report the finding; do not edit speculatively.
- Rule changes must update every affected `AGENTS.md` in the same patch.

## Validation

- Run focused validation while developing.
- Before delivery of any non-TODO patch, run full `npm run verify`.
- `npm run verify` must include code lint, Markdown lint, typecheck, tests, build, and generated-output verification.
- Keep component checks independently runnable.
- A failed required check blocks completion unless the user explicitly overrides it.

## Review

- Code or changelog changes require independent subagent review before completion.
- Review must inspect correctness, regressions, edge cases, unintended scope, and rule compliance.
- If subagent review is unavailable or does not pass, do not mark the work complete.
- Fix review findings, then rerun affected validation and final `npm run verify`.

## Changelog And Docs

- Record technical changes in the changelog, including internal/non-visible changes.
- Routine text-only TODO edits do not require changelog entries.
- For behavior or user-visible changes, review and update affected user documentation.
- Do not review or rewrite unrelated docs for internal-only changes.
- Documentation-specific rules live in `docs/AGENTS.md`.

## Reliability

- Before behavior changes, check concurrency, shared state, cross-tab ordering, async callback ordering, and repeated navigation where relevant.
- Avoid partial writes; keep source, generated output, docs, and metadata consistent.
- Prefer idempotent behavior for scripts, migrations, storage updates, and repeated user actions.

## Git

- Use Conventional Commits: `<type>(<scope>): <imperative summary>`.
- Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.
- English commit messages; scope optional; subject under 50 characters when feasible.
- Separate docs-only, tests-only, build/tooling, and behavior changes when feasible.
- Before commit, ensure only intended changes are included.
- Commit every completed non-TODO-only patch.
- Do not auto-commit `src/docs/docs/TODO.md`-only changes.
- After commit, verify the worktree is clean unless intentionally left with TODO-only changes.
- Do not push unless the user explicitly requests it.
- Do not rewrite shared-branch history.
- Temporary branches are allowed; merge them back before delivery.
- Branch names: `feature/<slug>`, `fix/<slug>`, `docs/<slug>`.

## Version And Release

- Never bump versions without explicit user instruction.
- Use `npm run bump:version -- <MAJOR.MINOR.PATCH>` for version/release updates.
- The release command is the canonical workflow for version files, generated output, commit, `vMAJOR.MINOR.PATCH` tag, and push.
- Do not manually bypass release-script safeguards.

## Audit And Autofix

- Zero changes is a valid result.
- Edit only concrete bugs or required rule/project changes.
- Allowed autofix targets: security bugs, real performance faults, correctness/QOL bugs.
- Disallowed without explicit request: style-only changes, broad refactors, speculative improvements, unnecessary dependencies.
