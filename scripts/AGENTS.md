# Script Rules

- Scripts must be deterministic, rerunnable, and worktree-safe.
- Preserve exact version, docs, and generated-file behavior.
- Script behavior changes require focused tests and relevant typecheck.
- Never track local tool state or unintended generated artifacts.

## Release Script

- `npm run bump:version -- <MAJOR.MINOR.PATCH>` requires a clean worktree.
- It is the canonical release workflow and updates versioned files, generated output, commit, and `vMAJOR.MINOR.PATCH` tag, then pushes the release result.
- Never bypass clean-worktree, duplicate-tag, staging, or release safety checks.
