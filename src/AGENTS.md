# Source Rules

- Keep modules focused; preserve numeric load order.
- Preserve userscript compatibility and storage/API contracts.
- User-facing text: keep English/Korean translations aligned.
- Edit `src/`; run `npm run build`; verify root `ytblockhandlecomments.js` with `npm run check:build`.
- Tampermonkey loads generated root `ytblockhandlecomments.js`; commit it with changed `src/` files.
- Behavior change: update tests; inspect async, cross-tab, repeated-navigation behavior.
