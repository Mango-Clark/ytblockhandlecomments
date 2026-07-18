# Scripts

Repository maintenance scripts: build, validate, release userscript.

Run all commands from repository root. Scripts use installed project tools + current Git repository; no dependency installation or Git configuration.

## Files

- `build-userscript.ts`: bundles `src/14-bootstrap.ts`; writes root `ytblockhandlecomments.js` userscript.
- `bump-version.ts`: updates version references + changelogs, removes completed TODO items, builds userscript, commits release, creates matching `vMAJOR.MINOR.PATCH` tag.
- `tsconfig.json`: TypeScript config for scripts.

## Commands

Run from repository root:

```powershell
npm run build
npm run check:build
npm run bump:version -- 1.2.1
npm run typecheck
```

`npm run build` writes generated userscript. `npm run check:build` builds in memory; fails when `ytblockhandlecomments.js` outdated. `npm run typecheck` checks main source + script/test TypeScript configs.

## Build Workflow

`build-userscript.ts` uses `src/14-bootstrap.ts` as bundle entry. Generated file goes to repository root because Tampermonkey loads `ytblockhandlecomments.js`, not individual `src/` files.

After source changes:

1. Run `npm run build`.
2. Run `npm run check:build` to verify generated file sync.
3. Run relevant tests + `npm run typecheck`.
4. Commit source + generated userscript changes together.

## Release Bump

### Normal Run

Pass exactly one semantic version in `MAJOR.MINOR.PATCH` format:

```powershell
npm run bump:version -- 1.3.0
```

npm `--` forwards version argument to `scripts/bump-version.ts`. No leading `v`; use `1.3.0`, not `v1.3.0`.

Normal run checks out `dev`, changes release files, then pushes completed release commit to `origin/dev`. Release tag not pushed.

### Master Promotion

Use `--ff-master` to fast-forward local `master` to completed `dev` release. Use `--push-master` to fast-forward + push to `origin/master`:

```powershell
npm run bump:version -- 1.3.0 --push-master
```

Before file changes, script verifies `master` is ancestor of `dev`. Otherwise aborts without merge/rebase and prints manual Git commands to resolve branch relationship.

### Check Mode

Use `--check` to verify version references already updated without writing, building, committing, or tagging:

```powershell
npm run bump:version -- 1.3.0 --check
```

Success when no version update needed; error when managed files contain older version. Skips completed TODO removal, done only during real release bump.

### Preconditions

Before normal run:

1. Confirm clean worktree with `git status --short`.
2. Confirm target tag absent with `git tag --list "v<version>"`.
3. Confirm requested version is intended release.

Script stops before file changes if worktree dirty or target tag exists. Missing expected version reference also stops run.

### Release Effects

On success, script:

1. Updates source version constants + README/WIKI version references.
2. Moves current changelog `Unreleased` entries into new release section; creates fresh empty `Unreleased` section.
3. Removes completed entries from `docs/TODO.md`.
4. Builds `ytblockhandlecomments.js`.
5. Stages explicit version, documentation, TODO, + generated userscript files.
6. Creates release commit + `v<version>` tag.
7. Pushes release commit to `origin/dev`.
8. With `--ff-master`, fast-forwards local `master` from `dev`; with `--push-master`, fast-forwards + pushes to `origin/master`.

Command never pushes release tag. Master promotion opt-in; never merges or rebases.

Release commit:

```text
chore: bump version to <MAJOR.MINOR.PATCH>
```

Review commit + tag before publishing:

```powershell
git show --stat --oneline HEAD
git tag --list "v<MAJOR.MINOR.PATCH>"
git status --short --branch
git push origin v<MAJOR.MINOR.PATCH>
```

## Development Rules

- Keep scripts deterministic, rerunnable, worktree-safe.
- Update focused tests when script behavior changes.
- Run relevant tests, `npm run typecheck`, + `npm run check:build` after changes.
- Do not commit generated output or local tool state unless explicitly required.
