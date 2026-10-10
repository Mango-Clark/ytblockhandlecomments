# Contributing

[English](CONTRIBUTING.md) | [한국어](CONTRIBUTING.ko.md)

## Before You Start

- Read the root `AGENTS.md` and any `AGENTS.md` files for the area you will change.
- Start from `dev`. Do not work directly on `master`.
- Use a focused branch named `feature/<slug>`, `fix/<slug>`, or `docs/<slug>`.

## Make Changes

- Keep each change focused and preserve unrelated work already in the checkout.
- Edit TypeScript sources in `src/`; `ytblockhandlecomments.js` is generated. Run `npm run build` after source changes and include the generated output.
- Edit generated documentation through `src/template/`. Run `npm run build` to update generated README and `docs/` files; do not edit those generated files directly. `docs/AGENTS.md` is maintained directly.
- Keep English and Korean documentation aligned: update English first, then its Korean pair, with the same section order, links, commands, dates, and versions.
- UI and README support ten locales. Update the English message contract first, then every catalog and README translation. Preserve parameters, commands and machine-facing identifiers. Native names, README paths and credits belong in `src/i18n/locales.ts`; scope is recorded in `i18n-mason.toml`.
- Record meaningful technical changes in the paired changelogs under `Unreleased`, using the existing Keep a Changelog categories.
- Keep user-facing behavior, storage, and compatibility descriptions consistent with the implementation.

## Validate and Submit

- Run `npm run verify` before submitting. It runs code lint, Markdown lint, typechecking, tests, build, and generated-output checks.
- For a smaller check while iterating, use the relevant scripts: `npm run lint`, `npm run lint:markdown`, `npm run typecheck`, `npm test`, `npm run build`, or `npm run check:build`.
- Use Conventional Commits with an allowed type, such as `docs: add contribution guide` or `fix: preserve pair state`.
- Open a pull request targeting `dev`. Summarize the change and list the validation commands and results. Do not push directly to `master`.
- Do not change the version or create a release unless explicitly requested. Releases use `npm run bump:version -- <MAJOR.MINOR.PATCH>`.
