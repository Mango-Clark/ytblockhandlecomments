# 📚 YouTube Comment Blocker 위키 — v0.7.0

[English](WIKI.md) | [한국어](WIKI.ko.md)

이 문서는 [`README.md`](../README.md)보다 현재 구현을 더 자세히 설명합니다.

## 1. 개요

이 사용자 스크립트는 watch 페이지와 Shorts 페이지에서 YouTube 댓글을 채널 식별자
기준으로 숨깁니다.

소스 구조:

- `src/`는 역할별 소스 조각을 담으며, 한국어와 영어 i18n dictionary는 별도 파일로
  분리합니다.
- `ytblockhandlecomments.js`는 단일 Tampermonkey 배포 파일로 유지합니다.
- `npm run build`는 `src/`에서 루트 userscript를 다시 생성합니다.
- `npm run check:build`는 루트 userscript와 `src/`가 동기화되어 있는지 확인합니다.
- Chrome/Tampermonkey는 `src/` 파일을 직접 로드하지 않고 생성된 루트 userscript만
  사용합니다.
- 생성된 루트 userscript는 설치/업데이트 payload를 줄이기 위해 압축됩니다.
- 동작을 바꾸는 커밋은 변경된 `src/` 파일과 다시 빌드된 `ytblockhandlecomments.js`를
  함께 포함해야 합니다.

`blocked_v2`에서 지원하는 규칙 타입:

- `handle`
- `id`
- `regex`

지원하는 로컬 저장소:

- `blocked_v2`
- `pair_meta_v1`
- `app_settings_v1`
- `youtube_data_api_v3_config`

사용자 진입점:

- 댓글 작성자 handle 우클릭
- 댓글 `⋯` 메뉴 주입 항목
- Tampermonkey 메뉴의 `Manage block list`
- watch 페이지 pair 검토 배너

댓글 숨김 지원 page mode:

- `watch`
- `shorts`

범위 밖 기능:

- 댓글 본문 키워드 차단
- pair 메타데이터 import/export
- 백그라운드 polling 기반 pair 자동 갱신

## 2. 메타데이터와 런타임

- `@version`: `0.7.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`
- 실행 시점: `document-idle`

댓글 매칭과 숨김은 계속 watch 페이지와 Shorts 댓글 범위로 제한됩니다. 자동 싫어요는
기본값이 안함이며, 새로 숨길 때만 또는 차단 댓글이 숨겨진 상태에서 항상으로 바꿀 수 있고 이미
눌린 싫어요 버튼은 다시 토글하지 않습니다.

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
  dislikeMode: 'none' | 'new-hidden' | 'always'
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

- 레거시 `blockedHandles`, `blockedHandles_v1`는 계속 자동 마이그레이션됩니다
- 기본 `app_settings_v1.dislikeMode`는 `none`입니다
- pair 메타데이터와 API 설정은 import/export에 포함되지 않습니다

## 4. 매칭 모델

항상 켜져 있는 동작:

- handle 차단은 항상 유지됩니다
- regex 규칙은 추출된 handle 텍스트에만 적용됩니다
- regex 규칙은 pattern 길이, flag, 대상 길이, 위험한 backtracking 형태에 대한 safety
  제한을 넘으면 저장하지 않습니다

대소문자 구분:

- `app_settings_v1.handleCaseSensitive`로 제어합니다
- `false`: 소문자 정규화 비교
- `true`: exact handle 비교
- 과거 소문자 저장 handle은 strict exact 비교를 위해 재저장이 필요할 수 있습니다

선택적 UID 동작:

- `pair_meta_v1.enableUidDetection`으로 제어합니다
- `id` 규칙은 UID 감지가 켜져 있을 때만 매칭에 참여합니다
- UID 감지를 꺼도 저장된 `id` 규칙과 pair 메타데이터는 유지됩니다
- 런타임 UID 매칭은 저장된 `id` 규칙과 댓글 DOM에 이미 있는 channel ID를 로컬에서
  비교하며 YouTube Data API를 호출하지 않습니다
- regex 자동 추가를 켜면 regex로 매칭된 handle을 `handle` 규칙으로 저장해, 같은
  채널의 다음 댓글은 regex 전에 handle 기준으로 확인합니다

댓글별 매칭 순서:

1. 채널 ID
2. Handle
3. Regex

## 5. Pair 및 API 흐름

UID 조회:

1. `youtube_data_api_v3_config`에서 API 키를 읽습니다
2. `GET https://www.googleapis.com/youtube/v3/channels`를 호출합니다
3. `part=id`, `forHandle=@handle`, `key=<apiKey>`를 보냅니다
4. `items[0].id`를 읽습니다

API 키 테스트:

1. 저장된 API 키를 사용합니다
2. 같은 API 계열에 `part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw` probe를 보냅니다
3. 최신 결과를 `lastTestResult`에 저장합니다
4. 관리자에서 category와 메시지를 보여줍니다

Fallback 동작:

- UID 조회가 실패해도 handle 차단은 계속 동작합니다
- 실패한 pair는 `unverified` 또는 `stale` 상태로 남습니다
- 조회 실패만으로 기존 pair 데이터를 조용히 삭제하지 않습니다
- pair update에서 다른 UID가 조회되면 저장된 pair와 `id` 규칙을 최신 UID로 교체해
  stale ID가 예전 채널에 계속 매칭되지 않도록 합니다

API 호출 최소화:

- `Create Pair`는 missing 또는 unverified handle pair만 조회합니다
- 기본 `Update Pair`는 stale 주기가 지나기 전의 fresh verified pair를 건너뜁니다
- 선택 handle bulk `Update Pair`는 명시적 사용자 요청으로 보고, 선택한 handle은 fresh
  상태여도 다시 조회합니다
- watch 페이지 pair 검토 알림은 `나중에` 또는 최근 pair 검사 후 같은 stale 주기 동안
  표시되지 않습니다

## 6. 관리자 대화상자

섹션:

- 현재 userscript 버전을 보여주는 script info 섹션
- regex 추가 섹션
- 규칙 목록 섹션

규칙 목록 도구:

- display label 기준 case-insensitive substring 검색
- 타입 필터: `all`, `handle`, `id`, `regex`
- handle 태그 필터: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- row 선택, 현재 보이는 결과 전체 선택, bulk action
- `selected / visible / total` 카운터 표시

Regex 행:

- 매칭되는 차단 handle 개수 표시
- `Select matching handles` 지원
- inline handle 목록 펼치기 지원
- 기본 20개만 표시하고 `Show more`로 페이지 단위 확장
- 접힌 regex 행은 count 중심 캐시를 쓰고, 전체 match 배열은 expand/select 때만 계산
- selection-only와 regex 펼침/접힘은 전체 목록 재생성 없이 보이는 checkbox와 해당 행
  상태만 갱신

Pair 결과:

- pair 실행은 요약 수치와 handle별 outcome을 함께 반환합니다
- 관리자에는 `Last Pair Run` 패널이 표시됩니다
- pair 실행 상세는 outcome 필터, 실행 순서/outcome/handle 정렬, 실패 handle
  복사/내보내기를 지원합니다
- watch 페이지 배너에서 실행한 update는 상세 dialog를 열 수 있습니다

삭제 동작:

- `handle` 규칙을 지우면 paired UID 규칙과 pair 메타데이터도 함께 제거됩니다
- `Clear block list`는 규칙과 pair 메타데이터를 함께 비웁니다

## 7. Dialog, 메뉴, 실시간 i18n

설정 dialog:

- handle 대소문자 구분
- regex 매칭 handle 자동 추가
- 자동 싫어요 mode
- YouTube Data API v3 키/테스트 제어
- UID detection, pair 요약, pair 액션
- `window.__ytCommentBlockerPerf` 기반 debug counter

보안:

- `Dialog.show()`는 더 이상 raw HTML을 삽입하지 않습니다
- string body는 plain text로만 렌더됩니다

실시간 i18n:

- 언어 변경 시 menu command를 unregister 후 다시 register합니다
- 열린 dialog는 refresh hook으로 label을 즉시 갱신합니다
- pair banner도 같은 방식으로 in-place 갱신됩니다

메뉴 주입:

- `⋯` 메뉴는 더 이상 상시 global popup observer를 사용하지 않습니다
- 관련 버튼 클릭 후에만 짧은 수명 observer를 붙입니다
- popup 처리, timeout, navigation 시 observer를 끕니다

댓글 관찰:

- `watch`는 기존 `ytd-comments#comments, ytd-comments` host 탐색을 유지합니다
- `shorts`는 comment node 중심으로 host를 찾고, `body`, `html`, `ytd-app` 같은 넓은
  container보다 더 좁은 공통 container가 있을 때만 comment observer를 붙입니다
- page key가 바뀌면 임시 `IntersectionObserver` 등록과 댓글 메타데이터 캐시를
  초기화해 YouTube가 comments host를 재사용해도 여러 영상에 걸쳐 분리된 댓글 노드를
  붙잡지 않도록 합니다
- pair banner gating은 계속 watch-only입니다

## 8. 탭 간 동기화

다음 Tampermonkey 값이 다른 탭에서 바뀌면 로컬 상태를 갱신합니다.

- `blocked_v2`
- `pair_meta_v1`
- `youtube_data_api_v3_config`
- `app_settings_v1`
- `lang`

갱신 시 lookup cache, 열린 UI, watch 페이지 배너도 함께 다시 그립니다.

## 9. 가져오기 및 내보내기

지원되는 import/export 대상은 `blocked_v2`만입니다.

지원하는 plain-text 항목:

- `@handle`
- `UC...`
- `/regex/`
- `/regex/flags`

Regex literal은 export 시 `/`를 `\/`로 escape하고, import 시 escaped 형태를
받아들입니다.

지원하는 JSON 형태:

- `items`가 있는 V2 객체
- `handles`가 있는 레거시 V1 객체

## 10. 문제 해결

댓글이 숨겨지지 않을 때:

1. watch 페이지 또는 Shorts 페이지인지 확인합니다.
2. 관리자에 규칙이 있는지 확인합니다.
3. UID 매칭을 기대한다면 `UID Detection`이 켜져 있는지 확인합니다.
4. API 키가 저장돼 있는지 확인합니다.
5. pair가 없거나 `unverified`면 `Create Pair` 또는 `Update Pair`를 실행합니다.

Pair 유지보수가 실패할 때:

1. `Test API Key`를 실행합니다.
2. 저장된 `lastTestResult` category와 메시지를 확인합니다.
3. `Last Pair Run`에서 handle별 실패나 mismatch를 확인합니다.

API 키 테스트가 반복해서 `quota`를 보고하면 관리자는 연속 quota 실패 횟수를 추적하고
마지막 quota 실패 시점 기준 24시간 reset window 안내를 표시합니다.

## 11. 이후 작업

`v0.7.0` 이후에는 큰 관리자/보안/i18n/regex-selection 성능/Shorts 댓글 숨김/긴 세션
메모리 정리/pair update 최소화/버전 표시/설정 dialog/regex 자동 추가/관리자 polish
TODO가 기본적으로 마무리된 상태로 봅니다. 이후 작업은 베이스라인 미구현이 아니라
점진적 개선 중심으로 다룹니다.
