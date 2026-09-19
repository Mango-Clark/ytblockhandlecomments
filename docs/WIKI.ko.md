<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# 📚 YouTube Comment Blocker 위키 — v1.5.3

[English](WIKI.md) | [한국어](WIKI.ko.md)

현재 구현 상세. [`README.md`](../README.md)보다 구체적.

## 1. 개요

watch/Shorts 페이지 YouTube 댓글을 채널 식별자로 숨기는 사용자 스크립트.

소스 구조:

- `src/`: 역할별 소스 조각. 한국어/영어 i18n dictionary 별도 파일.
- 숫자 접두사는 권장 읽기 순서이며 실제 실행 순서는 ES module import가 결정. 문자 접미사는 분리한 module을 상위 기능 옆에 유지.
- `03-app-settings-storage.ts`, `04-storage-v2.ts`, `05-pair-meta-storage.ts`, `06-api-config-storage.ts`, `15-logger.ts`는 오류 안전 `03a-gm-backed-store.ts` adapter를 공유하면서 각 schema·동기화 규칙은 분리 유지.
- `12-block-list-manager.ts`는 안정적인 공개 진입점. `12a`–`12d`는 목록 상태·설정/API lifecycle·내보내기 helper·pairing lifecycle을 담당하고 `12e-manager-runtime.ts`가 manager UI를 조합.
- `13-app.ts`는 저장소·매칭·pairing·메뉴·탐색을 조정하고 `14-bootstrap.ts`는 단일 시작을 보장하며 test surface를 노출.
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

YouTube `/embed*` player 문서는 userscript metadata에서 제외하므로 외부 embedded player에서 스크립트를 시작하지 않음.

일치하는 watch/Shorts root만 관찰. frame당 host 확인 묶음. 실패 mutation batch 20회 후 중단. navigation/새 page key에서 재시도 budget 초기화.

Shorts는 comment root 주변 가장 가까운 non-comment panel 관찰. panel 갱신 후 형제 댓글·reply도 계속 관찰.

page 동기화: `yt-navigate-finish`, `yt-page-data-updated`, `popstate`, `history.pushState()`, `history.replaceState()`. 파생 page key 변경 때만 임시 관찰 상태 초기화.

범위 밖:

- pair 메타데이터 import/export
- 백그라운드 polling 기반 pair 자동 갱신

## 2. 메타데이터와 런타임

- `@version`: `1.5.3`
- `@match`: `https://www.youtube.com/*`
- `@exclude`: `https://www.youtube.com/embed*`
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
  lowPerformanceMode: boolean,
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
    category: 'ok' | 'invalid' | 'quota' | 'forbidden' | 'network' | 'timeout' | 'cancelled' | 'unknown',
    httpStatus: number | null,
    message: string
  } | null
}
```

저장 로그 상태(`yt_comment_blocker_logs_v1`):

```ts
{
  version: 2,
  clearRevision: { counter: number, writer: string },
  entries: Array<{
    id: string,
    revision: { counter: number, writer: string },
    at: number,
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    detail?: string
  }>
}
```

참고:

- 유효한 `blocked_v2` 없을 때만 레거시 `blockedHandles`, `blockedHandles_v1` 자동 migration. 이후 삭제/전체 초기화 시 legacy 복원 안 함.
- 탭 간 `blocked_v2` 변경에 선택적 항목별 revision, tombstone, clear revision 저장. 동시 추가 병합. 추가/삭제/전체 초기화 충돌은 높은 revision 기준, echo write 없이 수렴.
- 탭 간 `pair_meta_v1` 변경은 handle별 revision과 삭제 tombstone을 저장. 전체 초기화는 clear 시점보다 오래된 pair를 숨기고 이후 추가는 유지. UID 감지는 revision 순서, 검사 시각과 알림 dismiss 시각은 더 큰 timestamp가 승리하여 뒤로 가지 않음. 같은 remote 전달은 멱등 처리.
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
- 로그 기본 꺼짐. 파일 로그는 삭제 전까지 Tampermonkey 저장소에 보관. 다운로드 시간은 UTC ISO 형식이며 위치는 브라우저 설정 따름.
- 기존 배열 로그는 고정 길이 deterministic ID를 받은 뒤 다음 쓰기 때 메모리에서 version 2로 migration하여 긴 항목의 reload·탭 간 병합 중복을 방지. 같은 turn의 항목은 한 번에 쓰고 상태/다운로드는 대기 항목을 즉시 반영.
- 탭 간 로그 추가는 항목 revision으로 병합. 삭제 revision이 오래된 원격 항목 복원을 막고 보관 수 감소는 즉시 trim.
- 실시간 로그 변경은 열린 설정 dialog의 저장 로그 상태·미리보기·동작 가능 여부만 갱신하며, 관련 없는 dialog와 저장 전 설정 입력값은 다시 렌더링하지 않음.
- Tampermonkey가 권한/용량/저장소 문제로 설정, 차단 목록, pair 메타데이터, API 키, 로그 쓰기 거부 시 메모리 상태도 유지. 성공 알림 대신 오류/재시도 안내.
- console 로그 기본 prefix `[YTCB]`; 시간 표시 꺼짐. preset은 확장·basic calendar date, week date, ordinal date, time 지원. 직접 ISO 형식은 `yyyy`, `yy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, `W` 조합. basic/extended time과 timezone token 동시 사용 가능. timezone: system, `-12`~`+14` UTC offset, 목록 IANA 도시, 검증된 직접 IANA/KST식 약어.
- `app_settings_v1.verboseLevel` 기본 `3`. V0/V1 진단 payload 생략; V2 1필드, V3 3필드, V4 6필드, V5 10필드. 이벤트 수가 아닌 payload 범위만 변경. 콘솔/저장 전 API 키·token·account·comment·handle·사용자 식별자를 나타내는 필드는 생략. Bearer token, JWT, Google 또는 혼합 문자 API 키, URL, handle, channel ID, email처럼 식별 가능한 자격 증명·식별자 값은 제거하고 circular/대형 payload를 안전 절단.
- 기본 `app_settings_v1.fontSizeLevel`/`app_settings_v1.uiScaleLevel`: `3`; `2`는 이전 시각 크기.
- pair 메타데이터/API 설정은 import/export 제외.

## 4. 매칭 모델

신원 매칭:

- `app_settings_v1.blockMatchMode`: 활성 신원 규칙 타입 선택.
- `handle`: 기본. 저장된 `handle` 규칙 매칭.
- `pair`: UID 감지 후 저장된 `id` 규칙 매칭.
- regex는 추출된 handle 텍스트에만 적용.
- regex pattern은 입력 기준 256자, 중복 없는 `gimsuy` flag로 제한하며 handle의 앞 128자만 매칭합니다. 실행 시에는 `RegExp.source`가 escape한 literal 슬래시·줄바꿈 문자를 복원한 후 길이를 검사하여 엔진이 추가한 escape 때문에 허용된 규칙이 비활성화되지 않도록 합니다.
- 중첩 그룹·대안·연속 반복의 구조 복잡도를 native 매칭 전에 제한하여 [ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)를 방지합니다. 매칭 후 5ms 검사는 결과 필터이며 실행을 중단하는 timeout이 아닙니다.
- 보수적 허용 범위에는 literal·문자 클래스·anchor·일반/비캡처 그룹·대안·복잡도 제한 내 반복이 포함됩니다(추정 경로 4,096개, 확장 단위 1,024개, 반복 최대 128회). lookaround·역참조·이름 있는 그룹·빈 문자열에 일치할 수 있는 그룹의 반복은 지원하지 않습니다. `^@.*promo.*$`처럼 문법상 유효해도 제한을 넘는 패턴은 `^@.*promo`와 같은 단순한 규칙으로 바꾸세요.
- 대안이나 가변 반복이 포함된 그룹은 두 번 이상 반복할 수 없으며 `(a|aa){12}`처럼 고정 횟수도 거부합니다. `(?:ab){12}`처럼 경로가 하나인 그룹의 반복과 반복 그룹 밖의 대안은 계속 지원합니다.
- 허용 범위를 벗어난 regex는 로드·탭 간 동기화 시 건너뛰며 편집기·JSON/텍스트 가져오기로 추가되지 않습니다. 유효한 handle·ID·regex 규칙은 계속 적용됩니다.

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
4. 페이지/API 조회에는 제한 시간이 있습니다. 시간 초과는 일반 네트워크 실패와 별도 category로 기록하고, 명시적 작업 취소는 `cancelled`로 구분합니다.
5. 명시적 API 방식: `GET https://www.googleapis.com/youtube/v3/channels`에 `part=id`, `forHandle=@handle`, `key=<apiKey>` 전송.

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
- bulk pair 실행은 handle 조회를 최대 8개까지 동시에 처리하고 결과 목록의 입력 순서를 유지.
- 공유 pair 작업을 취소하면 실행 중인 요청을 중단하고 대기 중인 handle을 건너뛰며 취소 fallback 상태를 저장하지 않습니다. 관리자 창을 닫으면 해당 UI 세대만 분리되고 다른 호출자가 공유하는 app 작업은 계속됩니다.
- watch pair 검토 알림은 `나중에` 선택 또는 최근 pair 검사 후 같은 stale 주기 동안 숨김.

## 6. 관리자 대화상자

섹션:

- 현재 userscript 버전 표시 script info
- 매칭/API 키/UID pair/이동 버튼 제어
- regex 추가
- 규칙 목록

Lifecycle 소유권:

- 열린 각 차단 목록 dialog는 선택·필터·페이지·cache·예약 검색 작업과 폐기를 직접 소유.
- API key test와 pair 실행은 독립된 busy 상태와 작업 세대를 사용. dialog를 닫거나 교체하면 해당 세대가 무효화되어 늦게 끝난 비동기 결과가 새 dialog를 갱신하거나 이전 loading 상태를 복원하지 않음.
- 폐기 시 예약 검색 rendering을 취소하고 임시 set·map·row 참조·계산된 view cache를 비우되, 인접 dialog용으로 명시적으로 저장한 view 상태는 보존.

규칙 목록 도구:

- display label 기준 case-insensitive substring 검색
- 타입 필터: `all`, `handle`, `id`, `regex`
- handle 태그 필터: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- 같은 페이지에서 인접 관리자 창 방문 후 검색·필터·유효한 선택·스크롤 위치 복원
- 현재 선택을 유지하는 원클릭 필터 초기화
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

### 성능 및 저성능 모드

- 설정 → **저성능 모드**는 기본 꺼짐이며 `app_settings_v1.lowPerformanceMode`에 저장됩니다. 탭 간 동기화와 설정 초기화를 지원하며, 해당 필드가 없는 기존 저장소는 일반 모드를 유지합니다.
- 차단 목록·페어 결과는 일반 모드에서 페이지당 100개, 저성능 모드에서 50개를 표시합니다. 검색·필터·전체 선택은 모든 페이지의 일치 항목에 적용됩니다. 인접 대화상자를 오가도 페이지·선택을 보존하며 필터 변경 시 첫 페이지로 돌아갑니다.
- 저성능 모드는 검색 입력을 200ms 지연하고 차단 추가 시 자동 채널 조회·키워드 기반 자동 페어 생성을 중단합니다. 기존 자동화 설정값은 보존합니다. 수동 페어 생성·갱신은 유지하며 동시 요청을 8개에서 1개로 줄입니다. 시작된 요청은 완료시키고 대기 중인 자동 작업은 건너뜁니다. 모드를 꺼도 건너뛴 조회를 일괄 실행하지 않습니다.
- 기존 handle/UID/정규식 매칭·키워드 차단·싫어요 동작은 유지합니다. 페어 차단 방식에서는 저성능 모드 사용 중 새 UID 연결을 수동으로 생성해야 합니다.
- 댓글 작업은 일반 모드에서 50개 또는 8ms, 저성능 모드에서 20개 또는 4ms마다 나눠 처리합니다. 후속 작업은 일반 모드에서 다음 animation frame, 저성능 모드에서 50ms 뒤에 실행합니다. 단일 댓글 처리는 이 시간 예산을 초과할 수 있습니다. host·페이지 전환 초기화 시 대기 작업을 해제합니다.
- 설정·목록 초기 렌더링은 한 번 수행합니다. 페어 요약은 데이터나 만료 상태가 바뀔 때 재계산하며 상태 조회마다 전체 페어를 정규화하지 않습니다. 로그 상태 조회는 전체 항목 복사·강제 저장을 하지 않습니다. 저장 데이터 갱신 시 미저장 설정 입력을 보존합니다.
- 성능 테스트는 규칙 100/500/1,000개, 표시 행·작업 묶음 상한, 정리, 저장 실패 복구, 탭 간 동작을 검증합니다. 실제 Chrome 메모리·종료 증상 개선은 해당 브라우저에서 확인해야 하며 자동 DOM 테스트만으로 RAM 감소율을 확정하지 않습니다.

## 7. Dialog, 메뉴, 실시간 i18n

설정 dialog:

- `GM_setting` 참고 카테고리 목록 레이아웃. 작업 그룹별 제목/컨트롤/짧은 도움말.
- 중첩 dialog의 Escape/Enter/Tab/backdrop은 최상위 dialog만 처리. 닫을 때 이전 element로 focus 복원.
- API test/pair 작업은 `finally`로 loading control 복구하고 조회에 제한 시간을 둡니다. 동시 수동 요청은 현재 실행을 공유하고, 자동 요청은 건너뛰지 않고 실행 종료까지 대기합니다. 창을 닫으면 UI만 분리되고 공유 app 작업은 취소하지 않습니다.
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
- 출력 대상·기록 상세도·콘솔 표시 형식·저장 로그 관리 하위 그룹.
- 저장 수/마지막 항목 상태, 콘솔 미리보기, 테스트 출력, 즉시 보관량 정리, 다운로드, 확인 후 삭제.
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

- 매칭 관련 설정만 cache된 comment matcher를 무효화. 표시·테마·logging·pair 정책·API 설정 UI 변경은 matcher를 재구성하거나 댓글 검사를 예약하지 않고 열린 dialog만 갱신.
- userscript가 반복 평가되어도 stylesheet와 app은 한 번만 시작. 연속 알림은 하나의 toast live region을 재사용하고 대기 timer를 교체.
- `watch`: 기존 `ytd-comments#comments, ytd-comments` host 탐색 유지.
- `shorts`: comment node 중심 host 탐색. `body`, `html`, `ytd-app`보다 좁은 공통 container가 있을 때만 comment observer 연결.
- page key 변경 시 임시 `IntersectionObserver` 등록/댓글 metadata cache 초기화. 재사용 comments host가 여러 영상의 분리 댓글 노드를 붙잡는 문제 방지.
- 댓글 mutation은 animation frame마다 한 번으로 합침. 화면 밖 댓글은 viewport에 들어오기 전까지 매칭·키워드 동작 없이 관찰만 하고, 보이는 댓글은 관련 mutation·설정 변경 후 다시 평가.
- 이전에 차단된 댓글은 화면 밖에서도 규칙 제거 갱신 대상에 포함하고 분리되었거나 더는 관찰하지 않는 댓글의 callback은 무시.
- pair banner gating은 watch-only.

## 8. 탭 간 동기화

다른 탭에서 다음 Tampermonkey 값 변경 시 로컬 상태 갱신:

- `blocked_v2`
- `pair_meta_v1`
- `youtube_data_api_v3_config`
- `app_settings_v1`
- `lang`

lookup cache, 열린 UI, watch 배너도 다시 그림.

pair metadata는 handle별 last-writer revision으로 병합하고 삭제는 tombstone, 전체 삭제는 clear revision으로 보존합니다. UID 감지 설정은 revision 순서로 충돌을 해결하며 `lastPairCheckAt`과 `pairNotificationDismissedAt`은 절대 감소하지 않습니다. 최신 상태를 추가하는 경우에만 병합 snapshot을 다시 저장하고, 저장 거부 시 로컬 상태를 복구합니다.

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
4. pair 없음/`unverified`면 `Create Pair` 또는 `Update Pair` 실행.
5. API 조회 또는 fallback을 켰다면 API 키 저장·테스트 확인.

Pair 유지보수 실패 시:

1. `Last Pair Run`에서 handle별 실패/mismatch 확인.
2. 페이지 조회라면 재시도하거나 저장·테스트한 키로 API fallback 활성화.
3. API 조회 또는 fallback이라면 `Test API Key`를 실행하고 저장된 `lastTestResult` category/메시지 확인.

API 키 테스트가 반복 `quota` 보고 시 연속 quota 실패 횟수 추적. 마지막 quota 실패 시점 기준 24시간 reset window 안내.

## 11. 이후 작업

`v1.5.3` 이후 큰 관리자/보안/i18n/regex-selection 성능/Shorts 댓글 숨김/긴 세션 메모리 정리/pair update 최소화/버전 표시/설정 dialog/regex 자동 추가/관리자 polish TODO는 기본 완료 상태. 이후는 베이스라인 구현보다 점진적 개선 중심.
