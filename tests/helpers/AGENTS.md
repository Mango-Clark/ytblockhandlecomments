# Test Helper Rules

- Implementation-rule changes: update root + affected parent/child `AGENTS.md` together; helper detail stays here.
- Helpers: generic, reusable across tests.
- Keep assertions/test expectations out of shared helpers.
- Preserve fake DOM, globals, timers, userscript storage cleanup/isolation.
- Extend existing helper before adding duplicate fixture/loader.
