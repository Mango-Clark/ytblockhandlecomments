# Test Helper Rules

- Helpers: generic, reusable across tests.
- Do not hide assertions/test expectations in shared helpers.
- Preserve fake DOM, globals, timers, userscript storage cleanup/isolation.
- Extend existing helper before adding duplicate fixture/loader.
