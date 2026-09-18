# Source Rules

- Keep modules focused and preserve numeric load order.
- Preserve userscript compatibility and storage/API contracts.
- User-facing text must keep English/Korean translations aligned.
- Edit source under `src/`; run build to regenerate root `ytblockhandlecomments.js`.
- Verify generated userscript output with the project build check.
- Tampermonkey loads the generated root userscript; commit it with source changes.
- Documentation templates live in `src/docs/`; never directly edit generated root README files or generated `docs/*.md` user docs.

## Behavior And UI

- Behavior changes require focused tests.
- Inspect async, cross-tab, repeated-navigation, and repeated-action behavior where relevant.
- UI/UX changes must update affected TODO verification criteria before implementation.
- Settings/navigation changes must verify entry points, return paths, labels, spacing, destructive-action emphasis, and state preservation.
