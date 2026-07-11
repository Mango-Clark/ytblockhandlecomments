# Test Rules

- Tests: deterministic; independent of network, browser profile, wall-clock timing.
- Prefer existing fake DOM/userscript helpers.
- Cover success + repeated/idempotent storage, navigation, menu, UI behavior.
- Behavior change: focused test first, then full suite.
