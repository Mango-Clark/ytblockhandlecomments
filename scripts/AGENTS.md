# Script Rules

- Implementation-rule changes: update root + child `AGENTS.md` together; script detail stays here.
- Scripts: deterministic, rerunnable, worktree-safe.
- Preserve exact version/docs/generated-file behavior.
- `npm run bump:version -- <MAJOR.MINOR.PATCH>` requires clean worktree; updates version, builds, commits, creates `vMAJOR.MINOR.PATCH` tag.
- Never bypass bump command clean-worktree, duplicate-tag, or explicit file-staging safeguards.
- Script behavior change: update/add focused tests; run test + typecheck.
- Never track generated output or local tool state.
