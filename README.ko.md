# 📌 YouTube Comment Blocker — v0.4.0

[English](README.md) | [한국어](README.ko.md)

상세 문서: [WIKI.md](WIKI.md) | [WIKI.ko.md](WIKI.ko.md)

YouTube 댓글을 채널 식별자 기준으로 숨기는 Tampermonkey 사용자 스크립트입니다.
기본 흐름은 여전히 handle 차단이며, `v0.4.0에서는 기존 YouTube Data API v3
기반 UID 흐름 위에 handle 대소문자 구분, 차단 목록 선택/필터, 선택 항목 대상 bulk
pair 액션이 추가되었습니다.

빠른 설치: 아래 raw URL을 Tampermonkey로 열어 설치 또는 업데이트하세요

- <https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

---

## 주요 기능

- 작성자 handle을 우클릭해 차단 또는 해제
- 댓글 `⋯` 메뉴에 `Hide comments from this channel` 항목 추가
- YouTube watch 페이지에서 댓글을 실시간으로 숨김
- `blocked_v2`에 `handle`, `id`, `regex` 규칙 저장
- 관리자 대화상자에 선택적 `UID Detection` 토글 추가
- 관리자 대화상자에 로컬 전용 YouTube Data API 키 입력 섹션 추가
- `pair_meta_v1`에 handle↔UID pair 메타데이터 저장
- `Create Pair`, `Update Pair` 액션 제공
- handle별 상태 배지 제공: `handle-only`, `paired`, `stale`, `mismatch`, `unverified`
- 관리자 대화상자에 로컬 `Handle Case Sensitive` 설정 추가
- 차단 목록에 row 체크박스, 필터 기준 전체 선택, 선택 개수 표시 추가
- 차단 목록에 `all|handle|id|regex` 타입 필터와 handle 태그 필터 추가
- 선택 항목 삭제, 선택 handle 대상 pair 생성/갱신 bulk 액션 추가
- stale 또는 mismatch pair가 있으면 watch 페이지에 검토 배너 표시
- import/export는 차단 규칙만 다루고, pair 메타데이터는 로컬 전용으로 유지

---

## 사용 방법

1. [Tampermonkey](https://www.tampermonkey.net/)를 설치합니다.
2. 위 raw URL로 설치하거나, 새 사용자 스크립트에 `ytblockhandlecomments.js`를 붙여넣습니다.
3. YouTube watch 페이지를 엽니다.
4. 댓글 작성자 handle을 우클릭해 차단 또는 해제합니다.
5. `Tampermonkey -> YouTube Comment Blocker -> Manage block list`를 엽니다.
6. Pair 기능을 쓰기 전에 YouTube Data API v3 API 키를 저장합니다.
7. handle 대소문자 설정, UID 감지 토글, 목록 필터, 선택 항목 bulk 액션, regex 추가,
   import/export를 사용합니다.

일반적인 UID 흐름:

1. 먼저 handle을 평소처럼 차단합니다.
2. `Manage block list`를 엽니다.
3. YouTube Data API v3 API 키를 저장합니다.
4. `UID Detection`을 켭니다.
5. pair가 없는 항목에 대해 `Create Pair`를 실행합니다.
6. 필요하면 타입/태그 필터와 bulk action으로 일부 항목만 대상으로 작업합니다.
7. 이후 stale 또는 mismatch가 보이면 `Update Pair`를 실행합니다.

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
  handleCaseSensitive: boolean
}
```

참고:

- 규칙 저장 키: `blocked_v2`
- pair 메타 저장 키: `pair_meta_v1`
- 앱 설정 저장 키: `app_settings_v1`
- API 설정 저장 키: `youtube_data_api_v3_config`
- 레거시 규칙 키 `blockedHandles`, `blockedHandles_v1`는 계속 자동 마이그레이션됩니다
- `v0.4.0`에서도 pair 메타데이터를 import/export에 포함하지 않습니다
- API 키는 Tampermonkey 로컬 저장소에만 저장되며 스크립트 코드에 포함되지 않습니다

---

## 참고 사항

- handle 매칭은 항상 활성 상태로 유지됩니다
- handle 매칭 기본값은 case-insensitive이며, exact 비교로 전환할 수 있습니다
- 기존 handle은 이미 소문자로 저장됐을 수 있어 exact 비교 보장은 재저장하거나 새로
  추가한 항목부터 적용됩니다
- UID 매칭은 `UID Detection` 토글로 켜고 끌 수 있습니다
- 현재 구현에서는 UID 감지가 켜져 있을 때만 `id` 규칙 매칭이 활성화됩니다
- UID 조회는 YouTube Data API v3 `channels.list`의 `forHandle` 필터를 사용합니다
- pair 생성/갱신에는 관리자 대화상자에 저장한 사용자 본인 API 키가 필요합니다
- bulk pair 액션은 선택된 `handle` 항목에만 적용됩니다
- UID 조회가 실패해도 handle 차단은 계속 동작하며, pair는 `unverified` 또는 `stale` 상태로 남습니다
- regex 규칙은 댓글 본문이 아니라 handle 텍스트에만 적용됩니다
- 댓글 숨김은 의도적으로 watch 페이지 댓글 범위에 한정됩니다
- 가벼운 성능 카운터는 `window.__ytCommentBlockerPerf`에서 확인할 수 있습니다

---

## 사용자 스크립트 메타데이터

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.4.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`

---

## 작성자

- **Mango_Clark**
- 라이선스: MIT
