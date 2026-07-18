# Source Rules

- Implementation-rule changes: update root + child `AGENTS.md`; source detail here.
- Focus modules; preserve numeric load order.
- Preserve userscript compatibility + storage/API contracts.
- User-facing text: align English/Korean translations.
- Edit `src/`; run `npm run build`; verify root `ytblockhandlecomments.js` with `npm run check:build`.
- Tampermonkey loads generated root `ytblockhandlecomments.js`; commit with changed `src/` files.
- Behavior change: update tests; inspect async, cross-tab, repeated-navigation behavior.
- UI/UX change: before implementation, add/update TODO with affected view + verification criteria.
- Settings/navigation changes: verify tab entry points, return paths, labels, spacing, destructive-action emphasis, state preservation.
