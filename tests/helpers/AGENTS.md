# Test Helper Rules

- Keep helpers generic and reusable across tests.
- Keep assertions and test-specific expectations out of shared helpers.
- Preserve fake DOM, globals, timers, and userscript-storage cleanup/isolation.
- Extend an existing helper before adding a duplicate fixture or loader.
