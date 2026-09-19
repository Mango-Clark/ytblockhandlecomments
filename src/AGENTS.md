# Source Rules

- Keep modules focused. Numeric prefixes describe the recommended reading order; runtime order comes from the ES module dependency graph. New split modules may use letter suffixes (for example `12a-...`) when they remain part of the same feature.
- Preserve userscript compatibility and storage/API contracts.
- User-facing text must keep English/Korean translations aligned.
- Edit source under `src/`; run build to regenerate root `ytblockhandlecomments.js`.
- Verify generated userscript output with the project build check.
- Tampermonkey loads the generated root userscript; commit it with source changes.
- Documentation templates live in `src/template/`; generated root README files and `docs/*.md` files carry a build notice and must not be edited directly.

## Behavior And UI

- Behavior changes require focused tests.
- Inspect async, cross-tab, repeated-navigation, and repeated-action behavior where relevant.
- UI/UX changes must update affected TODO verification criteria before implementation.
- Settings/navigation changes must verify entry points, return paths, labels, spacing, destructive-action emphasis, and state preservation.
