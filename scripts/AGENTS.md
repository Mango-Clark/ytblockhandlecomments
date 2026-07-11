# Script Rules

- Scripts: deterministic, rerunnable, worktree-safe.
- Preserve exact version/docs/generated-file behavior.
- `npm run bump:version -- <MAJOR.MINOR.PATCH>` requires a clean worktree and performs version update, build, commit, and `vMAJOR.MINOR.PATCH` tag creation.
- Do not bypass the bump command's clean-worktree, duplicate-tag, or explicit file-staging safeguards.
- Script behavior change: update/add focused tests; run test + typecheck.
- Do not track generated output or local tool state.
