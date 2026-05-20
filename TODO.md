# TODO

## Important

- [x] 차단 해제 버튼을 누르면 닫혀있는 최근 Pair 실행 결과 창이 계속 펼쳐짐. 해결바람.

## Normal

- [ ] Add automated regression coverage for manager search, live i18n refresh, and pair result UI.
- [ ] Add a long-session navigation memory regression check for reused YouTube comment hosts.
- [ ] Add regression coverage for pair refresh interval skips and selected-handle forced updates.
- [ ] Add regression coverage for regex safety rejection and `/pattern/flags` import round-trips.
- [ ] Consider virtualizing very large regex match lists in the manager when block lists grow.
- [ ] Surface more structured quota guidance when the API test detects repeated `quota` failures.

## Small

- [ ] Polish the pair result detail view with sorting or filtering by outcome.
- [ ] Add copy/export helpers for failed handle names from the last pair run.
- [ ] Consider row-level updates for regex expand/collapse if large lists still feel heavy.
