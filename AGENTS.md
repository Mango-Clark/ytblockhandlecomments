# AGENTS.md

This file contains instructions for the OpenAI Codex agent. Follow these rules when
working in this repository.

## Purpose

Define documentation, versioning, and Git workflows to keep the repository consistent.
All contributors (human or agent) must follow these rules when editing or adding files.

## Quick Checklist

- Branch: work on `dev` (unless told otherwise).
- Docs: update `README.md` first, then `README.ko.md`.
- Changelog: update `CHANGELOG.md` (Keep a Changelog), then `CHANGELOG.ko.md`.
- Version: bump in `VERSION` or package manifest when behavior changes are shipped.
- TODO: review `TODO.md`, update checkboxes, add items if needed.
- Validation: ensure `git status` is clean before committing or opening a PR.
- Review: request maintainer review for code or changelog changes.

## Documentation Workflow

1) README
- Write `README.md` in English (overview, install, usage, examples, limitations).
- Translate to Korean as `README.ko.md` after the English version is finalized.

2) Changelog
- Edit `CHANGELOG.md` in English following Keep a Changelog 1.1.0.
- Maintain sections: Added, Changed, Deprecated, Removed, Fixed, Security.
- Keep an `Unreleased` section at the top; move entries under a new version on release.
- Date format: `YYYY-MM-DD`.
- Translate corresponding changes into `CHANGELOG.ko.md`.

3) TODO
- Review `TODO.md` for pending items.
- Mark completed items with `- [x]` and add new tasks as needed.

4) File Structure Example

```text
├── README.md          # English documentation
├── README.ko.md       # Korean translation of README
├── CHANGELOG.md       # English changelog
├── CHANGELOG.ko.md    # Korean translation of changelog
├── TODO.md            # Task list
└── AGENTS.md          # Agent instructions
```

## Translation Guidelines

- Translate meaning faithfully into Korean; prefer clarity over literal phrasing.
- Keep technical terms in English when they are standard (e.g., merge, rebase, tag).
- Do not translate code identifiers, CLI flags, API names, or file paths.
- Preserve code blocks, inline code, and examples exactly as in English docs.
- Keep dates, version numbers, and formatting consistent with English originals.
- Apply the same section order and headings between languages.

### Translation Sync and Order

- Always update the English document first.
- Update the Korean translation immediately after English changes.
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
- Commit only when the worktree is clean. Validate with `git status`.

### Pre-Commit Validation

- Ensure only intended files are changed: review `git diff --stat`.
- Verify English and Korean docs are in sync for any changed sections.
- Update version and changelog together when releasing user-visible changes.

## Change Approval

- Documentation-only changes: one review is sufficient.
- Code or changelog changes: require maintainer approval.

## Versioning and Changelog

- Use Semantic Versioning (SemVer) for releases.
- Bump the version in `VERSION` or the package manifest when releasing changes.
- Maintain `CHANGELOG.md` using Keep a Changelog format and section names.
- Each release entry must include a version and date (e.g., `## [1.2.3] - 2025-08-17`).

## Contribution Guidelines

- Commit messages: English, imperative mood (e.g., "Add feature X").
- Subject line: concise (≤ 72 chars). Wrap body at ≤ 100 chars per line.
- Keep commits small and focused.
- Include documentation updates in the same commit as related code changes.

## Documentation Quality

- Prefer concise sentences in active voice.
- Use Markdown best practices: headings, code fences, and lists.
- Keep line length under 100 characters for readability.

## Scope and Precedence

- Follow the most specific and recent instruction.
- Precedence: direct user instructions > nested `AGENTS.md` > parent `AGENTS.md`.

