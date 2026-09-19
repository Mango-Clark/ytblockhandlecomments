<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

## P3 — Low

## Blocked

## Backlog

## Done

- [x] (A) Investigate real-browser coverage for userscript lifecycle boundaries

  - (0) `2019b90d3b158ffdbd85cdd3316597b5ed3c0944`
  - (1) The current suite intentionally remains dependency-free, using `node:test`, a VM loader, and a small DOM shim; no browser executable or Playwright/Puppeteer dependency is present.
  - (2) The uncovered boundaries are real browser event ordering, Tampermonkey API behavior, YouTube custom-element replacement, browser fetch cancellation, and heap behavior. Deterministic unit tests remain the required default gate.
  - (3) The long-term optional Playwright plan is documented in both READMEs: add a separate Chromium/local-fixture E2E command with a GM shim, keep it outside `npm run verify`, and consider a real Tampermonkey extension profile only as a later expansion.
  - (4) No dependency or browser binary was added in this investigation.

- [x] (B) Publish generated outputs as one recoverable build transaction

  - (0) `e68b42bc292ead60313d4c4f545bfd591cb31023`
  - (1) Build outputs are staged and read back before publication; existing files are backed up and restored when a write, backup rename, or publish rename fails.
  - (2) Recovery attempts every affected output, preserves backups when recovery or staging cleanup is incomplete, and reports cleanup failures without silently leaving a mixed generation.
  - (3) Focused tests cover each output position, write/rename/backup/rollback/cleanup failures, complete publication, and read-only generated-output checks on Windows.
  - (4) Updated script documentation and paired English/Korean changelogs; verified with `npm run verify` and 199 passing tests.

- [x] (A) Complete the manager feature-boundary extraction

  - (0) `088cf30faf68133afb4dd8d3f7b1850ead75cae3`
  - (1) Extracted import/export persistence, settings-save orchestration, pair-run presentation, list cache invalidation, and list-row rendering behind typed `12a`–`12d` boundaries; removed the runtime index-signature escape hatch.
  - (2) Preserved the public `BlockListManager` entry point and existing row, dialog, persistence-failure, pairing, selection, regex, and toast behavior through focused manager tests.
  - (3) Updated paired English/Korean changelog and wiki documentation and regenerated the userscript and document outputs.
  - (4) Verified with `npm run verify` and 191 passing tests.

- [x] (N) Distinguish GM read failures from missing or invalid stored values

  - (0) `f739486a39a409ee6372296733d1b31e11345d0a`
  - (1) The shared adapter now records missing, present, invalid, and failed reads with a safe diagnostic status; raw storage errors and values are not exposed.
  - (2) Failed-load baselines keep fallback state in memory and block writes, migrations, remote merges, and cross-tab replacement until a later successful read; normal missing and invalid values retain their existing normalization behavior.
  - (3) Startup shows a recoverable reload message, and sync notifications are shown only after a remote merge is applied.
  - (4) Verify constructor failure, recovery/reload, migration, remote settings/API/block-list sync, rejected merge notifications, mutation attempts, and English/Korean documentation.

- [x] (M) Bound and cancel external pair/API lookup operations

  - (0) `df7622b8d7b082bfb86b8dfa3deef4f7f23e9476`
  - (1) Page/API fetches and response body parsing now use bounded timeouts, while timeout, network, and cancellation results remain distinguishable.
  - (2) Pair runs carry a shared `AbortSignal`; explicit cancellation aborts active requests, stops queued handles, releases lookup-slot waits, and avoids cancellation fallback writes. Retry after timeout remains possible.
  - (3) Closing a settings or list dialog detaches its UI generation while the shared app run continues; late results cannot update disposed settings UI or stale list state.
  - (4) Verify hung fetch/body reads, timeout retry, mid-run cancellation, lookup-slot cancellation, shared app cancellation, low-performance behavior, API categories, late callbacks, and English/Korean documentation.

- [x] (L) Preserve pair metadata under concurrent cross-tab writers

  - (0) `512d215`
  - (1) Pair records now use per-handle last-writer revisions with deletion tombstones and a clear revision, so concurrent additions, updates, removals, and clears converge deterministically.
  - (2) UID detection uses revision ordering; pair check and notification timestamps merge by the greatest timestamp and remain monotonic locally.
  - (3) Remote snapshots merge idempotently, accept legacy snapshots without a version field, restore local state after rejected writes, and refresh the UI only when merged state changes.
  - (4) Verify two-writer add/add, update/remove, clear/stale-write, empty tombstones, timestamp ordering, legacy snapshots, write rollback, repeated listener delivery, and English/Korean documentation.

- [x] (K) Make persistence failures explicit in pair, API-test, and import workflows

  - (0) `699257cc81ad3a9d7ca8c06e074866acfe96374d`
  - (1) Pair metadata, API-test results, and block-list imports now return explicit persistence success/failure results.
  - (2) Pair statistics, UI messages, and operation logs report persistence failures without counting failed writes as successful work.
  - (3) Pair updates roll back partial metadata/block-list mutations where possible and report rollback failures.
  - (4) JSON/text imports support truthful retry behavior, with legacy storage fallback coverage.
  - (5) Verify single and partial pair-write failure, failed `setLastPairCheckAt`, API-test persistence failure, import failure/retry, rollback failure, and English/Korean messages.

- [x] (A) Preserve block-list manager view state across adjacent dialogs

  - (0) `ff965fd8508dfd1115c06a09c9d0a0fae0d00d72`
  - (1) Restore search, type and tag filters, valid selections, and scroll position when returning to the manager in the same page session.
  - (2) Prune selections for rules removed locally or by another tab.
  - (3) Add one control that resets all active filters without clearing the current selection.
  - (4) Verify navigation restoration, stale-selection pruning, filter reset, responsive layout, and English/Korean labels.

- [x] (B) Improve logging correctness, controls, and storage reliability

  - (0) `7fc5aca579c2c0c12e0b0506c8b78c86d3d081d3`
  - (1) Correct ISO week-year and IANA timezone calendar-derived timestamp fields with boundary tests.
  - (2) Group logging controls by output, detail, console formatting, and saved-log management while preserving responsive behavior.
  - (3) Show saved entry count, last-entry state, console preview, and a test-output action; disable empty saved-log actions.
  - (4) Align English/Korean explanations with V0/V1 behavior, supported timestamp tokens, recorded event scope, and UTC downloads.
  - (5) Trim saved entries immediately when retention decreases and reduce repeated full-array writes without delaying visible logs.
  - (6) Merge concurrent cross-tab log additions deterministically without reviving entries after an explicit clear.

- [x] (C) Limit live log updates to logging status controls

  - (0) `5836c2f30a3d87574ff0cd419f4505acceae9135`
  - (1) Preserve unsaved settings input while new local or remote logs arrive.
  - (2) Refresh only saved-log status, console preview, and logging action availability.
  - (3) Unsubscribe when the settings dialog closes and avoid refreshing unrelated dialogs.

- [x] (D) Align diagnostic credential redaction with documentation

  - (0) `10aee389949c4457d031bd9e1117df5d235d0753`
  - (1) Redact recognizable JWT, Google API key, and credential-shaped string values under generic fields.
  - (2) Keep ordinary diagnostic strings while continuing to omit fields whose names identify sensitive data.
  - (3) Describe field-name and value-shape redaction accurately in the English and Korean documentation.

- [x] (E) Stabilize legacy log migration across storage listeners

  - (0) `7510f825f47e7c346126aacbdae2051c896a9261`
  - (1) Generate bounded deterministic IDs before legacy entries are written as version 2 state.
  - (2) Prevent long legacy messages from becoming duplicate entries after reload and stale-state merge.
  - (3) Verify real listener ordering, two-writer convergence, and stale additions after clear.

- [x] (F) Canonicalize legacy log IDs across trimmed snapshots

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Remove absolute array positions from legacy content fingerprints.
  - (2) Canonicalize legacy-writer entries already stored as version 2 and distinguish identical occurrences within a snapshot.
  - (3) Verify overlapping legacy snapshots and stale old-tab writes converge without duplicate entries.

- [x] (G) Notify logging status after asynchronous save rollback

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Notify active logging-status subscribers when a failed batched write restores persisted state.
  - (2) Verify optimistic saved-entry status returns to the actual stored count after `GM_setValue` rejection.

- [x] (H) Document scoped live logging status refresh

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Explain in the English WIKI that live log changes update only the logging status controls.
  - (2) Add the matching Korean explanation and keep generated documentation synchronized.

- [x] (I) Optimize the Tampermonkey runtime for high-load pages

  - (0) `76d0d7447b5add855d090430aa1ebd5a5faf8875`
  - (1) Batch comment mutations per animation frame and release pending observer, timer, and DOM references on navigation or close.
  - (2) Defer offscreen comment work until intersection while preserving visible-comment updates and observer fallback behavior.
  - (3) Cache hot-path matching configuration and reuse block-list data, search, pair-status, and regex computations.
  - (4) Prevent duplicate bootstrap, styles, global listeners, and toast timers; bound long-lived lookup caches.
  - (5) Verify deterministic operation counts with 1,000 rules and 500 comments while preserving all existing features.

- [x] (J) Reduce settings and block-list work and add low-performance mode

  - (0) `088ca8f6389516af23b4dec47b742f74579adb76`
  - (1) Removed duplicate settings/list rendering, repeated pair normalization, full rollback copies, and log-status writes.
  - (2) Paginated block and pair result lists; verified filters, selection, navigation, accessibility, and English/Korean labels.
  - (3) Added an opt-in low-performance setting with bounded comment batches, delayed search, and manual-only pair lookup at concurrency one.
  - (4) Verified 100/500/1,000-rule workloads, storage rollback, cross-tab updates, mode changes, and cleanup with automated tests. Actual Chrome heap/crash profiling was not available.
