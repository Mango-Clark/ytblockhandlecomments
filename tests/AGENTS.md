# Test Rules

- Tests must be deterministic and independent of network, browser profile, and wall-clock timing.
- Prefer existing fake DOM and userscript helpers.
- Cover success plus repeated/idempotent storage, navigation, menu, and UI behavior where relevant.
- For behavior changes, run focused tests first; full suite is enforced by final `npm run verify`.
