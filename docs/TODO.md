# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

## P3 — Low

## Blocked

## Backlog

## Done

- [x] (C) YouTube handle → channel ID(UCID) 조회 방식을 설정 가능하게 구현

  - (1) 내부·문서 신규 표기는 YouTube 공식 용어 `channel ID` 또는 `UCID` 우선 사용.
  - (2) 기본 방식은 같은 YouTube origin의 공개 채널 페이지(`https://www.youtube.com/@<handle>`) HTML에서 `externalId`, `channelId`, `itemprop="channelId"` 순서로 channel ID 추출.
  - (3) handle 앞 `@` 정규화, URL 인코딩, HTTP 오류·channel ID 미검출 오류 처리.
  - (4) HTML 파싱 방식은 undocumented 방식임을 설정 UI·문서에 표시하고, YouTube HTML 변경 실패는 재시도/API fallback 안내로 복구 가능.
  - (5) 조회 결과 cache 적용; 반복·대량 요청 rate pressure 최소화.
  - (6) 서버 relay 대신 YouTube 페이지의 same-origin 직접 요청 선택.
  - (7) 기존 YouTube Data API v3 `channels.list?part=id&forHandle=<handle>` 방식 유지; 설정에서 명시적으로 API 방식을 고를 때만 사용.
  - (8) API 방식은 API key 설정·quota 1 unit·실패 상태 표시 유지.
  - (9) API 비활성화 상태에서는 scraper 기본; 실패 시 재시도·API fallback 안내 표시.
  - (10) handle → channel ID(UCID) 매칭 빈도 설정: scraper `10m (Default)`, API `1w (Default)`.
  - (11) 선택지: `By Every Handle Update`, `1m`, `5m`, `10m`, `1h`, `12h`, `1d`, `1w`, `1M`, `직접 설정`.
  - (12) `직접 설정`은 초 단위 최소 1초 validation 제공.
  - (13) 새 handle 추가 즉시 매칭 on/off 선택.
  - (14) scraper 실패 시 YouTube Data API v3 fallback on/off 설정.
  - (15) fallback `on`이면 scraper 실패 후 API 조회; `off`이면 API 요청 없이 오류·재시도 안내.

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
