# Test Rules

- Implementation-rule changes: update root + child `AGENTS.md` together; test details stay here.
- Tests deterministic; network, browser profile, wall-clock independent.
- Prefer existing fake DOM/userscript helpers.
- Cover success + repeated/idempotent storage, navigation, menu, UI behavior.
- Behavior changes: focused test first, then full suite.
