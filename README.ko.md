# 📌 YouTube Comment Blocker — v1.2.0

[English](README.md) | [한국어](README.ko.md)

상세 문서: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

YouTube 댓글을 채널 식별자 기준으로 숨기는 Tampermonkey 사용자 스크립트입니다.
기본 흐름은 여전히 handle 차단이며, `v1.2.0`은 `v0.6.x`의 안전성, 설정, pair 유지보수
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

- 작성자 handle을 우클릭해 차단 또는 해제
- 댓글 `⋯` 메뉴에 `Hide comments from this channel` 항목 추가
- YouTube watch 페이지와 Shorts 페이지에서 댓글을 실시간으로 숨김
- 차단 댓글 표시 방식 제공: 완전 차단, 회색 대체 문구, 클릭해서 보기
- 댓글 자동 싫어요 모드 제공. 기본값은 안함이며, 새로 숨길 때만 또는 숨긴 상태에서 항상으로 변경 가능
- 댓글 본문, 작성자 handle, 고정 표시 문구를 검사하고 싫어요, handle 차단, UID pair 생성을 각각 고를 수 있는 키워드 자동 처리 지원
- 로컬 로그 보관과 브라우저 console 로그를 독립적으로 켜고 끌 수 있으며, 로그 수준/보관 수 설정과 로그 파일 다운로드 지원
- `blocked_v2`에 `handle`, `id`, `regex` 규칙 저장
- 신원 차단 방식을 기본 `handle` 규칙 또는 UID pair `id` 규칙으로 선택하고, regex 규칙은 두 방식 모두에서 적용
- regex 규칙 저장/매칭 전에 길이, flag, 대상 길이, 휴리스틱 safety 검사를 적용
- 관리자 대화상자에 선택적 `UID Detection` 토글 추가
- 관리자 대화상자에 로컬 전용 YouTube Data API 키 입력 섹션 추가
- `pair_meta_v1`에 handle↔UID pair 메타데이터 저장
- `Create Pair`, `Update Pair` 액션 제공
- handle별 상태 배지 제공: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- 관리자 대화상자에 로컬 `Handle Case Sensitive` 설정 추가
- API, UID, regex 자동 추가, 표시 크기, debug counter를 다루는 별도 설정 창 추가
- 작업별 카테고리 목록, 설명, 자동 저장 안내를 포함한 설정 창 레이아웃 적용
- 설정 창의 기능을 매칭, 댓글 표시, 표시 크기, 유지보수 그룹으로 구분
- 확인 팝업 이후 앱 표시/매칭 설정 초기화 지원
- 글자 크기와 UI 크기를 5단계로 조절 가능. 2단계는 기존 크기이며 기본값은 3단계
- 설정 창과 차단 목록 사이를 오가는 버튼 추가
- regex로 처음 숨긴 handle을 자동으로 저장해 이후에는 handle 매칭으로 확인 가능
- 차단 목록에 row 체크박스, 필터 기준 전체 선택, 선택 개수 표시 추가
- 차단 목록에 `all|handle|id|regex` 타입 필터와 handle 태그 필터 추가
- 관리자 대화상자에 현재 userscript 버전 표시
- 선택 항목 삭제, 선택 handle 대상 pair 생성/갱신 bulk 액션 추가
- regex 매칭 결과 캐시로 `matching handle 선택` 시 전체 목록 재생성을 피함
- 펼친 regex 매칭 목록은 페이지 단위로 표시해 큰 목록을 한 번에 렌더링하지 않음
- 최근 pair 실행 결과를 필터/정렬하고 실패 handle을 복사/내보내기 가능
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
6. Pair 기능을 쓰기 전에 YouTube Data API v3 API 키를 저장합니다.
7. handle 대소문자 설정, 신원 차단 방식, UID 감지 토글, 로그 보관/console 출력, 목록 필터, 선택 항목 bulk 액션, regex 추가,
   import/export를 사용합니다.
8. 설정에서 키워드를 추가하고, 일치할 때 검사할 입력과 실행할 동작을 선택합니다.

일반적인 UID 흐름:

1. 먼저 handle을 평소처럼 차단합니다.
2. `Manage block list`를 엽니다.
3. YouTube Data API v3 API 키를 저장합니다.
4. `UID Detection`을 켭니다.
5. pair가 없는 항목에 대해 `Create Pair`를 실행합니다.
6. 필요하면 타입/태그 필터와 bulk action으로 일부 항목만 대상으로 작업합니다.
7. `Update Pair`에서 저장 UID 확인, handle 다시 조회 또는 둘 다를 선택합니다.
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
	keywordRules: string[],
	keywordFields: { commentText: boolean, handle: boolean, pinned: boolean },
	keywordActions: { dislike: boolean, blockHandle: boolean, createPair: boolean },
	logging: { fileEnabled: boolean, consoleEnabled: boolean, level: 'error' | 'warn' | 'info' | 'debug', retention: 100 | 500 | 1000 },
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
- pair 갱신 검사는 하나 이상 항상 켜져 있으며, 기본값은 handle 다시 조회입니다
- pair가 없거나 unverified이면 UID 규칙을 만들 때까지 `handle` 방식으로 전환합니다
- 키워드는 대소문자를 구분하지 않고 기본으로 댓글 본문을 검사하며, 동작은 직접 켜기 전까지 실행하지 않습니다
- 로그는 기본으로 꺼져 있습니다. 저장 로그는 Tampermonkey 저장소에 보관되며 텍스트 파일로 내려받을 수 있고, 다운로드 위치는 브라우저 설정을 따릅니다
- 기본 `fontSizeLevel`과 `uiScaleLevel`은 `3`이며, `2`는 이전 시각 크기와 같습니다
- 레거시 규칙 키 `blockedHandles`, `blockedHandles_v1`는 계속 자동 마이그레이션됩니다
- `v1.2.0`에서도 pair 메타데이터를 import/export에 포함하지 않습니다
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
- 댓글 숨김은 의도적으로 watch 페이지와 Shorts 댓글 범위에 한정됩니다
- pair 검토 배너는 의도적으로 watch 페이지에만 표시됩니다
- 탐색 시 임시 댓글 observer와 메타데이터 캐시를 초기화해 긴 YouTube 세션에서 오래된
  댓글 DOM 노드를 붙잡지 않도록 합니다
- 가벼운 성능 카운터는 설정 창과 `window.__ytCommentBlockerPerf`에서 확인할 수 있습니다
- 로그는 앱 시작, API 테스트, pair 실행 같은 저빈도 이벤트만 기록하며 댓글별 매칭 고빈도 경로에서는 기록하지 않습니다

---

## 사용자 스크립트 메타데이터

- `@name`: `YouTube Comment Blocker`
- `@version`: `1.2.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

---

## 작성자

- **Mango_Clark**
- 라이선스: MIT
