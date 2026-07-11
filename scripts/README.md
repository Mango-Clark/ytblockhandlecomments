# Scripts

Repository maintenance scripts for building the userscript and releasing a new version.

## Files

- `build-userscript.ts`: bundles `src/14-bootstrap.ts` and writes the root `ytblockhandlecomments.js` userscript.
- `bump-version.ts`: updates version references and changelogs, removes completed TODO items, builds the userscript, commits the release, and creates the matching `vMAJOR.MINOR.PATCH` tag.
- `tsconfig.json`: TypeScript configuration for scripts.

## Commands

Run commands from the repository root:

```powershell
npm run build
npm run check:build
npm run bump:version -- 1.2.1
npm run typecheck
```

`npm run check:build` verifies that `ytblockhandlecomments.js` matches `src/` without writing output.

## Release Bump

`npm run bump:version -- <MAJOR.MINOR.PATCH>` requires a clean worktree. It updates the version files, rebuilds the userscript, commits the release as `chore: bump version to <version>`, and creates `v<version>`.

The command stops when the target tag already exists. Review the generated commit before pushing.

## Development Rules

- Keep scripts deterministic, rerunnable, and worktree-safe.
- Update focused tests when script behavior changes.
- Run the relevant tests and `npm run typecheck` after changes.
- Do not commit generated output or local tool state unless explicitly required.
