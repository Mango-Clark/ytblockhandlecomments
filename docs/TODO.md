# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

## P3 — Low

## Blocked

## Backlog

## Done

- [x] (B) Chrome console logging prefix·시간·Timezone 설정 추가

  - (1) 로그 prefix 사용자 설정 추가. 기본값은 `[YTCB]`.
  - (2) 시간 관련 로그 표시 `on/off` 토글 추가.
  - (3) 시간 형식 선택·직접 입력 지원. `yy-MM-dd` 등 사용자 지정 형식과 ISO 8601의 모든 허용 형식 지원.
  - (4) Timezone 선택은 dropdown 제공: `system`, `userinput`, 숫자 offset `-12`~`+14`, 도시·약어 기반 TZ(`KST`, `CEST` 등).
  - (5) `system`은 브라우저·OS timezone 사용, `userinput`은 사용자 입력값 검증 후 사용.
  - (6) 잘못된 prefix·시간 형식·Timezone 입력은 저장 차단 및 수정 안내.
  - (7) 설정값은 모든 Chrome console logging 경로에 동일 적용.

- [x] (A) 모든 설정 선택지에 기본값 표시 추가

  - (1) 기본값 옆에 `(Default)` 또는 `(기본)` 표시.
  - (2) 기본값 표시는 회색 UI로 렌더링.
