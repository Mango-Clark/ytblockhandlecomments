# AGENTS.md

Instructions for OpenAI Codex agent in this repo.

## Purpose

Keep docs, versioning, Git workflows consistent. All contributors follow rules when editing
or adding files.

## Quick Checklist

- Branch: work on `dev` (unless told otherwise).
- Code updates: review/update all `*.md` so docs stay synced with current code.
- Docs: update `README.md` first, then `README.ko.md`.
- Wiki: update `WIKI.md` first, then `WIKI.ko.md` when behavior/storage details change.
- Plans: update implementation/planning docs under `docs/` when roadmap/design changes.
- Changelog: update `CHANGELOG.md` (Keep a Changelog), then `CHANGELOG.ko.md`.
- Version: bump `VERSION` or package manifest when shipping behavior changes.
- TODO: review `TODO.md`, update checkboxes, add needed items, erase items done in prior
  verion.
- Validation: ensure `git status` is clean before committing or opening a PR.
- Review: request maintainer review for code or changelog changes.

## Documentation Workflow

1) All Markdown files

   - On code changes, review every repo `*.md`.
   - Update Markdown that must align with behavior, UI, storage, limits, plans, workflows.

2) README

   - Write `README.md` in English (overview, install, usage, examples, limitations).
   - Translate to Korean as `README.ko.md` after English final.

3) WIKI

   - Keep `WIKI.md` aligned with current implementation details.
   - Update `WIKI.ko.md` right after English wiki final.
   - Use wiki for storage, matching, troubleshooting, limitation details.

4) Planning Docs

   - Keep design/planning docs under `docs/` aligned with current intent.
   - Example files: `docs/기획서.md`, `docs/performance-analysis.md`.
   - Planning docs may describe future work; clearly separate implemented vs planned behavior.

5) Changelog

   - Edit `CHANGELOG.md` in English following Keep a Changelog 1.1.0.
   - Maintain sections: Added, Changed, Deprecated, Removed, Fixed, Security.
   - Keep `Unreleased` at top; move entries under new version on release.
   - Date format: `YYYY-MM-DD`.
   - Translate matching changes into `CHANGELOG.ko.md`.

6) TODO

   - Review `TODO.md` for pending items.
   - Mark completed items with `- [x]` and add new tasks as needed.
   - Erase completed `- [x]` items from previous version only when version bumped. Example:
     if bumped version is `0.2.0-pre2` or `0.2.0`, erase until `0.1.x`.

7) File Structure Example

   ```text
   ├── README.md                   # English overview and usage
   ├── README.ko.md                # Korean translation of README
   ├── WIKI.md                     # English detailed reference
   ├── WIKI.ko.md                  # Korean detailed reference
   ├── CHANGELOG.md                # English changelog
   ├── CHANGELOG.ko.md             # Korean changelog
   ├── TODO.md                     # Task list
   ├── AGENTS.md                   # Agent instructions
   └── credentials/
       └── YouTube Data API v3.txt # Local reference notes, not shipped credentials
   ```

## Translation Guidelines

- Translate meaning faithfully into Korean; clarity over literal wording.
- Keep standard technical terms in English (e.g., merge, rebase, tag).
- Do not translate code identifiers, CLI flags, API names, or file paths.
- Preserve code blocks, inline code, examples exactly as in English docs.
- Keep dates, version numbers, formatting consistent with English originals.
- Use same section order/headings across languages.

### Translation Sync and Order

- Always update English doc first.
- Update Korean translation immediately after English changes.
- Do not add additional locales without explicit instructions.

Order:

1. English -> Korean
2. English -> Others (if instructed)

### Naming Conventions

- English files: `README.md`, `CHANGELOG.md`.
- Korean files: `README.ko.md`, `CHANGELOG.ko.md`.
- Additional locales: use ISO codes (e.g., `README.ja.md`, `README.fr.md`).

## Git Workflow

- Default branch: use `dev` unless otherwise specified.
- Temporary branches are allowed; merge them back before delivery.
- Recommended branch names: `feature/<slug>`, `fix/<slug>`, `docs/<slug>`.
- Do not push to or modify `master`.
- Do not rewrite published history on shared branches (no force-push for public commits).
- Commit only with clean worktree. Validate with `git status`.

### Pre-Commit Validation

- Ensure only intended files changed: review `git diff --stat`.
- Verify English and Korean docs are in sync for any changed sections.
- Update version and changelog together when releasing user-visible changes.

## Change Approval

- Documentation-only changes: one review is sufficient.
- Code or changelog changes: require maintainer approval.

## Audit and Autofix

- Zero changes is valid.
- Do not create changes only to satisfy autofix.
- Edit only for concrete `path:line` bugs.

### Finding Threshold

Allowed:

- Security bug.
- Perf bug with realistic hot path or freeze.
- QOL/correctness bug with broken behavior.

Disallowed:

- Style-only change.
- Broad refactor.
- Speculative improvement.
- Dependency addition without clear need.

### Patch Rule

- One root cause per patch.
- Smallest diff.
- Run relevant tests/lint.
- If uncertain, report finding instead of editing.

## Versioning and Changelog

- Use Semantic Versioning (SemVer) for releases.
- Bump version in `VERSION` or package manifest when releasing changes.
- Do not bump version without instructions.
- Maintain `CHANGELOG.md` with Keep a Changelog format and section names.
- Each release entry must include a version and date (e.g., `## [1.2.3] - 2025-08-17`).

## Contribution Guidelines

- Commit messages: English, imperative mood (e.g., "Add feature X").
- Subject line: concise (≤ 72 chars). Wrap body at ≤ 100 chars per line.
- Keep commits small and focused.
- Include documentation updates in the same commit as related code changes.

## Documentation Quality

- Prefer concise active voice.
- Use Markdown best practices: headings, code fences, and lists.
- Keep line length under 100 characters for readability.

## Scope and Precedence

- Follow the most specific and recent instruction.
- Precedence: direct user instructions > nested `AGENTS.md` > parent `AGENTS.md`.
