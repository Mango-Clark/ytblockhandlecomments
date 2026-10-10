# Translation Rules

- All ten catalogs must have identical keys, parameters, placeholders, and message intent. `en.ts` defines the shared type contract.
- Add/update English first, then Korean and every configured locale; use exact locale identifiers from `locales.ts` and `i18n-mason.toml`.
- Locale metadata owns native names, generated README paths, and translation contributors; browser matching must not rewrite declared identifiers.
- Preserve YouTube UI labels, wording, capitalization, and punctuation exactly where compatibility requires it.
- Keep business logic and storage behavior out of translation files.
