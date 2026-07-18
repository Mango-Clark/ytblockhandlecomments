# 📚 YouTube Comment Blocker 위키 — v1.5.0

[English](WIKI.md) | [한국어](WIKI.ko.md)

현재 구현 상세. [`README.md`](../README.md)보다 구체적.

## 1. 개요

watch/Shorts 페이지 YouTube 댓글을 채널 식별자로 숨기는 사용자 스크립트.

소스 구조:

- `src/`: 역할별 소스 조각. 한국어/영어 i18n dictionary 별도 파일.
- `ytblockhandlecomments.js`: 단일 Tampermonkey 배포 파일.
- `npm run build`: `src/`에서 루트 userscript 재생성.
- `npm run check:build`: 루트 userscript와 `src/` 동기화 확인.
- Chrome/Tampermonkey는 `src/` 파일을 직접 로드하지 않고 생성된 루트 userscript만 사용.
- 생성 파일은 설치/업데이트 payload 축소 위해 압축.
- 동작 변경 커밋: 변경된 `src/` + 재빌드된 `ytblockhandlecomments.js` 포함.

`blocked_v2` 규칙 타입:

- `handle`
- `id`
- `regex`

로컬 저장소:

- `blocked_v2`
- `pair_meta_v1`
- `app_settings_v1`
- `youtube_data_api_v3_config`

사용자 진입점:

- 댓글 작성자 handle 우클릭
- 채널/검색/영상 설명/댓글 본문 handle 링크: YouTube 기본 context menu 유지
- 댓글 `⋯` 메뉴 주입 항목
- Tampermonkey 메뉴 `Manage block list`
- watch 페이지 pair 검토 배너

댓글 숨김 page mode:

- `watch`
- `shorts`

일치하는 watch/Shorts root만 관찰. frame당 host 확인 묶음. 실패 mutation batch 20회 후 중단. navigation/새 page key에서 재시도 budget 초기화.

Shorts는 comment root 주변 가장 가까운 non-comment panel 관찰. panel 갱신 후 형제 댓글·reply도 계속 관찰.

page 동기화: `yt-navigate-finish`, `yt-page-data-updated`, `popstate`, `history.pushState()`, `history.replaceState()`. 파생 page key 변경 때만 임시 관찰 상태 초기화.

범위 밖:

- pair 메타데이터 import/export
- 백그라운드 polling 기반 pair 자동 갱신

## 2. 메타데이터와 런타임

- `@version`: `1.5.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`
- 실행: `document-idle`

댓글 매칭 범위: watch/Shorts 댓글. 매칭 댓글 처리: 완전 숨김, 회색 대체 문구, 클릭 공개 대체 문구. 자동 싫어요 기본 안함. 새로 숨길 때만/차단 댓글이 숨겨진 동안 항상 선택 가능. 이미 눌린 싫어요는 재토글 안 함.

자동 처리는 channel ID, handle, 본문, 고정 문구 기반 identity 사용. 재사용 comment element identity 변경 시 새 댓글 metadata와 1회 keyword/dislike/차단 표시 상태 무효화.

키워드 검사는 댓글 본문, 작성자 handle, 고정 표시 문구 대상. 대소문자 무시. 싫어요, handle 차단 목록 등록, handle 등록 후 UID pair 생성 중 선택 동작만 실행.

로그: 다운로드용 로컬 보관/브라우저 console 출력 개별 설정. 앱 시작, API 테스트, pair 실행 등 저빈도 이벤트만 기록.

## 3. 저장 구조

메인 규칙:

```ts
{
  version: 2,
  updatedAt: number,
  items: Array<
    | { type: 'handle', value: string }
    | { type: 'id', value: string }
    | { type: 'regex', value: string, flags?: string }
  >
}
```

Pair 메타데이터:

```ts
{
  version: 1,
  enableUidDetection: boolean,
  lastPairCheckAt: number | null,
  pairNotificationDismissedAt: number | null,
  pairs: Array<{
    handle: string,
    uid: string,
    verifiedAt: number | null,
    status: 'verified' | 'stale' | 'mismatch' | 'unverified',
    source: string,
    lastResolvedUid?: string | null,
    lastError?: string | null
  }>
}
```

앱 설정:

```ts
{
  version: 1,
  handleCaseSensitive: boolean,
  autoAddRegexHandles: boolean,
  blockMatchMode: 'handle' | 'pair',
  pairUpdateUidCheck: boolean,
  pairUpdateHandleLookup: boolean,
  handleLookupMethod: 'scraper' | 'api',
  handleLookupFallbackApi: boolean,
  handleLookupInterval: 'always' | '60' | '300' | '600' | '3600' | '43200' | '86400' | '604800' | '2592000' | 'custom',
  handleLookupCustomSeconds: number,
  handleLookupOnAdd: boolean,
  keywordAutomationEnabled: boolean,
  themeMode: 'light' | 'dark' | 'system' | 'system-inverted' | 'youtube' | 'youtube-inverted' | 'custom',
  themeCustom: { background: string, surface: string, text: string, muted: string, border: string, primary: string, danger: string },
  keywordRules: string[],
  keywordFields: { commentText: boolean, handle: boolean, pinned: boolean },
  keywordActions: { dislike: boolean, blockHandle: boolean, createPair: boolean },
  logging: {
    fileEnabled: boolean,
    consoleEnabled: boolean,
    level: 'error' | 'warn' | 'info' | 'debug',
    retention: 100 | 500 | 1000,
    consolePrefix: string,
    consoleTimestampEnabled: boolean,
    consoleTimeFormat: string,
    consoleTimeZone: string,
    consoleTimeZoneInput: string
  },
  dislikeMode: 'none' | 'new-hidden' | 'always',
  commentBlockMode: 'hide' | 'placeholder' | 'placeholder-reveal',
  fontSizeLevel: 1 | 2 | 3 | 4 | 5,
  uiScaleLevel: 1 | 2 | 3 | 4 | 5
}
```

API 설정:

```ts
{
  version: 2,
  apiKey: string,
  quotaFailureCount: number,
  lastQuotaFailureAt: number | null,
  lastTestResult: {
    checkedAt: number,
    ok: boolean,
    category: 'ok' | 'invalid' | 'quota' | 'forbidden' | 'network' | 'unknown',
    httpStatus: number | null,
    message: string
  } | null
}
```

참고:

- 유효한 `blocked_v2` 없을 때만 레거시 `blockedHandles`, `blockedHandles_v1` 자동 migration. 이후 삭제/전체 초기화 시 legacy 복원 안 함.
- 탭 간 `blocked_v2` 변경에 선택적 항목별 revision, tombstone, clear revision 저장. 동시 추가 병합. 추가/삭제/전체 초기화 충돌은 높은 revision 기준, echo write 없이 수렴.
- 기본 `app_settings_v1.dislikeMode`: `none`.
- 기본 `app_settings_v1.commentBlockMode`: `hide`.
- 기본 `app_settings_v1.blockMatchMode`: `handle`.
- `app_settings_v1.pairUpdateUidCheck`/`pairUpdateHandleLookup` 중 하나 항상 켬. 기본은 handle 재조회.
- `handleLookupMethod` 기본 `scraper`; `api`는 명시 선택. `handleLookupFallbackApi` 기본 `false`, `handleLookupOnAdd` 기본 `true`.
- 기존 동작 유지 위해 키워드 자동 처리 기본 켬. 꺼도 대소문자 무시 규칙/검사 대상/동작 설정 보존. 기본 검사 대상은 댓글 본문, 동작은 모두 꺼짐.
- `app_settings_v1.themeMode` 기본 `system`. 기기설정/yt설정은 현재 다크 설정 추종, 반대 모드는 결과 반전. 커스텀 색상 저장 전 여섯 자리 hex 검증.
- 테마 스타일은 userscript dialog/패널/목록/알림에만 적용. YouTube UI 제외.
- YouTube 테마 동기화는 YouTube 자체 다크 상태 신호만 관찰.
- 테마 탐색은 `ytd-app` 발견 시 중단. YouTube 모드에서 body 직계 child 변경 중 `ytd-app` 교체만 확인. 댓글/피드 mutation은 app 재탐색 안 함.
- 로그 기본 꺼짐. 파일 로그는 다운로드/삭제 전까지 Tampermonkey 저장소 보관. 다운로드 위치는 브라우저 설정 따름.
- Tampermonkey가 권한/용량/저장소 문제로 설정, 차단 목록, pair 메타데이터, API 키, 로그 쓰기 거부 시 메모리 상태도 유지. 성공 알림 대신 오류/재시도 안내.
- console 로그 기본 prefix `[YTCB]`; 시간 표시 꺼짐. preset은 확장·basic calendar date, week date, ordinal date, time 지원. 직접 ISO 형식은 `yyyy`, `yy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, `W` 조합. basic/extended time과 timezone token 동시 사용 가능. timezone: system, `-12`~`+14` UTC offset, 목록 IANA 도시, 검증된 직접 IANA/KST식 약어.
- `app_settings_v1.verboseLevel` 기본 `3`. V0/V1 진단 payload 생략; V2 1필드, V3 3필드, V4 6필드, V5 10필드. console/저장 로그 전 중첩 API 키·token·URL·account·comment·handle·사용자 식별자 제거. circular/대형 payload 안전 절단.
- 기본 `app_settings_v1.fontSizeLevel`/`app_settings_v1.uiScaleLevel`: `3`; `2`는 이전 시각 크기.
- pair 메타데이터/API 설정은 import/export 제외.

## 4. 매칭 모델

신원 매칭:

- `app_settings_v1.blockMatchMode`: 활성 신원 규칙 타입 선택.
- `handle`: 기본. 저장된 `handle` 규칙 매칭.
- `pair`: UID 감지 후 저장된 `id` 규칙 매칭.
- regex는 추출된 handle 텍스트에만 적용.
- regex가 pattern 길이, flag, 대상 길이, 위험 backtracking safety 제한 초과 시 저장 거부.

대소문자 구분:

- `app_settings_v1.handleCaseSensitive`로 제어.
- `false`: 소문자 정규화 비교.
- `true`: exact handle 비교.
- 과거 소문자 저장 handle은 strict exact 비교 위해 재저장 필요 가능.

선택적 UID 동작:

- `app_settings_v1.blockMatchMode` + `pair_meta_v1.enableUidDetection` 사용.
- `id` 규칙은 `pair` 방식과 UID 감지 모두 켤 때만 매칭.
- UID 감지를 꺼도 저장된 `id` 규칙/pair 메타데이터 유지.
- 런타임 UID 매칭은 저장된 `id` 규칙과 댓글 DOM channel ID를 로컬 비교. YouTube Data API 호출 없음.
- regex 자동 추가 시 매칭 handle을 `handle` 규칙으로 저장. 같은 채널 다음 댓글은 regex 전 handle 확인.
- channel ID 읽기 순서: `/channel/UC...` link → `data-channel-id` → `channel-id` attribute. pair mode에서 handle은 있으나 channel ID 없으면 `window.__ytCommentBlockerPerf.missingChannelIds` counter 증가.

댓글별 매칭 순서:

1. 선택된 신원 규칙 타입(`pair`는 `id`, `handle`은 `handle`)
2. Regex

키워드 자동 처리:

- 선택된 댓글 본문/작성자 handle/고정 표시 문구만 읽음.
- 저장 키워드 최대 50개, 대소문자 무시 부분 일치.
- 선택 동작은 댓글 DOM 노드당 1회.
- `channel ID pair 생성`: 먼저 작성자 handle 추가. 기본 페이지 조회는 API 키 불필요.

## 5. Pair 및 API 흐름

channel ID 조회:

1. 기본: userscript의 YouTube origin에서 `https://www.youtube.com/@<url-encoded-handle>`를 요청.
2. 공개 채널 HTML에서 `externalId`, `channelId`, `itemprop="channelId"` 순으로 읽음.
3. undocumented parser라 YouTube HTML 변경 시 실패 가능. HTTP/channel ID 미검출 시 기존 pair 유지, 재시도/API fallback 안내.
4. 명시적 API 방식: `GET https://www.googleapis.com/youtube/v3/channels`에 `part=id`, `forHandle=@handle`, `key=<apiKey>` 전송.

저장 UID 확인:

1. 같은 endpoint에 `part=id`, `id=<저장 UID>` 전송.
2. 저장 channel ID가 계속 조회되면 verified 유지.
3. 선택적으로 독립 handle 재조회해 UID 교체 확인.

API 키 테스트:

1. 저장 API 키 사용.
2. 같은 API 계열에 `part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw` probe 전송.
3. 최신 결과를 `lastTestResult`에 저장.
4. 관리자에 category/메시지 표시.

Fallback 동작:

- channel ID 조회 실패해도 handle 방식 동작. pair 방식은 verified `id` 규칙 필요.
- 실패 pair는 `unverified`/`stale` 유지.
- 조회 실패만으로 기존 pair 삭제 금지.
- pair update에서 다른 UID 조회 시 pair와 `id` 규칙을 최신 UID로 교체. stale ID의 이전 채널 오매칭 방지.
- API fallback 기본 off. 저장 API 키와 함께 켜면 페이지 조회 실패 후만 실행. off면 API 요청 없음.

API 호출 최소화:

- `Create Pair`: missing/unverified handle pair만 조회.
- pair 결과는 pair metadata/페이지 메모리에 cache. 기본 갱신: 페이지 조회 10분, API 조회 1주. 선택 handle `Update Pair`는 강제 갱신.
- 주기: handle 갱신마다, 1분, 5분, 10분, 1시간, 12시간, 1일, 1주, 1개월, 검증된 직접 초 입력.
- 새 handle 추가 즉시 조회가 기본. Settings에서 비활성화 가능.
- pair 갱신에서 저장 UID 확인/handle 재조회 각각 선택. 하나는 항상 켬.
- 선택 handle bulk `Update Pair`는 명시적 사용자 요청. fresh여도 재조회.
- watch pair 검토 알림은 `나중에` 선택 또는 최근 pair 검사 후 같은 stale 주기 동안 숨김.

## 6. 관리자 대화상자

섹션:

- 현재 userscript 버전 표시 script info
- 매칭/API 키/UID pair/이동 버튼 제어
- regex 추가
- 규칙 목록

규칙 목록 도구:

- display label 기준 case-insensitive substring 검색
- 타입 필터: `all`, `handle`, `id`, `regex`
- handle 태그 필터: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- row 선택, 보이는 결과 전체 선택, bulk action
- `selected / visible / total` 카운터

Regex 행:

- 매칭 차단 handle 수 표시
- `Select matching handles`
- inline handle 목록 펼침
- 기본 20개, `Show more`로 페이지 단위 확장
- 접힌 행은 count 중심 cache. 전체 match 배열은 expand/select 때 계산.
- selection-only/regex 펼침·접힘은 전체 목록 재생성 없이 보이는 checkbox/해당 행만 갱신.

Pair 결과:

- pair 실행은 요약 수치 + handle별 outcome 반환.
- 관리자 `Last Pair Run` 패널.
- 상세: outcome 필터, 실행 순서/outcome/handle 정렬, 실패 handle 복사/내보내기.
- watch 배너 update는 상세 dialog 열기 가능.

삭제 동작:

- `handle` 규칙 삭제 시 paired UID 규칙/pair 메타데이터도 삭제.
- `Clear block list`: 규칙/pair 메타데이터 모두 비움.

## 7. Dialog, 메뉴, 실시간 i18n

설정 dialog:

- `GM_setting` 참고 카테고리 목록 레이아웃. 작업 그룹별 제목/컨트롤/짧은 도움말.
- 중첩 dialog의 Escape/Enter/Tab/backdrop은 최상위 dialog만 처리. 닫을 때 이전 element로 focus 복원.
- API test/pair 작업은 `finally`로 loading control 복구. 동시 수동·keyword pair 요청은 busy skip 대신 현재 실행 공유.
- debug metrics: page mode, comments host·extraction failure counter, 최근 selector reason. 댓글 본문/URL/API 키/계정 정보 제외.
- 변경 자동 저장 안내.
- 컨트롤 구분: 매칭, 댓글 표시, 키워드 자동 처리, 로그, 표시 크기, 유지보수.
- 기본 선택지에 회색 `(기본)` 표시.
- handle 대소문자 설정.
- 신원 차단: `handle` 규칙 또는 UID pair `id` 규칙.
- regex 매칭 handle 자동 추가.
- 자동 싫어요 mode.
- 키워드 전체 토글. 정규식 편집기/키워드 규칙/검사 대상/일치 동작은 차단 및 키워드 자동 처리 창으로 이동.
- 라이트, 다크, 기기설정, 기기설정(반대), yt설정, yt설정(inverted), 커스텀 테마.
- 커스텀 테마 창: 배경, 표면, 텍스트, 보조 텍스트, 테두리, 주요 동작, 파괴적 동작 색상 편집; 기본값 복원/입력 검증.
- 저장 로그/브라우저 console 로그 개별 토글, 로그 수준, 보관 수, 다운로드/삭제.
- 차단 댓글 표시 mode.
- 글자/UI 크기 5단계. 2단계는 기존 크기, 3단계 기본.
- 설정→차단 목록, 차단 목록→설정 버튼.
- 차단 목록/설정/차단 및 키워드 자동 처리 창 이동 버튼.
- 앱 표시/매칭 설정 초기화 전 빨간 파괴적 버튼 + 확인 dialog.
- YouTube Data API v3 키/테스트.
- 저장 UID 확인/handle 재조회 pair 갱신 검사.
- UID detection, pair 요약/action.
- API 응답 대기 중 loading bar.
- `window.__ytCommentBlockerPerf` 기반 debug counter.

보안:

- `Dialog.show()`는 raw HTML 삽입 안 함.
- string body는 plain text 렌더.

실시간 i18n:

- 언어 변경 시 menu command unregister 후 재register.
- 열린 dialog는 refresh hook으로 label 즉시 갱신.
- pair banner도 in-place 갱신.

메뉴 주입:

- `⋯` 메뉴는 상시 global popup observer 미사용.
- 클릭 댓글의 `ytd-menu-renderer`에서 단기 observer 시작. 버튼 wrapper 변경에도 handle 탐색 유지.
- 재사용 popup/나중 삽입 menu에 handle별 항목 하나만 추가.
- 주입 항목에 `CB` 표식. 이미 차단된 handle은 차단 해제로 갱신. popup 처리/timeout/navigation 시 observer 종료.

댓글 관찰:

- `watch`: 기존 `ytd-comments#comments, ytd-comments` host 탐색 유지.
- `shorts`: comment node 중심 host 탐색. `body`, `html`, `ytd-app`보다 좁은 공통 container가 있을 때만 comment observer 연결.
- page key 변경 시 임시 `IntersectionObserver` 등록/댓글 metadata cache 초기화. 재사용 comments host가 여러 영상의 분리 댓글 노드를 붙잡는 문제 방지.
- pair banner gating은 watch-only.

## 8. 탭 간 동기화

다른 탭에서 다음 Tampermonkey 값 변경 시 로컬 상태 갱신:

- `blocked_v2`
- `pair_meta_v1`
- `youtube_data_api_v3_config`
- `app_settings_v1`
- `lang`

lookup cache, 열린 UI, watch 배너도 다시 그림.

## 9. 가져오기 및 내보내기

import/export 대상: `blocked_v2`만.

plain-text 항목:

- `@handle`
- `UC...`
- `/regex/`
- `/regex/flags`

Regex literal export 시 `/`를 `\/`로 escape. import는 escaped 형태 허용.

내보내기 dialog에서 차단 목록 복귀 또는 규칙 데이터를 `youtube-comment-blocker-export.json`/`youtube-comment-blocker-export.txt`로 다운로드.

JSON 형태:

- `items`가 있는 V2 객체
- `handles`가 있는 레거시 V1 객체

## 10. 문제 해결

댓글이 숨겨지지 않을 때:

1. watch/Shorts 페이지인지 확인.
2. 관리자 규칙 확인.
3. UID 매칭이면 `UID Detection` 확인.
4. API 키 저장 확인.
5. pair 없음/`unverified`면 `Create Pair` 또는 `Update Pair` 실행.

Pair 유지보수 실패 시:

1. `Test API Key` 실행.
2. 저장된 `lastTestResult` category/메시지 확인.
3. `Last Pair Run`에서 handle별 실패/mismatch 확인.

API 키 테스트가 반복 `quota` 보고 시 연속 quota 실패 횟수 추적. 마지막 quota 실패 시점 기준 24시간 reset window 안내.

## 11. 이후 작업

`v1.5.0` 이후 큰 관리자/보안/i18n/regex-selection 성능/Shorts 댓글 숨김/긴 세션 메모리 정리/pair update 최소화/버전 표시/설정 dialog/regex 자동 추가/관리자 polish TODO는 기본 완료 상태. 이후는 베이스라인 구현보다 점진적 개선 중심.
