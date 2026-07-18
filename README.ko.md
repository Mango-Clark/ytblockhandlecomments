# 📌 YouTube Comment Blocker — v1.4.0

[English](README.md) | [한국어](README.ko.md)

상세 문서: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

YouTube 댓글을 채널 식별자 기준으로 숨기는 Tampermonkey 사용자 스크립트입니다.
기본 흐름은 여전히 handle 차단이며, `v1.4.0`은 `v0.6.x`의 안전성, 설정, pair 유지보수
수정을 유지하면서 별도 설정 창을 개선하고, regex 자동 추가, debug counter, pair 결과 도구,
quota 안내, 페이지 단위 regex 매칭 목록, 역할별 소스 파일, 압축된 userscript 생성물을
추가합니다.

빠른 설치: 아래 raw URL을 Tampermonkey로 열어 설치 또는 업데이트하세요

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

소스 구조:

- 역할별 소스 파일은 `src/`에서 수정합니다
- `npm run build`로 `ytblockhandlecomments.js`를 다시 생성합니다
- `npm run check:build`로 루트 userscript와 `src/`의 동기화를 확인합니다
- Tampermonkey는 루트 `ytblockhandlecomments.js`만 설치하며, `src/`는 개발용 소스입니다
- 생성된 루트 userscript는 압축되므로 읽기 쉬운 수정은 `src/`에서 합니다
- 변경한 `src/` 파일과 다시 빌드된 루트 userscript를 함께 커밋합니다

## 문서

- 위키: [docs/WIKI.md](docs/WIKI.md) | [docs/WIKI.ko.md](docs/WIKI.ko.md)
- 변경사항: [docs/CHANGELOG.md](docs/CHANGELOG.md) | [docs/CHANGELOG.ko.md](docs/CHANGELOG.ko.md)
- TODO: [docs/TODO.md](docs/TODO.md)
- 리뷰 헬퍼 설명: [docs/ABOUT.md](docs/ABOUT.md)

---

## 주요 기능

- 댓글 작성자 handle만 우클릭해 차단 또는 해제하며, 다른 YouTube handle 링크 동작은 가로채지 않음
- 댓글 `⋯` 메뉴에 `Hide comments from this channel` 항목 추가
- YouTube watch 페이지와 Shorts 페이지에서 댓글을 실시간으로 숨김
- 댓글 host 탐색은 watch/Shorts root와 제한된 재시도만 사용해 피드 전체 mutation 관찰을 피함
- Shorts는 안정적인 댓글 panel host를 사용해 이후 추가되는 댓글 thread도 계속 관찰
- page-data/history 갱신으로 YouTube SPA 이동을 감지하며, page key가 같으면 상태를 초기화하지 않음
- 차단 댓글 표시 방식 제공: 완전 차단, 회색 대체 문구, 클릭해서 보기
- 댓글 자동 싫어요 모드 제공. 기본값은 안함이며, 새로 숨길 때만 또는 숨긴 상태에서 항상으로 변경 가능
- YouTube가 comment DOM node를 새 작성자·본문에 재사용하면 keyword/자동 싫어요 동작을 다시 적용
- 정규식 규칙, 키워드 검사 대상, 싫어요·handle 차단·UID pair 생성을 한 곳에서 설정하는 차단 및 키워드 자동 처리 창 지원
- 로컬 로그 보관과 브라우저 console 로그를 독립적으로 켜고 끌 수 있으며, 로그 수준/보관 수 설정과 로그 파일 다운로드 지원
- console 로그 prefix, 선택적 시간 표시, calendar·week·ordinal·basic·직접 ISO 시간 형식, timezone 선택 지원
- 개인정보를 제거하는 로그 payload 진단 상세도를 V0-V5로 설정할 수 있고 기본값은 균형 잡힌 V3
- `blocked_v2`에 `handle`, `id`, `regex` 규칙 저장
- 신원 차단 방식을 기본 `handle` 규칙 또는 UID pair `id` 규칙으로 선택하고, regex 규칙은 두 방식 모두에서 적용
- regex 규칙 저장/매칭 전에 길이, flag, 대상 길이, 휴리스틱 safety 검사를 적용
- 관리자 대화상자에 선택적 channel ID 감지 토글 추가
- channel link와 안정적인 channel-ID attribute에서 댓글 channel ID를 추출하며, pair mode 미검출은 진단 counter를 증가
- 기본 YouTube 공개 채널 페이지 조회, 결과 cache, 선택적 YouTube Data API v3 조회/fallback 지원
- `pair_meta_v1`에 handle↔channel ID pair 메타데이터 저장
- `Create Pair`, `Update Pair` 액션 제공
- handle별 상태 배지 제공: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- 관리자 대화상자에 로컬 `Handle Case Sensitive` 설정 추가
- API, UID, regex 자동 추가, 표시 크기, debug counter를 다루는 별도 설정 창 추가
- 작업별 카테고리 목록, 설명, 자동 저장 안내를 포함한 설정 창 레이아웃 적용
- 설정 창의 기능을 매칭, 댓글 표시, 키워드 자동 처리, 로그, 표시 크기, 유지보수 그룹으로 구분
- 저장 설정의 기본 선택지에 회색 `(기본)` 표시
- 확인 팝업 이후 앱 표시/매칭 설정 초기화 지원
- 글자 크기와 UI 크기를 5단계로 조절 가능. 2단계는 기존 크기이며 기본값은 3단계
- userscript UI 전용 라이트, 다크, 기기설정, 기기설정(반대), yt설정, yt설정(inverted), 커스텀 테마 지원
- YouTube 테마 동기화는 YouTube 자체 다크 상태 신호만 구독
- 설정 창과 차단 목록 사이를 오가는 버튼 추가
- regex로 처음 숨긴 handle을 자동으로 저장해 이후에는 handle 매칭으로 확인 가능
- 차단 목록에 row 체크박스, 필터 기준 전체 선택, 선택 개수 표시 추가
- 차단 목록에 `all|handle|id|regex` 타입 필터와 handle 태그 필터 추가
- 관리자 대화상자에 현재 userscript 버전 표시
- 선택 항목 삭제, 선택 handle 대상 pair 생성/갱신 bulk 액션 추가
- regex 매칭 결과 캐시로 `matching handle 선택` 시 전체 목록 재생성을 피함
- 펼친 regex 매칭 목록은 페이지 단위로 표시해 큰 목록을 한 번에 렌더링하지 않음
- 최근 pair 실행 결과를 필터/정렬하고 실패 handle을 복사/내보내기 가능
- 차단 목록 내보내기 창에서 목록으로 돌아가거나 현재 규칙을 JSON/텍스트 파일로 다운로드 가능
- API 키 테스트와 pair 생성/갱신이 네트워크 응답을 기다리는 동안 loading bar 표시
- API 키 테스트에서 quota 실패가 반복되면 구조화된 안내 표시
- stale 또는 mismatch pair가 있으면 watch 페이지에 검토 배너 표시
- import/export는 차단 규칙만 다루고, pair 메타데이터는 로컬 전용으로 유지

---

## 사용 방법

1. [Tampermonkey](https://www.tampermonkey.net/)를 설치합니다.
2. 위 raw URL로 설치하거나, 새 사용자 스크립트에 `ytblockhandlecomments.js`를 붙여넣습니다.
3. YouTube watch 페이지 또는 Shorts 페이지를 엽니다.
4. 댓글 작성자 handle을 우클릭해 차단 또는 해제합니다.
5. `Tampermonkey -> YouTube Comment Blocker -> Manage block list`를 엽니다.
6. API 조회 또는 페이지 조회 fallback이 필요할 때만 YouTube Data API v3 API 키를 저장·테스트합니다.
7. handle 대소문자 설정, 신원 차단 방식, UID 감지 토글, 로그 보관/console 출력, 차단 및 키워드 자동 처리, 목록 필터, 선택 항목 bulk 액션,
   import/export를 사용합니다.
8. 설정에서 키워드 자동 처리를 켜거나 끄고, 차단 및 키워드 자동 처리 창에서 규칙과 동작을 설정합니다.

일반적인 channel ID 흐름:

1. 먼저 handle을 평소처럼 차단합니다.
2. `Manage block list`를 엽니다.
3. 설정에서 기본 YouTube 채널 페이지 조회를 유지하거나 API 조회를 명시적으로 선택합니다.
4. API 조회/fallback이 필요하면 API 키를 저장·테스트합니다.
5. channel ID 감지를 켭니다.
6. pair 없는 항목에 `Create Pair`를 실행하거나 새 handle 추가 시 조회를 켭니다.
7. 갱신 주기와 저장 channel ID 확인, handle 재조회 여부를 고릅니다.
8. 이후 stale 또는 mismatch가 보이면 `Update Pair`를 실행합니다.

---

## 저장 구조

메인 규칙 저장소:

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

Pair 메타 저장소:

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
    source: string
  }>
}
```

앱 설정 저장소:

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
	logging: { fileEnabled: boolean, consoleEnabled: boolean, level: 'error' | 'warn' | 'info' | 'debug', retention: 100 | 500 | 1000, consolePrefix: string, consoleTimestampEnabled: boolean, consoleTimeFormat: string, consoleTimeZone: string, consoleTimeZoneInput: string },
	verboseLevel: 0 | 1 | 2 | 3 | 4 | 5,
  dislikeMode: 'none' | 'new-hidden' | 'always',
  commentBlockMode: 'hide' | 'placeholder' | 'placeholder-reveal',
  fontSizeLevel: 1 | 2 | 3 | 4 | 5,
  uiScaleLevel: 1 | 2 | 3 | 4 | 5
}
```

참고:

- 규칙 저장 키: `blocked_v2`
- pair 메타 저장 키: `pair_meta_v1`
- 앱 설정 저장 키: `app_settings_v1`
- API 설정 저장 키: `youtube_data_api_v3_config`
- 기본 `dislikeMode`는 `none`입니다
- 기본 `commentBlockMode`는 `hide`입니다
- 기본 `blockMatchMode`는 `handle`이고, `pair`는 UID 감지가 켜진 동안 저장된 `id` 규칙을 사용합니다
- 기본 channel ID 조회는 같은 origin의 공개 채널 페이지 `https://www.youtube.com/@<handle>`에서 `externalId`, `channelId`, `itemprop="channelId"` 순으로 읽습니다. undocumented HTML 방식이라 변경될 수 있습니다.
- 조회 결과는 pair metadata와 메모리에 cache됩니다. 기본 갱신 주기는 페이지 조회 10분, API 조회 1주이며, 선택 handle 강제 갱신은 cache를 건너뜁니다.
- 페이지 조회 실패는 기존 데이터를 유지하고 재시도 또는 테스트한 API fallback 사용을 안내합니다. API 조회는 저장한 키가 필요하고 요청당 quota 1 unit을 소비합니다.
- pair 갱신 검사는 하나 이상 항상 켜져 있으며, 기본값은 handle 다시 조회입니다
- pair가 없거나 unverified이면 UID 규칙을 만들 때까지 `handle` 방식으로 전환합니다
- 키워드는 대소문자를 구분하지 않고 기본으로 댓글 본문을 검사하며, 동작은 직접 켜기 전까지 실행하지 않습니다
- 로그는 기본으로 꺼져 있습니다. 저장 로그는 Tampermonkey 저장소에 보관되며 텍스트 파일로 내려받을 수 있고, 다운로드 위치는 브라우저 설정을 따릅니다
- console 시간은 calendar(`iso`, `iso-date`, `iso-basic-date`), week(`iso-week-date`), ordinal(`iso-ordinal-date`) date를 지원합니다. 직접 형식은 `yyyy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, `W`를 조합해 ISO basic/extended time·timezone 형식을 만들 수 있습니다.
- Tampermonkey가 설정, 규칙, pair, API 키, 로그 쓰기를 거부하면 기존 저장값을 유지하고 UI에서 재시도를 안내합니다
- 기본 `verboseLevel`은 `3`입니다. V0/V1은 진단 payload를 생략하고, V2는 한 필드, V3은 세 필드, V4는 여섯 필드, V5는 열 필드를 기록합니다. 중첩 API 키·token·URL·account·comment·handle·사용자 식별자는 console과 저장 로그 전에 제거합니다.
- 기본 `fontSizeLevel`과 `uiScaleLevel`은 `3`이며, `2`는 이전 시각 크기와 같습니다
- 유효한 `blocked_v2` 저장소가 없을 때만 레거시 규칙 키 `blockedHandles`, `blockedHandles_v1`를 자동 migration합니다. 이후 삭제·전체 초기화 뒤에는 legacy 항목을 복원하지 않습니다.
- 탭 간 `blocked_v2` 동기화는 항목별 revision과 tombstone을 사용합니다. 동시 추가는 병합하고, 추가/삭제/전체 초기화 충돌은 결정론적으로 수렴합니다.
- `v1.4.0`에서도 pair 메타데이터를 import/export에 포함하지 않습니다
- API 키는 Tampermonkey 로컬 저장소에만 저장되며 스크립트 코드에 포함되지 않습니다

---

## 테스트

- `node --test` 실행
- `npm run check:build` 실행
- 외부 의존성 없이 `node:test`와 작은 DOM shim으로 회귀 테스트를 실행합니다
- 현재 범위: 관리자 검색, 대화상자 i18n refresh, pair 결과 UI 상태, pair 결과 정렬/필터
  helper, quota 안내 counter, 탐색 observer reset, pair update skip/force 동작,
  regex safety/import literal

---

## 참고 사항

- 기본 신원 차단 방식은 `handle`이며, `pair`는 UID 감지가 켜진 동안 `id` 규칙을 매칭합니다
- handle 매칭 기본값은 case-insensitive이며, exact 비교로 전환할 수 있습니다
- 기존 handle은 이미 소문자로 저장됐을 수 있어 exact 비교 보장은 재저장하거나 새로
  추가한 항목부터 적용됩니다
- UID 매칭은 `UID Detection` 토글로 켜고 끌 수 있습니다
- 현재 구현에서는 `pair` 방식과 UID 감지가 모두 켜져 있을 때만 `id` 규칙 매칭이 활성화됩니다
- pair 생성과 handle 재조회는 YouTube Data API v3 `channels.list`의 `forHandle` 필터를 사용합니다
- 선택적 저장 UID 확인은 같은 API의 저장된 channel ID 조회를 사용합니다
- pair 데이터가 있으면 UID 매칭은 로컬에서만 수행되며, API 호출은 pair 작업 중에만
  발생합니다
- regex 자동 추가를 켜면 regex로 매칭된 handle을 `handle` 규칙으로 저장해, 같은
  채널은 이후 regex를 다시 거치지 않고 handle로 확인합니다
- `Update Pair`는 stale 주기가 지나지 않은 verified pair를 건너뛰고, 선택 handle
  bulk update는 선택한 항목에 대해 강제 조회합니다
- watch 페이지 pair 검토 배너는 `나중에` 또는 최근 pair 검사 후 stale 주기 동안 다시
  표시되지 않습니다
- pair update에서 다른 UID가 조회되면 오래된 `id` 규칙을 교체해 stale UID가 예전
  채널에 계속 매칭되지 않도록 합니다
- pair 생성/갱신에는 관리자 대화상자에 저장한 사용자 본인 API 키가 필요합니다
- bulk pair 액션은 선택된 `handle` 항목에만 적용됩니다
- regex 선택은 현재 보이는 checkbox와 counter만 즉시 갱신하고 전체 목록을 다시 만들지 않습니다
- regex 펼침/접힘과 매칭 목록 페이지 이동은 해당 행만 갱신합니다
- API 키 테스트는 반복 `quota` 실패를 추적하고 관리자에 reset window 안내를 표시합니다
- pair 실행 상세는 필터/정렬할 수 있고 실패 handle을 복사하거나 내보낼 수 있습니다
- UID 조회가 실패해도 handle 차단은 계속 동작하며, pair는 `unverified` 또는 `stale` 상태로 남습니다
- regex 규칙은 handle 텍스트에만 적용되며, 키워드 규칙은 댓글 본문, 작성자 handle, 고정 표시 문구를 검사할 수 있습니다
- plain-text import/export는 regex literal을 `/pattern/flags` 형태로 왕복합니다
- 차단 목록 내보내기는 pair 메타데이터나 API 설정을 포함하지 않고, 화면의 JSON 또는 텍스트 표현을 파일로 다운로드할 수 있습니다
- YouTube 테마 감지는 root, 현재 `ytd-app`, 직접 `ytd-app` 교체 이벤트만 관찰합니다
- 중첩 dialog의 Escape, Enter, Tab focus 처리와 backdrop click은 최상위 dialog에만 적용됩니다
- API test와 pair 작업은 예상 밖 오류 뒤 control을 복구하며, 겹친 pair 요청은 하나의 실행을 공유합니다
- 댓글 숨김은 의도적으로 watch 페이지와 Shorts 댓글 범위에 한정됩니다
- pair 검토 배너는 의도적으로 watch 페이지에만 표시됩니다
- 탐색 시 임시 댓글 observer와 메타데이터 캐시를 초기화해 긴 YouTube 세션에서 오래된
  댓글 DOM 노드를 붙잡지 않도록 합니다
- 가벼운 성능 카운터는 설정 창과 `window.__ytCommentBlockerPerf`에서 확인할 수 있습니다
- 로그는 앱 시작, API 테스트, pair 실행 같은 저빈도 이벤트만 기록하며 댓글별 매칭 고빈도 경로에서는 기록하지 않습니다

---

## 사용자 스크립트 메타데이터

- `@name`: `YouTube Comment Blocker`
- `@version`: `1.4.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

---

## 작성자

- **Mango_Clark**
- 라이선스: MIT
