# Source Rules

- Implementation-rule changes update root and this child `AGENTS.md` together; source detail stays here.

- Keep modules focused; preserve numeric load order.
- Preserve userscript compatibility and storage/API contracts.
- User-facing text: keep English/Korean translations aligned.
- Edit `src/`; run `npm run build`; verify root `ytblockhandlecomments.js` with `npm run check:build`.
- Tampermonkey loads generated root `ytblockhandlecomments.js`; commit it with changed `src/` files.
- Behavior change: update tests; inspect async, cross-tab, repeated-navigation behavior.
- UI/UX change: add or update a TODO item with affected view and verification criteria before implementation.
- Settings/navigation changes: verify tab entry points, return paths, labels, spacing, destructive-action emphasis, and state preservation.
