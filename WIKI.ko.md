# 📚 YouTube Comment Blocker 위키 — v0.4.0-pre1

[English](WIKI.md) | [한국어](WIKI.ko.md)

이 문서는 현재 구현 기준의 상세 참고 문서입니다. `README.md`는 설치와 일상적인
사용법에 집중하고, 이 위키는 저장 구조, 매칭 방식, UID pair 동작, 알려진 제약을 더
자세히 설명합니다.

짧은 개요는 [README.md](README.md)를 참고하세요.

---

## 1. 개요

이 사용자 스크립트는 watch 페이지에서 YouTube 댓글을 채널 식별자 기준으로 숨깁니다.

`blocked_v2`에서 지원하는 규칙 타입:

- `handle`: 정규화된 `@handle`
- `id`: `UC...` 형태의 YouTube 채널 ID
- `regex`: 추출된 handle 텍스트에 적용되는 정규식

`pair_meta_v1`에서 지원하는 pair 메타데이터:

- `enableUidDetection`: UID 기반 매칭 on/off
- `pairs[]`: 저장된 handle↔UID 관계 메타데이터
- `verifiedAt`, `status`, `source`: 검증 및 문제 파악용 필드

추가 로컬 설정:

- `youtube_data_api_v3_config`: pair 액션용 사용자 API 키를 로컬에 저장

현재 사용자 진입점:

- 댓글 작성자 handle 우클릭
- 댓글 `⋯` 메뉴에 주입된 항목 사용
- Tampermonkey 메뉴의 `Manage block list`
- 관리자 대화상자의 `Create Pair`, `Update Pair`
- watch 페이지의 stale/mismatch 배너

아직 하지 않는 일:

- 댓글 본문 키워드 차단은 하지 않음
- pair 메타데이터 import/export는 하지 않음
- pair를 자동 주기 polling으로 갱신하지 않음

---

## 2. 지원 환경

이 스크립트는 다음 환경을 기준으로 설계되었습니다.

- Tampermonkey를 지원하는 브라우저
- `https://www.youtube.com/*`
- `document-idle` 시점 실행

실제 댓글 숨김 동작 범위는 더 좁습니다.

- 매칭과 숨김은 YouTube watch 페이지(`/watch`)에 한정됨
- 댓글 새로고침은 comments host에만 붙음
- `⋯` 메뉴 확장기는 여전히 `document.body`에서 YouTube popup 생성 시점을 감시함

---

## 3. 설치 및 업데이트

### raw 스크립트로 설치

1. [Tampermonkey](https://www.tampermonkey.net/)를 설치합니다.
2. 아래 주소를 엽니다.

   ```text
   https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
   ```

3. Tampermonkey에서 설치를 승인합니다.

### 메타데이터 요약

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.4.0-pre1`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`

---

## 4. 일반적인 사용 흐름

### handle에서 차단 또는 해제

1. YouTube watch 페이지를 엽니다.
2. 댓글 작성자 handle을 우클릭합니다.
3. `Block` 또는 `Unblock`을 확인합니다.

이 경로는 항상 `handle` 규칙을 추가하거나 제거합니다.

### `⋯` 메뉴에서 차단 또는 해제

스크립트는 마지막으로 열린 댓글 액션 메뉴의 handle을 기억해 다음 항목을 주입합니다.

- `Hide comments from this channel`
- `Unhide this channel's comments`

이 경로도 `handle` 규칙만 추가하거나 제거합니다.

### UID 감지 켜기

1. `Manage block list`를 엽니다.
2. YouTube Data API v3 API 키를 저장합니다.
3. `UID Detection`을 켭니다.
4. 기존 handle 규칙은 그대로 유지됩니다.
5. `id` 규칙도 댓글 매칭에 참여하기 시작합니다.

### Pair 생성

1. 관리자를 엽니다.
2. `Create Pair`를 누릅니다.
3. 스크립트가 pair가 없는 handle의 UID를 조회합니다.
4. 성공하면 pair 메타데이터를 저장하고 대응되는 `id` 규칙도 추가합니다.
5. 실패하면 handle 차단은 유지되고 pair는 `unverified`가 됩니다.

### Pair 갱신

1. 관리자나 watch 페이지 배너에서 `Update Pair`를 실행합니다.
2. 기존 pair를 다시 조회합니다.
3. UID가 같으면 `verifiedAt`만 갱신합니다.
4. UID가 다르면 pair를 `mismatch`로 표시합니다.
5. mismatch가 나와도 기존 handle 및 저장된 `id` 규칙은 자동 제거하지 않습니다.

---

## 5. 매칭 모델

### 항상 켜져 있는 동작

Handle 매칭은 항상 활성 상태입니다.

### 선택적 UID 동작

UID 매칭은 `pair_meta_v1.enableUidDetection`으로 제어됩니다.

현재 구현 세부사항:

- UID 감지가 켜져 있을 때만 `id` 규칙이 활성화됩니다
- UID 감지를 꺼도 저장된 `id` 규칙과 pair 메타데이터는 유지되지만, UID 기반 댓글 매칭은 중지됩니다

### 댓글당 매칭 순서

각 댓글 노드에 대해:

1. 채널 ID 매칭
2. Handle 매칭
3. Handle 대상 regex 매칭

처음 긍정 매칭된 시점에 `tm-hidden`을 토글합니다.

### 추출 메타데이터

댓글 노드별로 다음 값을 읽으려고 시도합니다.

- `#author-text > span`, `#author-handle`, `a[href^="/@"]`에서 `handle`
- `a[href*="/channel/UC"]`에서 `id`

이 메타데이터는 `WeakMap`에 캐시되고, 새로고침 대상 노드만 무효화됩니다.

---

## 6. Pair 메타데이터 모델

저장 키:

```text
pair_meta_v1
```

저장 형태:

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

상태 의미:

- `verified`: 최근 성공 조회가 저장된 UID와 일치함
- `stale`: 7일 동안 검증되지 않음
- `mismatch`: 최근 조회가 다른 UID를 반환함
- `unverified`: 조회 실패이거나 아직 검증된 UID가 없음

관리자 배지:

- `handle-only`
- `paired`
- `stale`
- `mismatch`
- `unverified`

`handle-only`는 handle은 차단되어 있지만, 해당 handle에 연결된 usable pair 기반 UID 규칙이
아직 없다는 뜻입니다.

API 키 설정 저장 형태:

```ts
{
  version: 1,
  apiKey: string
}
```

API 키는 차단 규칙 및 pair 메타데이터와 분리해 저장되며 import/export에는 포함되지
않습니다.

---

## 7. UID 조회 전략

현재 조회 방식:

1. Tampermonkey 로컬 저장소에서 사용자가 저장한 YouTube Data API v3 키를 읽음
2. `GET https://www.googleapis.com/youtube/v3/channels` 호출
3. `part=id`, `forHandle=@handle`, `key=<apiKey>` 전달
4. 응답의 `items[0].id`를 channel ID로 사용

이 방식은 공식 `channels.list` 문서의 `forHandle` 필터를 따르며, 요청에는 정확히 하나의
filter 파라미터만 사용합니다.

Fallback 동작:

- 조회가 실패해도 handle 차단은 계속 동작합니다
- 실패하거나 오래된 pair는 `unverified` 또는 `stale`로 남습니다
- 조회 실패만으로 기존 pair 데이터를 조용히 삭제하지 않습니다
- API 키가 저장되지 않았으면 pair 생성/갱신은 실행되지 않습니다

---

## 8. 차단 목록 관리자

관리자 대화상자는 이제 세 개의 유지보수 영역으로 구성됩니다.

### UID 섹션

- 로컬 전용 YouTube Data API 키 입력
- `UID Detection` 토글
- `Create Pair`
- `Update Pair`
- Pair 요약 카드
- 마지막 pair 검사 시각

### Regex 섹션

- 인라인 regex 추가 폼
- `regexr.com`으로 연결되는 `Build/Test Regex` 버튼

### 규칙 목록

- 모든 `handle`, `id`, `regex` 항목 표시
- handle 항목에는 pair 배지와 메타데이터 표시
- 행별 삭제 지원

삭제 동작:

- `handle` 규칙을 제거하면 연결된 pair 메타데이터와 paired `id` 규칙도 함께 제거됩니다
- `Clear block list`는 규칙 저장소와 pair 메타데이터를 모두 비웁니다

---

## 9. 가져오기 및 내보내기

지원되는 import/export는 `blocked_v2`만 대상으로 합니다.

### JSON 내보내기

```json
{
  "version": 2,
  "exportedAt": 1710000000000,
  "items": [
    { "type": "handle", "value": "@examplechannel" },
    { "type": "id", "value": "UC1234567890ABCDE" },
    { "type": "regex", "value": "^@spam", "flags": "i" }
  ]
}
```

### Plain-text 내보내기

```text
@examplechannel
UC1234567890ABCDE
/^@spam/i
```

### JSON 가져오기

- `items`가 있는 V2 객체
- `handles`가 있는 레거시 V1 객체

### Plain-text 가져오기

- `@handle`
- `UC...`
- `/regex/`

현재 경계:

- pair 메타데이터는 의도적으로 `v0.4.0-pre1` import/export 범위에서 제외됩니다
- API 키도 import/export에 포함되지 않고 로컬에만 저장됩니다

---

## 10. 탭 간 동기화 및 알림

스크립트는 다음 Tampermonkey 저장 변경을 감지합니다.

- `blocked_v2`
- `pair_meta_v1`

다른 탭에서 값이 바뀌면:

- 현재 탭의 메모리 상태를 갱신함
- lookup set을 다시 구성함
- 현재 댓글을 다시 평가함
- 동기화 toast를 표시함

Watch 페이지 알림 동작:

- UID 감지가 켜져 있고 `stale` 또는 `mismatch` pair가 하나 이상 있으면 배너를 표시합니다
- 배너는 `Update Now`와 `Later`를 제공합니다
- `Later`는 대략 하루 동안 배너를 다시 띄우지 않습니다

---

## 11. 실시간 숨김과 성능

상위 런타임 흐름:

1. 앱은 로드 후 다음 animation frame에서 시작합니다.
2. `/watch`에서 comments host를 찾거나 기다립니다.
3. 댓글 영역만 관찰합니다.
4. 영향받은 comment root만 증분 갱신합니다.
5. 매칭된 댓글에 `tm-hidden`을 적용합니다.

성능 관련 참고:

- 댓글 관찰은 watch 페이지 comments host로 한정됩니다
- full rescan보다 incremental refresh를 우선합니다
- `IntersectionObserver`로 viewport에 들어오는 관찰 노드에 숨김을 다시 적용합니다
- 가벼운 카운터는 `window.__ytCommentBlockerPerf`에 노출됩니다

---

## 12. 한계 및 문제 해결

현재 한계:

- UID 조회는 quota가 남아 있는 유효한 YouTube Data API v3 키에 의존합니다
- Pair 메타데이터는 로컬 전용이며 import/export에 포함되지 않습니다
- 일부 메뉴 텍스트는 언어 전환 후 UI 재오픈이나 새로고침이 필요합니다
- Regex 규칙은 handle에만 적용되고 댓글 본문에는 적용되지 않습니다

댓글이 숨겨지지 않을 때:

1. watch 페이지인지 확인합니다.
2. 관리자에서 규칙이 실제로 있는지 확인합니다.
3. UID 매칭을 기대한다면 `UID Detection`이 켜져 있는지 확인합니다.
4. 관리자에 유효한 API 키가 저장되어 있는지 확인합니다.
5. pair가 없거나 `unverified`면 `Create Pair` 또는 `Update Pair`를 실행합니다.
6. YouTube가 이미 열려 있던 상태에서 설치/업데이트했다면 페이지를 새로고침합니다.

UID 매칭이 활성화되지 않을 때:

1. 관리자에서 해당 handle의 배지를 확인합니다.
2. `handle-only` 또는 `unverified`면 `Create Pair`를 실행합니다.
3. `stale` 또는 `mismatch`면 `Update Pair`를 실행합니다.
4. 계속 실패하면 스크립트는 안전하게 handle-only 동작으로 fallback합니다.

---

## 13. 향후 작업

`v0.4.0-pre1` 이후에도 남아 있는 `TODO.md` 기준 작업:

- 정렬 및 이분 탐색 기반 lookup 효율 개선
- 언어 변경 직후 일부 메뉴/다이얼로그 라벨 즉시 갱신
- `document.body`를 계속 감시하지 않도록 `⋯` 메뉴 observer 범위 축소
- Dialog의 string HTML 삽입 경로 제거 또는 강화
- 목록 필터링/선택 기능 확장
- API 키 검증/테스트 UX와 quota/오류 표시 개선

Pair 시스템 자체는 구현되었지만, 조회 소스와 실패 처리 방식은 앞으로 더 다듬을 수 있습니다.
