# Scripts

Repository maintenance scripts: build, validate, release userscript.

Run all commands from repository root. Scripts use installed project tools + current Git repository; no dependency installation or Git configuration.

## Files

- `build-userscript.ts`: reads `VERSION`, bundles `src/14-bootstrap.ts`, and generates userscript + Markdown outputs from `src/docs/` templates.
- `bump-version.ts`: updates `VERSION`, release templates, builds generated files, commits release, creates + pushes matching `vMAJOR.MINOR.PATCH` tag.
- `tsconfig.json`: TypeScript config for scripts.

## Commands

Run from repository root:

```powershell
npm run build
npm run check:build
npm run bump:version -- 1.2.1
npm run bump:version -- 1.2.1 -- --check
npm run typecheck
```

`npm run build` writes generated userscript + Markdown files. `npm run check:build` builds in memory; fails when any generated output is outdated. `npm run typecheck` checks main source + script/test TypeScript configs.

## Build Workflow

`build-userscript.ts` reads the one-line `VERSION` file. It uses `src/14-bootstrap.ts` as bundle entry and replaces `{{version}}` in userscript source + `src/docs/` Markdown templates. `src/docs/README*.md` generates root README files; `src/docs/docs/*.md` generates matching `docs/*.md` files. `docs/AGENTS.md` remains direct-managed.

After source changes:

1. Run `npm run build`.
2. Run `npm run check:build` to verify generated file sync.
3. Run relevant tests + `npm run typecheck`.
4. Commit source templates + generated userscript/document changes together.

## Release Bump

### Normal Run

Pass exactly one semantic version in `MAJOR.MINOR.PATCH` format:

```powershell
npm run bump:version -- 1.3.0
```

No leading `v`; use `1.3.0`, not `v1.3.0`. With an option after version, npm 12 requires a second `--` before that option so npm forwards it to `scripts/bump-version.ts`.

Normal run checks out `dev`, changes release files, then pushes completed release commit and matching tag to `origin`.

### Master Promotion

Use `--ff-master` to fast-forward local `master` to completed `dev` release. Use `--push-master` to fast-forward + push to `origin/master`:

```powershell
npm run bump:version -- 1.3.0 -- --push-master
```

Before file changes, script verifies `master` is ancestor of `dev`. Otherwise aborts without merge/rebase and prints manual Git commands to resolve branch relationship.

### Check Mode

Use `--check` to verify version references already updated without writing, building, committing, or tagging:

```powershell
npm run bump:version -- 1.3.0 -- --check
```

Success when no version update needed; error when managed files contain older version. Skips completed TODO removal, done only during real release bump.

### Preconditions

Before normal run:

1. Confirm clean worktree with `git status --short`.
2. Confirm target tag absent with `git tag --list "v<version>"`.
3. Confirm requested version is intended release; lower versions fail unless `--force-version` is passed.

Script stops before file changes if worktree dirty or target tag exists. Missing expected version reference also stops run.

### Release Effects

On success, script:

1. Updates `VERSION`.
2. Moves current `src/docs/docs/CHANGELOG*.md` `Unreleased` entries into new release section; creates fresh empty `Unreleased` section.
3. Removes completed entries from `src/docs/docs/TODO.md`.
4. Builds userscript + generated Markdown files.
5. Stages explicit version, templates, generated documentation, TODO, + userscript files.
6. Creates release commit + `v<version>` tag.
7. Pushes release commit to `origin/dev` and tag to `origin`.
8. With `--ff-master`, fast-forwards local `master` from `dev`; with `--push-master`, fast-forwards + pushes to `origin/master`.

To intentionally allow a lower target version, pass `--force-version` after the second separator: `npm run bump:version -- 1.4.9 -- --force-version`. Master promotion remains opt-in; command never merges or rebases.

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
- Commit generated userscript + documentation outputs with their source/template changes; never commit local tool state.
