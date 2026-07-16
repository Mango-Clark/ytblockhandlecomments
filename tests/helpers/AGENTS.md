# Test Helper Rules

- Implementation-rule changes update root and affected parent/child `AGENTS.md` together; helper detail stays here.

- Helpers: generic, reusable across tests.
- Do not hide assertions/test expectations in shared helpers.
- Preserve fake DOM, globals, timers, userscript storage cleanup/isolation.
- Extend existing helper before adding duplicate fixture/loader.
