# Scripts

Repository maintenance scripts for building, validating, and releasing the userscript.

Run every command from the repository root. The scripts use the installed project tools and
the current Git repository; they do not install dependencies or configure Git for you.

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

`npm run build` writes the generated userscript. `npm run check:build` performs the same build
in memory and fails when `ytblockhandlecomments.js` is out of date. Use `npm run typecheck` to
check both the main source and the script/test TypeScript configurations.

## Build Workflow

`build-userscript.ts` uses `src/14-bootstrap.ts` as the bundle entry point. The generated file
is written to the repository root because Tampermonkey loads `ytblockhandlecomments.js`, not the
individual files under `src/`.

Use this workflow after source changes:

1. Run `npm run build`.
2. Run `npm run check:build` to verify the generated file is synchronized.
3. Run the relevant tests and `npm run typecheck`.
4. Commit source and generated userscript changes together.

## Release Bump

### Normal Run

Pass exactly one semantic version in `MAJOR.MINOR.PATCH` format:

```powershell
npm run bump:version -- 1.3.0
```

The npm `--` forwards the version argument to `scripts/bump-version.ts`. The script does not
accept a leading `v`; use `1.3.0`, not `v1.3.0`.

The normal run checks out `dev` before changing release files, then pushes the completed release
commit to `origin/dev`. It does not push the release tag.

### Master Promotion

Use `--ff-master` to fast-forward local `master` to the completed `dev` release. Use
`--push-master` to fast-forward it and push the result to `origin/master`:

```powershell
npm run bump:version -- 1.3.0 --push-master
```

Before changing release files, the script verifies that `master` is an ancestor of `dev`. If not,
it aborts without merging or rebasing and prints the manual Git commands required to resolve the
branch relationship.

### Check Mode

Use `--check` to verify that version references are already updated without writing files,
building, committing, or creating a tag:

```powershell
npm run bump:version -- 1.3.0 --check
```

The check exits successfully when no version update is required. It exits with an error when
one or more managed files still contain an older version. The check intentionally skips removal
of completed TODO items because that operation is only performed during a real release bump.

### Preconditions

Before a normal run:

1. Confirm the working tree is clean with `git status --short`.
2. Confirm the target tag does not already exist with `git tag --list "v<version>"`.
3. Confirm the requested version is the intended release version.

The script stops before changing files when the worktree is dirty or the target tag already
exists. A failed replacement also stops the run when an expected version reference is missing.

### Release Effects

On success, the script performs these operations in order:

1. Updates source version constants and version references in README/WIKI files.
2. Moves the current changelog `Unreleased` entries into the new release section and creates a
   fresh empty `Unreleased` section.
3. Removes completed entries from `docs/TODO.md`.
4. Builds `ytblockhandlecomments.js`.
5. Stages the explicit version, documentation, TODO, and generated userscript files.
6. Creates the release commit and `v<version>` tag.
7. Pushes the release commit to `origin/dev`.
8. With `--ff-master`, fast-forwards local `master` from `dev`; with `--push-master`, fast-forwards
   and pushes it to `origin/master`.

The command never pushes the release tag. Master promotion is opt-in and never merges or rebases.

The release commit is created as:

```text
chore: bump version to <MAJOR.MINOR.PATCH>
```

Review the commit and tag before publishing them:

```powershell
git show --stat --oneline HEAD
git tag --list "v<MAJOR.MINOR.PATCH>"
git status --short --branch
git push origin v<MAJOR.MINOR.PATCH>
```

## Development Rules

- Keep scripts deterministic, rerunnable, and worktree-safe.
- Update focused tests when script behavior changes.
- Run the relevant tests, `npm run typecheck`, and `npm run check:build` after changes.
- Do not commit generated output or local tool state unless explicitly required.
