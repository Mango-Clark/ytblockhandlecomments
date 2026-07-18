# 📌 YouTube Comment Blocker — v1.5.0

[English](README.md) | [한국어](README.ko.md)

상세: [WIKI.md](docs/WIKI.md) | [WIKI.ko.md](docs/WIKI.ko.md)

채널 식별자 기반 YouTube 댓글 숨김 Tampermonkey 스크립트.
기본 handle 차단. `v1.5.0`: `v0.6.x` 안전성·설정·pair 유지보수 수정 유지 + 별도 설정 창 개선, regex 자동 추가, debug counter, pair 결과 도구, quota 안내, 페이지별 regex 매칭 목록, 역할별 소스, 압축 userscript 추가.

빠른 설치: raw URL을 Tampermonkey로 열어 설치·업데이트

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

소스 구조:

- 역할별 소스: `src/`
- `npm run build`로 `ytblockhandlecomments.js` 재생성
- `npm run check:build`로 루트 userscript와 `src/` 동기화 확인
- Tampermonkey 설치 대상: 루트 `ytblockhandlecomments.js`; `src/`는 개발용
- 루트 userscript는 압축됨. 가독성 있는 수정은 `src/`
- 변경한 `src/` + 재빌드한 루트 userscript 함께 커밋

## 문서

- 위키: [docs/WIKI.md](docs/WIKI.md) | [docs/WIKI.ko.md](docs/WIKI.ko.md)
- 변경사항: [docs/CHANGELOG.md](docs/CHANGELOG.md) | [docs/CHANGELOG.ko.md](docs/CHANGELOG.ko.md)
- TODO: [docs/TODO.md](docs/TODO.md)
- 리뷰 헬퍼: [docs/ABOUT.md](docs/ABOUT.md)

---

## 주요 기능

### 핵심 차단

- 댓글 작성자 handle 우클릭 차단·해제.
- 다른 YouTube handle 링크는 가로채지 않음.
- 댓글 `⋯` 메뉴에 `Hide comments from this channel` 추가.
- watch·Shorts 일치 댓글 실시간 숨김.
- `blocked_v2`에 `handle`, `id`, `regex` 규칙 저장.
- `handle` 또는 UID pair `id` 매칭 선택. regex는 독립 적용.
- 선택 시 handle 대소문자 구분.

### 댓글 자동 처리

- 숨김·회색 대체 문구·클릭 공개 방식.
- 자동 싫어요: 안 함·새 숨김만·숨김 동안 항상.
- YouTube의 comment DOM node 재사용에도 keyword·자동 싫어요 재적용.
- regex·keyword 대상·싫어요·handle 차단·UID pair를 한 창에서 설정.
- 저장·매칭 전 regex 길이·flag·대상·휴리스틱 safety 검사.
- regex 최초 일치 handle 자동 저장 후 handle 매칭.

### 설정·테마

- API·UID·regex 자동 추가·표시 크기·debug counter 별도 설정 창.
- 매칭·댓글 표시·키워드 자동 처리·로그·표시 크기·유지보수 그룹.
- 자동 저장. 기본 선택지 `(기본)` 표시.
- 확인 후 표시·매칭 설정 초기화.
- 글자·UI 크기 5단계. 2단계=이전 크기, 3단계=기본값.
- UI 테마: 라이트·다크·기기설정·기기설정(반대)·yt설정·yt설정(inverted)·커스텀.
- YouTube 테마 동기화는 자체 다크 상태 신호만 사용.

### 차단 목록 관리

- 검색·타입 필터·handle 태그 필터.
- row 선택·bulk 액션.
- 관리자 대화상자에 userscript 버전 표시.
- regex 매칭 handle 수·일괄 선택.
- regex 결과 cache. 대규모 목록 페이지별 표시.
- 내보내기 창에서 목록 복귀 또는 규칙 JSON·텍스트 다운로드.

### Channel pairing

- 선택적 channel ID 감지. handle↔channel ID를 `pair_meta_v1`에 저장.
- channel link·안정적 channel-ID attribute에서 ID 추출.
- 기본 공개 채널 페이지 조회. cache + 선택적 YouTube Data API v3 조회/fallback.
- `Create Pair`, `Update Pair`; handle별 결과.
- 결과 필터·정렬, 실패 handle 복사·내보내기.
- API 키 테스트·pair 중 loading bar.
- 반복 API quota 실패 시 구조화 안내.

### 로그·진단

- 로컬·브라우저 console 로그 독립 설정.
- 수준·보관 수·prefix·시간·형식·timezone 설정.
- 개인정보 제거 V0-V5 진단 상세도. 기본 V3.
- pair mode channel ID 미검출 진단 counter.

### 탐색·성능

- watch/Shorts root에서만 제한적 comment host 탐색·재시도.
- 안정적 Shorts 댓글 panel host에서 thread 지속 관찰.
- page-data/history로 SPA 이동 감지. 동일 page key 상태 유지.
- 설정 창↔차단 목록 이동.
- 언어 변경 시 관리자 UI·dialog·배너·메뉴 label 갱신.

---

## 사용 방법

1. [Tampermonkey](https://www.tampermonkey.net/) 설치.
2. raw URL로 설치하거나 새 사용자 스크립트에 `ytblockhandlecomments.js` 붙여넣기.
3. YouTube watch 또는 Shorts 열기.
4. 댓글 작성자 handle 우클릭해 차단·해제.
5. `Tampermonkey -> YouTube Comment Blocker -> Manage block list` 열기.
6. API 조회·페이지 조회 fallback 필요 시에만 YouTube Data API v3 API 키 저장·테스트.
7. handle 대소문자·신원 차단 방식·UID 감지·로그·자동 처리·목록 필터·bulk 액션·import/export 설정.
8. 키워드 자동 처리 토글 후 차단·키워드 자동 처리 창에서 규칙·동작 설정.

일반 channel ID 흐름:

1. handle 차단.
2. `Manage block list` 열기.
3. 기본 YouTube 채널 페이지 조회 유지 또는 API 조회 선택.
4. API 조회/fallback 필요 시 API 키 저장·테스트.
5. channel ID 감지 켜기.
6. pair 없는 항목에 `Create Pair` 실행 또는 새 handle 추가 시 조회 켜기.
7. 갱신 주기·저장 channel ID 확인·handle 재조회 선택.
8. stale/mismatch 시 `Update Pair` 실행.

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

- 규칙 키: `blocked_v2`
- pair 메타 키: `pair_meta_v1`
- 앱 설정 키: `app_settings_v1`
- API 설정 키: `youtube_data_api_v3_config`
- 기본 `dislikeMode`: `none`
- 기본 `commentBlockMode`: `hide`
- 기본 `blockMatchMode`: `handle`; `pair`는 UID 감지 중 저장된 `id` 사용
- 기본 channel ID 조회: 공개 채널 페이지 `https://www.youtube.com/@<handle>`에서 `externalId`, `channelId`, `itemprop="channelId"` 순으로 읽음. undocumented HTML이라 변경 가능.
- 조회 결과는 pair metadata·메모리에 cache. 기본 갱신: 페이지 10분, API 1주. 선택 handle 강제 갱신은 cache 우회.
- 페이지 조회 실패 시 기존 데이터 유지 + 재시도/API fallback 안내. API는 저장 키 필요, 요청당 quota 1 unit.
- pair 갱신 검사는 하나 이상 항상 활성. 기본은 handle 재조회.
- pair 없음/unverified면 UID 규칙 생성 전까지 `handle`로 전환.
- 키워드는 대소문자 무시, 기본 댓글 본문 검사. 직접 활성화 전 동작 없음.
- 로그 기본 꺼짐. 저장 로그는 Tampermonkey 저장소에 보관·텍스트 다운로드. 위치는 브라우저 설정 따름.
- console 시간: calendar(`iso`, `iso-date`, `iso-basic-date`), week(`iso-week-date`), ordinal(`iso-ordinal-date`) date 지원. 직접 형식은 `yyyy`, `MM`, `dd`, `DDD`, `ww`, `e`, `HH`, `mm`, `ss`, `SSS`, `X`, `XXX`, `Z`, `T`, `W` 조합으로 ISO basic/extended time·timezone 생성.
- Tampermonkey가 설정·규칙·pair·API 키·로그 쓰기 거부 시 기존값 유지 + UI 재시도 안내.
- 기본 `verboseLevel`: `3`. V0/V1 payload 생략, V2 1필드, V3 3필드, V4 6필드, V5 10필드. 중첩 API 키·token·URL·account·comment·handle·사용자 식별자는 console·저장 전 제거.
- 기본 `fontSizeLevel`·`uiScaleLevel`: `3`; `2`는 이전 크기.
- 유효한 `blocked_v2` 없을 때만 레거시 `blockedHandles`, `blockedHandles_v1` 자동 migration. 이후 삭제·전체 초기화 뒤 legacy 복원 안 함.
- 탭 간 `blocked_v2` 동기화는 항목별 revision·tombstone 사용. 동시 추가 병합, 추가/삭제/전체 초기화 충돌 결정론적 수렴.
- `v1.5.0`도 pair 메타데이터를 import/export에서 제외.
- API 키는 Tampermonkey 로컬 저장소에만 저장, 스크립트 코드 제외.

---

## 테스트

- `node --test` 실행
- `npm run check:build` 실행
- 외부 의존성 없이 `node:test` + 작은 DOM shim 회귀 테스트.
- 범위: 관리자 검색, 대화상자 i18n refresh, pair 결과 UI 상태·정렬·필터 helper, quota 안내 counter, 탐색 observer reset, pair update skip/force, regex safety/import literal.

---

## 참고 사항

- 기본 신원 차단은 `handle`; `pair`는 UID 감지 중 `id` 매칭.
- handle 기본 case-insensitive; exact 비교 가능.
- 기존 handle은 소문자 저장 가능. exact 보장은 재저장·신규 항목부터.
- UID 매칭은 `UID Detection` 토글.
- `pair` + UID 감지 모두 활성일 때만 `id` 매칭.
- pair 생성·handle 재조회는 YouTube Data API v3 `channels.list`의 `forHandle` 사용.
- 선택적 저장 UID 확인은 같은 API의 저장 channel ID 조회.
- pair 데이터가 있으면 UID 매칭은 로컬. API 호출은 pair 작업 중만.
- regex 자동 추가 시 일치 handle을 `handle`로 저장, 이후 regex 없이 handle 확인.
- `Update Pair`는 stale 주기 전 verified pair 건너뜀. 선택 handle bulk update는 강제 조회.
- watch pair 검토 배너는 `나중에` 또는 최근 검사 후 stale 주기 동안 숨김.
- pair update에서 UID 변경 시 오래된 `id` 교체, stale UID의 예전 채널 매칭 방지.
- pair 생성·갱신에는 관리자 대화상자에 저장한 사용자 API 키 필요.
- bulk pair 액션은 선택된 `handle`만.
- regex 선택은 보이는 checkbox·counter만 즉시 갱신; 전체 목록 재생성 안 함.
- regex 펼침/접힘·매칭 페이지 이동은 해당 행만 갱신.
- API 키 테스트는 반복 `quota` 실패 추적 + reset window 안내.
- pair 상세 필터·정렬, 실패 handle 복사·내보내기.
- UID 조회 실패해도 handle 차단 유지; pair는 `unverified`/`stale`.
- regex는 handle 텍스트만. 키워드는 댓글 본문·작성자 handle·고정 표시 문구 검사 가능.
- plain-text import/export는 regex literal을 `/pattern/flags`로 왕복.
- 차단 목록 내보내기는 pair 메타데이터·API 설정 제외. JSON/텍스트 파일 다운로드.
- YouTube 테마 감지는 root·현재 `ytd-app`·직접 `ytd-app` 교체 이벤트만 관찰.
- 중첩 dialog의 Escape·Enter·Tab focus·backdrop click은 최상위 dialog만.
- API test·pair는 예상 밖 오류 후 control 복구. 겹친 pair 요청은 실행 공유.
- 댓글 숨김은 watch·Shorts 댓글만.
- pair 검토 배너는 watch만.
- 탐색 시 임시 댓글 observer·메타데이터 cache 초기화, 긴 세션의 오래된 댓글 DOM node 해제.
- 성능 counter는 설정 창·`window.__ytCommentBlockerPerf`에서 확인.
- 로그는 앱 시작·API 테스트·pair 같은 저빈도 이벤트만. 댓글별 고빈도 매칭은 기록 안 함.

---

## 사용자 스크립트 메타데이터

- `@name`: `YouTube Comment Blocker`
- `@version`: `1.5.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`, `GM_registerMenuCommand`, `GM_unregisterMenuCommand`

---

## 작성자

- **Mango_Clark**
- 라이선스: MIT
