# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

## P3 — Low

## Blocked

## Backlog

## Done

- [x] (AA) `--push-master`가 `--ff-master`를 자동 포함하도록 release option 단순화

  - (0) `42d68bc3a9d43380a7bb2c80acf8009bbaaefac0`
  - (1) `scripts/bump-version.ts:16-18`에서 `--push-master`만 전달해도 `fastForwardMaster`와 `pushMaster`가 모두 활성화됨.
  - (2) `scripts/bump-version.ts:198-200`의 `--push-master requires --ff-master` 오류를 제거하고, 기존 master fast-forward 검증 후 push 순서는 유지.
  - (3) `--push-master` 단독, `--ff-master` 단독, 두 option 동시 전달 parsing·release flow regression test 검증.

- [x] (Z) console 시간 형식 기본 선택지 표시 추가

  - (1) 기본 `iso` option에 `tm-default-option`과 현지화한 기본값 label 적용.
  - (2) console time format·동적 channel ID 조회 주기를 포함해 모든 select 기본값 regression test 검증.

- [x] (Y) console 시간 형식의 ISO 8601 완료 조건 충족

  - (1) calendar·week·ordinal·basic date preset과 custom ISO token 지원 범위 명시.
  - (2) `DDD`, `ww`, `e`, `W` validation·formatter 동기화; basic/extended time과 timezone token 조합 가능.
  - (3) calendar/week/ordinal, custom basic, UTC/offset timezone, 유효·무효 token regression test와 README·WIKI 영문·한국어 동기화.

- [x] (X) logger payload 개인정보 redaction을 중첩 구조와 사용자 식별자까지 확대

  - (1) 중첩 object·array의 API key, token, URL, account, comment, handle, 사용자 식별자 제거.
  - (2) circular·대형 payload는 원문 fallback 없이 깊이·field·전체 크기 제한 적용.
  - (3) nested identifier·circular·V4 6 field regression test 검증.
  - (4) README·WIKI 영문·한국어 V4/V5 6/10 field와 redaction 정책 동기화.

- [x] (W) 재사용 comment node의 attribute·text 변경을 identity 재검사로 연결

  - (1) `href`, `data-channel-id`, `channel-id`, author/body text mutation도 comment root incremental refresh.
  - (2) attribute filter 최소화; userscript class/style 변경은 mutation 재귀 미발생.
  - (3) 3개 attribute·character data target regression test 검증.

- [x] (V) Shorts comment observer를 현재 활성 panel로 제한

  - (1) comment 수집·host lookup은 active `ytd-reel-video-renderer` 또는 열린 댓글 panel 내부만 사용.
  - (2) `ytd-shorts` feed 전체를 observer host로 사용하지 않음.
  - (3) 활성 renderer 전환·inactive panel 잔존·sibling comment 추가·제거 regression test 검증.

- [x] (U) channel ID 조회 갱신 주기를 verified pair에도 적용

  - (1) verified pair도 `verifiedAt` 기준 설정 주기 만료 시 handle 재조회.
  - (2) `always`는 명시적 전체 update마다 재조회; selected-handle update는 계속 force refresh.
  - (3) fresh skip·만료 refresh·`always`·selected force refresh regression test 검증.

- [x] (T) 최초 `blocked_v2` migration 저장 실패 시 생성자 중단 방지

  - (1) 초기 `_items` 없는 `GM_setValue` 실패도 빈 목록으로 rollback.
  - (2) legacy-only migration 실패 뒤 생성 계속, 다음 생성에서 migration 재시도.
  - (3) 최초 실패·재시도 성공·기존 v2 저장 실패 regression test 검증.

- [x] (S) Logger payload·console 안정화

  - (1) warn/info/debug event 분류, console output guard, no-undefined argument 적용.
  - (2) verbose level별 1/3/6/10 field limit과 sensitive key redaction 적용.

- [x] (R) Block-list search frame batch

  - (1) search input은 rAF batch; IME composition 중 render 지연.

- [x] (Q) Selector lifecycle diagnostics

  - (1) page/host/extraction counter와 recent reason을 privacy-limited perf metrics에 기록.

- [x] (O) API·pair async busy 복구

  - (1) API/pair await 경로에 error toast와 `finally` busy reset 추가.
  - (2) banner pair action도 disabled/text restore.
  - (3) concurrent pair request active Promise 공유 regression test 검증.

- [x] (N) 중첩 dialog keydown·focus 처리

  - (1) document keydown listener 1개; top dialog만 Escape/Enter/Tab 처리.
  - (2) backdrop close도 top dialog만 처리; close 뒤 opener focus 복원.
  - (3) nested keyboard, listener count, focus restore regression test 검증.

- [x] (M) YouTube theme observer 범위 축소

  - (1) `body subtree` discovery 제거; `ytd-app` 발견 뒤 discovery disconnect.
  - (2) YouTube mode에서만 root/app observer 활성; 직계 `ytd-app` 교체만 재탐색.
  - (3) unrelated body mutation, 발견 뒤 해제, replacement regression test 검증.

- [x] (L) Tampermonkey 저장 실패 보존·재시도 안내

  - (1) settings, block list, pair metadata, API key, logger write 실패 시 기존 state 유지.
  - (2) 차단·API key·log clear 성공 toast를 오류·재시도 안내로 분기.
  - (3) 5개 저장소 `GM_setValue` 예외 regression test 검증.

- [x] (K) 재사용 comment DOM node identity 처리

  - (1) node identity는 channel ID, handle, 본문, pinned label 기반.
  - (2) identity 변경 시 metadata·keyword·dislike·block 상태 무효화.
  - (3) 하나의 node handle/body 변경 뒤 keyword/dislike 재실행 fixture test 검증.

- [x] (J) pair mode channel ID 추출 fallback·진단

  - (1) `/channel/UC...`, `data-channel-id`, `channel-id` 우선순위 추출.
  - (2) pair mode handle 존재/channel ID 없음 `missingChannelIds` counter 기록.
  - (3) link·attribute fallback과 missing diagnostics fixture test 검증.

- [x] (I) YouTube SPA page key 보조 감지

  - (1) `yt-page-data-updated`, `pushState`, `replaceState`를 page sync 경로에 추가.
  - (2) page key unchanged 시 observer/listener 재등록·transient reset 없음.
  - (3) page-data/history navigation scheduling과 page key 변경 regression test 검증.

- [x] (H) Shorts 댓글 host 안정 panel 관찰

  - (1) 단일 comment root 대신 nearest non-comment container 선택.
  - (2) sibling comment/reply와 재사용 panel의 증분 mutation은 panel observer로 처리.
  - (3) single/sibling/remove Shorts panel·page key reset navigation regression test 검증.

- [x] (G) 댓글 host 탐색 observer 범위·수명 축소

  - (1) `ytd-page-manager`, `ytd-app`, `document.body` fallback 제거.
  - (2) host lookup은 watch/Shorts root만 관찰, 20 unsuccessful batch 뒤 중단; page key 변경 시 retry reset.
  - (3) frame batch host lookup·root/cap regression test 검증.

- [x] (F) 댓글 작성자 외 YouTube handle 우클릭 범위 제한

  - (1) comment renderer 내부 `#author-text`, `#author-handle`만 contextmenu 처리.
  - (2) 영상 정보·채널·검색·댓글 본문 handle 링크는 YouTube 기본 동작 유지.
  - (3) 작성자 text/link 처리와 비작성자 `/@...` link 회귀 test 검증.

- [x] (E) 여러 YouTube 탭 동시 차단 목록 변경 충돌 처리

  - (1) 항목별 revision/tombstone과 clear revision을 `blocked_v2` optional sync metadata로 추가.
  - (2) 동시 추가 병합; add/delete/clear 충돌은 revision 순서로 결정론적 수렴.
  - (3) remote merge는 변경시에만 재저장; 동시 add, add/delete, clear 자동 test 검증.

- [x] (D) v2 migration 뒤 legacy 차단 항목 복원 방지

  - (1) 유효한 `blocked_v2`가 있으면 `blockedHandles_v1`, `blockedHandles`를 다시 병합하지 않음.
  - (2) 최초 legacy migration 후 삭제·전체 초기화·재로드에서도 legacy 항목 미복원.
  - (3) legacy-only 최초 실행, valid v2 재실행, 개별 삭제, 전체 초기화 자동 test 검증.

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
