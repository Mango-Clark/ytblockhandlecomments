# 📚 YouTube Comment Blocker 위키 — v1.4.0

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
- 채널, 검색, 영상 설명, 댓글 본문의 handle 링크는 YouTube 기본 context menu를 유지
- 댓글 `⋯` 메뉴 주입 항목
- Tampermonkey 메뉴의 `Manage block list`
- watch 페이지 pair 검토 배너

댓글 숨김 지원 page mode:

- `watch`
- `shorts`

댓글 host 탐색은 일치하는 watch 또는 Shorts root만 관찰합니다. frame당 host 확인을 묶고, 성공하지 못한 mutation batch 20회 뒤 중단합니다. navigation 또는 새 page key는 재시도 budget을 초기화합니다.

Shorts에서는 단일 comment renderer가 아니라 comment root 주변의 가장 가까운 non-comment panel에 observer를 붙입니다. panel 갱신 뒤 형제 댓글·reply도 계속 관찰합니다.

page 동기화는 `yt-navigate-finish`, `yt-page-data-updated`, `popstate`, `history.pushState()`, `history.replaceState()`에 반응합니다. 파생 page key가 바뀐 경우에만 임시 관찰 상태를 초기화합니다.

범위 밖 기능:

- pair 메타데이터 import/export
- 백그라운드 polling 기반 pair 자동 갱신

## 2. 메타데이터와 런타임

- `@version`: `1.4.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`
- 실행 시점: `document-idle`

댓글 매칭은 계속 watch 페이지와 Shorts 댓글 범위로 제한됩니다. 매칭된 댓글은 완전히
숨기거나, 회색 대체 문구로 바꾸거나, 클릭해서 볼 수 있는 대체 문구로 바꿀 수
있습니다. 자동 싫어요는 기본값이 안함이며, 새로 숨길 때만 또는 차단 댓글이 숨겨진
상태에서 항상으로 바꿀 수 있고 이미 눌린 싫어요 버튼은 다시 토글하지 않습니다.

댓글 자동 처리는 channel ID, handle, 본문, 고정 문구로 만든 identity를 사용합니다. 재사용된 comment element의 identity가 바뀌면 새 댓글용 metadata와 1회 keyword, dislike, 차단 표시 상태를 무효화합니다.

키워드 자동 처리는 댓글 본문, 작성자 handle, 고정 표시 문구를 검사합니다. 대소문자를
구분하지 않으며, 싫어요, 작성자 handle 차단 목록 등록, handle 등록 뒤 UID pair 생성 중
선택한 동작만 실행합니다.

로그는 다운로드용 로컬 보관과 브라우저 console 출력을 각각 설정할 수 있습니다. 앱 시작,
API 테스트, pair 실행처럼 저빈도 이벤트만 기록합니다.

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

- 유효한 `blocked_v2` 저장소가 없을 때만 레거시 `blockedHandles`, `blockedHandles_v1`를 자동 migration합니다. 이후 삭제·전체 초기화 뒤에는 legacy 항목을 복원하지 않습니다
- 탭 간 `blocked_v2` 변경에는 선택적 항목별 revision, tombstone, clear revision을 저장합니다. 동시 추가는 병합하고 추가/삭제/전체 초기화 충돌은 높은 revision 기준으로 echo write 없이 수렴합니다.
- 기본 `app_settings_v1.dislikeMode`는 `none`입니다
- 기본 `app_settings_v1.commentBlockMode`는 `hide`입니다
- 기본 `app_settings_v1.blockMatchMode`는 `handle`입니다
- `app_settings_v1.pairUpdateUidCheck`와 `pairUpdateHandleLookup` 중 하나는 항상 켜져 있고,
  기본값은 handle 다시 조회입니다
- `handleLookupMethod` 기본값은 `scraper`이고 `api`는 명시적 선택입니다. `handleLookupFallbackApi` 기본값은 `false`, `handleLookupOnAdd` 기본값은 `true`입니다.
- 기존 동작을 유지하도록 키워드 자동 처리는 기본으로 켜져 있습니다. 끄더라도 대소문자 구분 없는 규칙, 검사 대상,
  동작 설정은 지우지 않으며, 기본 검사 대상은 댓글 본문이고 동작은 기본으로 꺼져 있습니다
- `app_settings_v1.themeMode` 기본값은 `system`입니다. 기기설정과 yt설정은 각각 현재 다크 설정을 따르고,
  반대 모드는 그 결과를 반대로 적용합니다. 커스텀 색상은 저장 전에 여섯 자리 hex 값인지 검증합니다
- 테마 스타일은 userscript의 dialog, 패널, 목록, 알림에만 적용하며 YouTube UI에는 적용하지 않습니다
- YouTube 테마 동기화는 userscript 테마 클래스가 아닌 YouTube 자체 다크 상태 신호만 관찰합니다
- 테마 탐색은 `ytd-app`을 찾으면 중단합니다. YouTube 모드에서는 body 직계 child 변경 중 `ytd-app` 교체만 확인하므로 댓글·피드 mutation이 app 재탐색을 유발하지 않습니다
- 로그는 기본으로 꺼져 있습니다. 파일 로그는 사용자가 다운로드하거나 지울 때까지 Tampermonkey 저장소에
  보관되며, 다운로드 파일 위치는 브라우저 설정을 따릅니다
- Tampermonkey가 권한, 용량, 저장소 문제로 설정, 차단 목록, pair 메타데이터, API 키, 로그 쓰기를 거부하면 메모리 상태도 바꾸지 않습니다. 해당 작업은 성공 알림 대신 오류와 재시도 안내를 표시합니다.
- console 로그 기본 prefix는 `[YTCB]`, 시간 표시는 꺼짐입니다. 시간은 ISO 확장/날짜/시간/기본 preset 또는 `yyyy`, `yy`, `MM`, `dd`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z` 형식을 지원합니다. timezone은 system, `-12`~`+14` UTC offset, 목록 IANA 도시, 검증한 직접 IANA 또는 KST식 약어를 지원합니다.
- `app_settings_v1.verboseLevel`의 기본값은 `3`입니다. V0/V1은 진단 payload를 생략하고,
  V2는 한 필드, V3은 세 필드, V4/V5는 가능한 전체 필드를 기록합니다
- 기본 `app_settings_v1.fontSizeLevel`과 `app_settings_v1.uiScaleLevel`은 `3`이며, `2`는
  이전 시각 크기와 같습니다
- pair 메타데이터와 API 설정은 import/export에 포함되지 않습니다

## 4. 매칭 모델

신원 매칭:

- `app_settings_v1.blockMatchMode`가 활성 신원 규칙 타입을 선택합니다
- `handle`은 기본값이며 저장된 `handle` 규칙을 매칭합니다
- `pair`는 UID 감지가 켜진 뒤 저장된 `id` 규칙을 매칭합니다
- regex 규칙은 추출된 handle 텍스트에만 적용됩니다
- regex 규칙은 pattern 길이, flag, 대상 길이, 위험한 backtracking 형태에 대한 safety
  제한을 넘으면 저장하지 않습니다

대소문자 구분:

- `app_settings_v1.handleCaseSensitive`로 제어합니다
- `false`: 소문자 정규화 비교
- `true`: exact handle 비교
- 과거 소문자 저장 handle은 strict exact 비교를 위해 재저장이 필요할 수 있습니다

선택적 UID 동작:

- `app_settings_v1.blockMatchMode`와 `pair_meta_v1.enableUidDetection`을 함께 사용합니다
- `id` 규칙은 `pair` 방식과 UID 감지가 모두 켜져 있을 때만 매칭에 참여합니다
- UID 감지를 꺼도 저장된 `id` 규칙과 pair 메타데이터는 유지됩니다
- 런타임 UID 매칭은 저장된 `id` 규칙과 댓글 DOM에 이미 있는 channel ID를 로컬에서
  비교하며 YouTube Data API를 호출하지 않습니다
- regex 자동 추가를 켜면 regex로 매칭된 handle을 `handle` 규칙으로 저장해, 같은
  채널의 다음 댓글은 regex 전에 handle 기준으로 확인합니다
- channel ID는 먼저 `/channel/UC...` link, 다음 `data-channel-id`, `channel-id` attribute에서 읽습니다. pair mode에서 handle은 있지만 channel ID가 없으면 `window.__ytCommentBlockerPerf.missingChannelIds` counter를 증가합니다.

댓글별 매칭 순서:

1. 선택된 신원 규칙 타입(`pair`는 `id`, `handle`은 `handle`)
2. Regex

키워드 자동 처리:

- 설정에서 고른 댓글 본문, 작성자 handle, 고정 표시 문구만 읽습니다
- 저장한 키워드 최대 50개를 대소문자 구분 없이 부분 일치로 검사합니다
- 선택한 동작은 댓글 DOM 노드마다 한 번만 실행합니다
- `channel ID pair 생성`은 먼저 작성자 handle을 추가합니다. 기본 페이지 조회에는 API 키가 필요 없습니다.

## 5. Pair 및 API 흐름

channel ID 조회:

1. 기본: userscript의 YouTube origin에서 `https://www.youtube.com/@<url-encoded-handle>`를 요청합니다.
2. 공개 채널 HTML에서 `externalId`, `channelId`, `itemprop="channelId"` 순으로 읽습니다.
3. 페이지 parser는 undocumented 방식이라 YouTube HTML 변경으로 실패할 수 있습니다. HTTP/channel ID 미검출 오류는 기존 pair 데이터를 유지하고 재시도/API fallback을 안내합니다.
4. 명시적 API 방식은 `GET https://www.googleapis.com/youtube/v3/channels`에 `part=id`, `forHandle=@handle`, `key=<apiKey>`를 보냅니다.

저장 UID 확인:

1. 같은 endpoint에 `part=id`, `id=<저장 UID>`를 보냅니다
2. 저장된 channel ID가 계속 조회되면 pair를 verified 상태로 유지합니다
3. 선택적으로 독립적인 handle 재조회를 함께 실행해 UID 교체 여부를 확인합니다

API 키 테스트:

1. 저장된 API 키를 사용합니다
2. 같은 API 계열에 `part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw` probe를 보냅니다
3. 최신 결과를 `lastTestResult`에 저장합니다
4. 관리자에서 category와 메시지를 보여줍니다

Fallback 동작:

- channel ID 조회가 실패해도 handle 방식은 계속 동작하지만, pair 방식에는 verified `id` 규칙이 필요합니다
- 실패한 pair는 `unverified` 또는 `stale` 상태로 남습니다
- 조회 실패만으로 기존 pair 데이터를 조용히 삭제하지 않습니다
- pair update에서 다른 UID가 조회되면 저장된 pair와 `id` 규칙을 최신 UID로 교체해
  stale ID가 예전 채널에 계속 매칭되지 않도록 합니다
- API fallback은 기본 off입니다. 저장 API 키와 함께 켜면 페이지 조회 실패 후에만 실행하며, off면 API 요청을 만들지 않습니다.

API 호출 최소화:

- `Create Pair`는 missing 또는 unverified handle pair만 조회합니다
- pair 결과는 pair metadata와 페이지 메모리에 cache됩니다. 기본 갱신은 페이지 조회 10분, API 조회 1주이며, 선택 handle `Update Pair`는 강제 갱신합니다.
- 주기 선택: handle 갱신마다, 1분, 5분, 10분, 1시간, 12시간, 1일, 1주, 1개월, 유효성 검사된 직접 초 입력.
- 새 handle 추가 시 즉시 조회가 기본이며 Settings에서 끌 수 있습니다.
- pair 갱신 설정에서 저장 UID 확인과 handle 재조회를 각각 선택할 수 있으며, 하나는 항상 켜져 있습니다
- 선택 handle bulk `Update Pair`는 명시적 사용자 요청으로 보고, 선택한 handle은 fresh
  상태여도 다시 조회합니다
- watch 페이지 pair 검토 알림은 `나중에` 또는 최근 pair 검사 후 같은 stale 주기 동안
  표시되지 않습니다

## 6. 관리자 대화상자

섹션:

- 현재 userscript 버전을 보여주는 script info 섹션
- 매칭, API 키, UID pair, 이동 버튼 제어
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

- `GM_setting`을 참고한 카테고리 목록 레이아웃을 사용해 각 작업 그룹에 제목, 컨트롤, 짧은 도움말을 표시합니다
- 중첩 dialog의 Escape, Enter, Tab, backdrop 동작은 최상위 dialog에만 전달하며, 닫으면 열기 전 element로 focus를 복원합니다
- API test와 pair 작업은 `finally`로 loading control을 복구합니다. 동시 수동·keyword pair 요청은 성공처럼 보이는 busy skip 대신 현재 실행을 공유합니다
- 변경 사항이 자동 저장된다는 안내를 표시합니다
- 컨트롤을 매칭, 댓글 표시, 키워드 자동 처리, 로그, 표시 크기, 유지보수 섹션으로 구분
- 저장 설정의 기본 선택지에 회색 `(기본)` 표시
- handle 대소문자 구분
- 신원 차단 방식: `handle` 규칙 또는 UID pair `id` 규칙
- regex 매칭 handle 자동 추가
- 자동 싫어요 mode
- 키워드 자동 처리 전체 토글과, 정규식 규칙 편집기 및 키워드 규칙, 검사 대상, 일치 시 동작을 차단 및 키워드 자동 처리 창으로 이관
- 라이트, 다크, 기기설정, 기기설정(반대), yt설정, yt설정(inverted), 커스텀 테마 모드 제어
- 배경, 표면, 텍스트, 보조 텍스트, 테두리, 주요 동작, 파괴적 동작 색상을 편집하고 기본값 복원 및 입력 검증을 제공하는 커스텀 테마 창
- 저장 로그와 브라우저 console 로그를 분리한 토글, 로그 수준, 보관 수, 다운로드/지우기 제어
- 차단 댓글 표시 mode
- 글자 크기와 UI 크기를 5단계로 조절. 2단계는 기존 크기이고 3단계가 기본값
- 설정에서 차단 목록을 열고, 차단 목록에서 다시 설정을 여는 버튼
- 차단 목록, 설정, 차단 및 키워드 자동 처리 창을 오가는 이동 버튼
- 앱 표시/매칭 설정을 초기화하기 전에 빨간색 파괴적 버튼과 확인 dialog로 경고
- YouTube Data API v3 키/테스트 제어
- 저장 UID 확인과 handle 재조회를 위한 pair 갱신 검사
- UID detection, pair 요약, pair 액션
- API 키 테스트와 pair 작업이 API 응답을 기다리는 동안 loading bar 표시
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
- 클릭한 댓글의 `ytd-menu-renderer`에서 짧은 수명 observer를 시작하므로 버튼 wrapper가
  바뀌어도 handle 탐색이 막히지 않습니다
- 재사용하는 popup과 popup 뒤에 삽입되는 menu 모두에 handle별 항목 하나만 추가합니다
- 주입 항목에는 `CB` 표식을 표시하고, 이미 차단한 handle은 차단 해제 동작으로 갱신하며,
  popup 처리, timeout, navigation 시 observer를 끕니다

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

내보내기 dialog에서는 차단 목록으로 돌아가거나 같은 규칙 전용 데이터를
`youtube-comment-blocker-export.json` 또는 `youtube-comment-blocker-export.txt`로 다운로드할 수 있습니다.

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

`v1.4.0` 이후에는 큰 관리자/보안/i18n/regex-selection 성능/Shorts 댓글 숨김/긴 세션
메모리 정리/pair update 최소화/버전 표시/설정 dialog/regex 자동 추가/관리자 polish
TODO가 기본적으로 마무리된 상태로 봅니다. 이후 작업은 베이스라인 미구현이 아니라
점진적 개선 중심으로 다룹니다.
