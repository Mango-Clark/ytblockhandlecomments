# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

## P3 — Low

## Blocked

## Backlog

## Done

- [x] (C) Localize UI and README in ten locales and update current documentation.
  - (0) Baseline: `d0cd7a105bf9da440b951f6f37dfb12eee9ecb94`.
  - (1) Support en-us, ko-kr, ja-jp, de-de, zh-cn, zh-tw, fr-fr, pt-br, ru-ru, and id-id with complete matching catalogs.
  - (2) Preserve saved en/ko choices; select browser languages with regional/script matching and English fallback; provide a shared language picker.
  - (3) Preserve drafts, focus, list state, and cross-tab updates; translate owned UI without changing storage or external protocols.
  - (4) Generate ten complete README translations, shared language links, and translation credits; update existing-language guides and locale rules.
  - (5) Author regression cases; run lint, Markdown lint, typecheck, build, generated-output check, and independent review. Do not run tests or full verify.
  - (6) All allowed checks and independent static review passed. Local browser preview covered ten locales at 1366px/light and 320px/dark with maximum scale, plus menu/language changes preserving a draft. Live YouTube, tests, and full verify were not run.

- [x] (A) Separate UCID pairing directions and lookup policies; simplify settings and redundant checks.
  - (0) Baseline: `388ab9082aac239f22156a8a73c3db1ae761d556`.
  - (1) Create handle-to-UCID pairs; update handles from stable UCIDs; preserve blocking on lookup or persistence failure.
  - (2) Configure creation, updates, and immediate pairing independently; preserve low-mode and refresh behavior.
  - (3) Provide settings section navigation, separate settings from list operations, and preserve input/list state on return.
  - (4) Migrate UCID fields and synchronization metadata idempotently; preserve revisions, deletions, and unrelated changes.
  - (5) Remove obsolete pairing checks and only proven redundant checks elsewhere; retain state and boundary protection.
  - (6) Update paired docs and generated output; run static checks/build and independent review. Do not execute tests or `npm run verify`.
  - (7) Lint, Markdown lint, typecheck, build, generated-output check, and independent review passed. Tests and full verify were not run by user instruction.

- [x] (B) Repair UCID detection layout and unify Settings with the API section's vertical layout.
  - (0) Baseline: `5d7f9a91c954a64e81e5ad1f184733cc7393ac4f`.
  - (1) Match eight navigation destinations to eight sections with consistent headings, borders, spacing, and controls.
  - (2) Give UCID detection and each pairing option an independent field; preserve custom interval visibility and draft values.
  - (3) Keep navigation, translations, themes, scale, keyboard focus, and list-return state; prevent narrow-screen overflow.
  - (4) Update regression cases, paired docs, changelog, and generated output; run allowed static checks and independent review without tests or full verify.
  - (5) Static checks/build and independent review passed. Synthetic browser preview covered desktop, 320px light and 390px dark at maximum scale; tests/full verify were not executed.

- [x] (D) Group non-English documentation under locale folders.
  - (0) Baseline: `72e1f60b215ae4f9ba1ee3559443820a3a64db6a`.
  - (1) Keep English paths; move translated READMEs and Korean guides into `docs/<locale>/`, with matching template paths.
  - (2) Preserve translation content and credits; update relative links, locale metadata, documentation rules, generation, and release paths.
  - (3) Update affected regression cases; run lint, Markdown lint, typecheck, build, generated-output and link checks, and independent review. Do not run tests or full verify.
  - (4) All allowed checks and independent static review passed; 201 relative links across 20 documents have existing targets. Tests and full verify were not run by user instruction.
