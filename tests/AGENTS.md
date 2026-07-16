# Test Rules

- Implementation-rule changes update root and this child `AGENTS.md` together; test detail stays here.

- Tests: deterministic; independent of network, browser profile, wall-clock timing.
- Prefer existing fake DOM/userscript helpers.
- Cover success + repeated/idempotent storage, navigation, menu, UI behavior.
- Behavior change: focused test first, then full suite.
