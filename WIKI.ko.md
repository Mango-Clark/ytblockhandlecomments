# 📚 YouTube Comment Blocker 위키 — v0.3.0

[English](WIKI.md) | [한국어](WIKI.ko.md)

이 문서는 프로젝트의 상세 참고 문서입니다. `README.md`는 빠른 설치와 일상적인 사용법에
집중하고, 이 위키는 현재 동작 방식, 지원하는 데이터 형식, 내부 매칭 모델, 알려진 제약을
조금 더 자세히 설명합니다.

짧은 개요는 [README.md](README.md)를 참고하세요.

---

## 1. 개요

YouTube Comment Blocker는 선택한 YouTube 채널의 댓글을 숨기기 위한 Tampermonkey
사용자 스크립트입니다. 이 스크립트는 댓글 본문보다 채널 식별자 중심으로 동작합니다.

현재 지원하는 규칙 타입:

- `handle`: `@examplechannel` 같은 정규화된 `@handle` 값
- `id`: `UCxxxxxxxxxxxx` 같은 YouTube 채널 ID
- `regex`: 추출된 handle 텍스트에 대해 평가되는 정규식

현재 사용자 진입점:

- 댓글 작성자의 handle을 우클릭해서 차단 또는 해제
- 댓글 `⋯` 메뉴에서 `Hide comments from this channel` 사용
- Tampermonkey 메뉴에서 차단 목록 관리자 열기
- 관리자 대화상자에서 규칙 가져오기 또는 내보내기

이 스크립트가 하지 않는 일:

- 댓글 본문 키워드 차단은 하지 않음
- 업로드, 채팅, 현재 매칭 범위 밖의 답글, 서버 측 계정 동작은 제어하지 않음
- 채널 ID를 직접 입력하는 전용 UI는 아직 제공하지 않음

---

## 2. 지원 환경

이 스크립트는 다음 환경을 기준으로 설계되었습니다.

- Tampermonkey를 지원하는 브라우저 환경
- `https://www.youtube.com/*`에 매칭되는 YouTube 데스크톱 페이지
- `document-idle` 이후 런타임 활성화

실제 동작 범위는 `@match` 값보다 더 좁습니다.

- 댓글 숨김 observer 로직은 YouTube watch 페이지(`/watch`)에 맞춰져 있음
- 댓글 스캔은 YouTube 전체 페이지가 아니라 comments host에 붙음
- `⋯` 메뉴 확장 로직은 YouTube popup menu renderer를 감시해 커스텀 메뉴 항목 하나를
  주입함

즉, 다른 YouTube 화면에서도 Tampermonkey가 스크립트를 로드할 수는 있지만, 댓글 숨김
흐름 자체는 의도적으로 watch 페이지 댓글에 집중되어 있습니다.

---

## 3. 설치 및 업데이트

### raw 스크립트로 설치

1. [Tampermonkey](https://www.tampermonkey.net/)를 설치합니다.
2. 프로젝트 raw 스크립트 URL을 브라우저에서 엽니다.

   ```text
   https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js
   ```

3. Tampermonkey에서 설치를 확인합니다.

### 수동 설치

1. Tampermonkey에서 새 사용자 스크립트를 만듭니다.
2. 기본 템플릿을 `ytblockhandlecomments.js` 내용으로 교체합니다.
3. 스크립트를 저장합니다.

### 업데이트 동작

사용자 스크립트 메타데이터에는 `@updateURL`과 `@downloadURL`이 모두 들어 있으며, 둘 다
같은 raw GitHub 파일을 가리킵니다. 일반적인 Tampermonkey 환경에서는 이 값으로 수동
또는 자동 업데이트 확인을 더 쉽게 할 수 있습니다.

현재 메타데이터 요약:

- `@name`: `YouTube Comment Blocker`
- `@version`: `0.3.0`
- `@match`: `https://www.youtube.com/*`
- `@grant`: `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`,
  `GM_registerMenuCommand`

---

## 4. 빠른 시작

가장 짧고 실용적인 사용 흐름은 다음과 같습니다.

1. YouTube 동영상 watch 페이지를 엽니다.
2. 댓글 영역까지 스크롤합니다.
3. `@examplechannel` 같은 작성자 handle을 우클릭합니다.
4. 차단 확인 대화상자를 승인합니다.
5. 현재 페이지에서 매칭되는 댓글이 실시간으로 숨겨집니다.

나중에 저장된 항목을 관리하려면:

1. 페이지용 Tampermonkey 메뉴를 엽니다.
2. `Manage block list`를 선택합니다.
3. 저장된 항목을 확인, 제거, 가져오기, 내보내기, 정규식 추가를 수행합니다.

---

## 5. 일반적인 사용 흐름

### 작성자 handle에서 차단 또는 해제

댓글 작성자의 handle을 우클릭하면, 스크립트는 해당 handle 요소를 가로채 자체 확인
대화상자를 엽니다.

- 아직 차단되지 않았다면 `Block` 제공
- 이미 차단된 상태라면 `Unblock` 제공
- 저장되는 규칙 타입은 항상 `handle`

가장 빠른 일상 사용 흐름이며, 기본 진입점으로 의도된 기능입니다.

### `⋯` 메뉴에서 차단 또는 해제

스크립트는 YouTube 댓글 액션 메뉴도 확장합니다.

- 댓글 메뉴를 열면 스크립트가 마지막으로 감지한 handle을 기억함
- YouTube가 popup menu를 렌더링하면 항목 하나를 추가함
- 라벨은 `Hide comments from this channel` 또는
  `Unhide this channel's comments`로 전환됨

이 경로 역시 `handle` 규칙만 추가하거나 제거합니다.

### 차단 목록 관리

Tampermonkey 페이지 메뉴에서 다음 항목을 열 수 있습니다.

- `🔍 Manage block list`
- `🗑️ Clear block list`
- `🌐 Language: KO/EN`

`Manage block list`는 저장된 모든 항목을 검토하는 커스텀 대화상자를 엽니다.

### 정규식 규칙 추가

관리자 대화상자 안의 sticky regex bar에서 정규식 규칙을 직접 추가할 수 있습니다.

정규식 추가 폼에서 지원하는 입력 형식:

- `^@spam`
- `/^@promo/i`

정규식 추가 폼은 저장 전에 패턴을 검증합니다.

### 전체 규칙 초기화

`Clear block list`는 기본 저장 키에 있는 모든 항목을 삭제합니다. 먼저 확인
대화상자가 표시됩니다.

### 언어 변경

스크립트는 간단한 내장 i18n 사전을 통해 한국어와 영어를 지원합니다.

- 현재 언어는 `GM_getValue('lang')`에서 읽음
- 저장된 언어가 없으면 브라우저 언어를 참고하고, 필요 시 `ko`를 기본값으로 사용함
- 메뉴 명령은 `ko`와 `en` 사이를 토글함

일부 UI 텍스트는 해당 UI를 다시 열어야 반영됩니다.
[언어 동작 및 탭 간 동기화](#10-언어-동작-및-탭-간-동기화) 항목을 참고하세요.

---

## 6. 규칙 타입과 매칭 모델

저장 구조는 세 가지 규칙 타입을 지원하며, 세 타입은 동시에 공존할 수 있습니다.

### `handle` 규칙

Handle 규칙은 스크립트의 `norm()` 헬퍼를 통해 정규화됩니다.

- 값은 반드시 `@`로 시작해야 함
- 앞뒤 공백은 제거됨
- 저장 시 소문자로 변환됨
- 저장된 handle이 정규화되므로 실제 매칭은 대소문자를 구분하지 않는 효과를 냄

예시:

```text
@ExampleChannel   -> @examplechannel
 @spam.user       -> @spam.user
```

### `id` 규칙

채널 ID 규칙은 저장 전에 `UC...` 패턴으로 검증됩니다.

- 예시 형태: `UCXXXXXXXXXXXXXXXXXXXXXX`
- 댓글 DOM에 `/channel/UC...` 링크가 있으면 ID 매칭이 우선됨
- 현재 UI에는 ID를 직접 입력하는 전용 필드가 없음
- ID 규칙은 주로 JSON import 또는 고급 수동 편집 흐름에서 유용함

### `regex` 규칙

정규식 규칙은 추출된 handle 텍스트에만 적용됩니다.

- 댓글 본문은 검사하지 않음
- display name을 handle과 별도로 검사하지 않음
- 유효하지 않은 정규식은 저장 전에 거부됨

예시:

```text
^@spam
^@promo_.*
```

### 매칭 순서

각 댓글 노드에 대해 스크립트는 다음 순서로 평가합니다.

1. 채널 ID
2. Handle
3. Handle 대상 regex

처음으로 긍정 매칭된 시점에 `tm-hidden` 클래스를 토글해 댓글 노드를 숨깁니다.

---

## 7. 차단 목록 관리자

관리자 대화상자는 저장된 규칙을 유지보수하는 주요 UI입니다.

현재 노출되는 기능:

- 저장된 모든 규칙을 하나의 스크롤 가능한 대화상자에서 표시
- 각 행의 `Unblock` 버튼으로 저장 규칙 제거
- sticky header 영역에서 regex 규칙 추가
- regex 작성/테스트용으로 `regexr.com` 새 탭 열기
- import/export 대화상자 열기

목록 표시 형식:

- Handle 항목은 `@handle`
- 채널 ID 항목은 원본 `UC...` 값
- Regex 항목은 `/pattern/flags`

현재 관리자가 하지 않는 일:

- 항목을 자리에서 수정하지는 않음
- 타입별 그룹화는 하지 않음
- 검색, 정렬, 일괄 선택은 아직 제공하지 않음

---

## 8. 가져오기 및 내보내기 형식

스크립트는 구조화된 JSON과 plain text 흐름을 모두 지원합니다.

### JSON 내보내기

내보내기 대화상자에는 다음 형태의 JSON textarea가 포함됩니다.

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

이 형식은 특히 flags가 있는 regex 규칙까지 포함해 백업과 round-trip import에 가장
안전합니다.

### Plain-text 내보내기

내보내기 대화상자에는 한 줄에 한 항목씩 표시하는 plain-text textarea도 포함됩니다.

예시:

```text
@examplechannel
UC1234567890ABCDE
/^@spam/i
```

이 뷰는 간단한 목록을 읽거나 손으로 편집할 때 편리합니다.

### JSON 가져오기

가져오기 대화상자는 다음 형식을 받아들입니다.

- `items` 배열을 가진 V2 스타일 객체
- `handles` 배열을 가진 레거시 V1 스타일 객체

예시:

```json
{
  "version": 2,
  "items": [
    { "type": "handle", "value": "@examplechannel" },
    { "type": "regex", "value": "^@promo", "flags": "i" }
  ]
}
```

```json
{
  "version": 1,
  "handles": ["@examplechannel", "@anotherone"]
}
```

### Plain-text 가져오기

입력이 유효한 JSON이 아니면, 스크립트는 텍스트를 쉼표와 줄바꿈 기준으로 나눠 각 조각을
하나의 항목으로 해석합니다.

인식되는 plain-text 형식:

- `@handle`
- `UC...`
- `/regex/`

Plain-text regex import 관련 주의:

- Plain text에서는 `/^@spam/` 같은 slash-delimited regex를 flags 없이 쓰는 방식이
  가장 안정적으로 인식됨
- `i` 같은 regex flags가 필요하면 JSON import를 사용해야 정확하게 보존됨
- 전체적으로는 JSON import/export가 가장 안전한 백업 형식임

### 병합 동작

Import는 현재 목록을 자동으로 비우지 않습니다.

- 가져온 항목은 기존 항목과 병합됨
- 저장 경로에서 병합된 결과를 검증하고 dedupe함
- 정규화 과정에서 잘못된 handle, 잘못된 ID, 잘못된 regex 규칙은 제거됨

---

## 9. 저장 구조와 마이그레이션

기본 저장 키:

```text
blocked_v2
```

현재 저장 형태:

```ts
{
  version: 2,
  updatedAt: number,
  items: Array<
    | { type: 'id', value: string }
    | { type: 'handle', value: string }
    | { type: 'regex', value: string, flags?: string }
  >
}
```

초기화 시점에 여전히 인식하는 레거시 키:

- `blockedHandles`
- `blockedHandles_v1`

마이그레이션 동작:

- 스크립트는 v2, v1, legacy 항목을 모두 읽음
- 결합된 목록을 v2 스키마로 정규화함
- 중복 제거 후 `blocked_v2`에 다시 저장함

저장 경로에서 강제하는 검증 규칙:

- Handle은 소문자 `@handle`로 정규화되어야 함
- 채널 ID는 스크립트의 `UC[0-9A-Za-z_-]{10,}` 패턴을 만족해야 함
- Regex 규칙은 실제로 compile되어야 함

---

## 10. 언어 동작 및 탭 간 동기화

### 언어 동작

스크립트 파일 안에는 한국어와 영어 문자열이 함께 들어 있습니다.

현재 동작:

- 새로 여는 대화상자는 `getLang()`가 반환하는 현재 언어를 사용함
- 언어 토글은 `GM_setValue('lang', next)`에 다음 값을 저장함
- 언어를 변경한 직후 toast는 즉시 표시됨

현재 한계:

- 이미 열려 있는 대화상자는 실시간으로 다시 그려지지 않음
- Tampermonkey 메뉴 라벨은 시작 시점에 등록되므로, 일부 메뉴 텍스트는 스크립트를 다시
  로드하거나 페이지를 새로고침해야 갱신될 수 있음

### 탭 간 동기화

스크립트는 `GM_addValueChangeListener`를 통해 원격 `blocked_v2` 변경을 감지합니다.

다른 탭에서 차단 목록이 바뀌면:

- 현재 탭의 메모리 내 항목을 갱신함
- lookup set을 다시 구성함
- 현재 comments host에 대해 refresh를 예약함
- 다른 탭과 동기화되었다는 toast를 표시함

현재 탭 간 동기화는 차단 목록 저장소에 초점이 있으며, 다른 모든 UI 상태를 완전하게
실시간 갱신하는 방식은 아닙니다.

---

## 11. 실시간 숨김과 성능 설계

이 스크립트는 불필요한 재스캔을 줄이면서도 새 댓글과 YouTube SPA 내비게이션에 빠르게
반응하도록 설계되어 있습니다.

### 상위 흐름

1. 앱은 로드 후 다음 animation frame에서 부팅됩니다.
2. `/watch`에서 comments host를 찾습니다.
3. host가 아직 없으면 comments가 나타날 때까지 watch root를 관찰합니다.
4. host에 붙은 뒤에는 댓글 영역 mutation만 관찰합니다.
5. 새로 추가되거나 바뀐 comment root를 증분 갱신합니다.
6. 매칭된 댓글 노드에는 `tm-hidden`이 적용됩니다.

### 댓글별 추출 메타데이터

각 댓글 노드마다 스크립트는 다음 값을 캐시하려고 시도합니다.

- `#author-text > span`, `#author-handle`, `a[href^="/@"]`에서 `handle`
- `a[href*="/channel/UC"]`에서 `id`

이 메타데이터는 `WeakMap` 캐시에 저장되고, 필요할 때만 무효화됩니다.

### MutationObserver와 IntersectionObserver를 같이 쓰는 이유

- `MutationObserver`는 새로 삽입된 댓글 노드를 효율적으로 처리함
- `IntersectionObserver`는 관찰 중인 노드가 viewport에 들어올 때 숨김을 다시 적용함

### 현재 성능 카운터

스크립트는 가벼운 카운터를 다음 전역에 노출합니다.

```js
window.__ytCommentBlockerPerf
```

현재 필드:

- `mutationBatches`
- `fullRefreshes`
- `incrementalRefreshes`
- `scannedNodes`
- `lastDurationMs`
- `totalDurationMs`

### 현재 성능 트레이드오프

- 댓글 관찰은 watch 페이지 comments host에 한정해 전체 페이지 비용을 줄임
- 가능할 때는 full rescan보다 incremental refresh를 우선함
- `⋯` 메뉴 주입 경로는 현재 `document.body` subtree observer를 사용하므로 기능상은
  충분하지만, 범위는 이상적인 수준보다 넓음

---

## 12. 한계, 참고 사항, 문제 해결

### 현재 한계

- 댓글 숨김은 의도적으로 watch 페이지 댓글에 집중되어 있음
- Regex 규칙은 handle에만 적용되고 댓글 본문에는 적용되지 않음
- 일상적인 UI는 `handle` 규칙을 만들며, `id` 규칙은 주로 고급 import 경로임
- 일부 언어 변경은 UI를 다시 열거나 페이지를 새로고침해야 보임
- Regex flags를 보존해야 할 때 plain-text import는 가장 안전한 방식이 아니므로 JSON을
  사용해야 함

### 댓글이 숨겨지지 않을 때

다음을 확인하세요.

1. YouTube 동영상 watch 페이지(`/watch`)인지 확인합니다.
2. YouTube가 실제로 댓글을 렌더링하도록 댓글 영역까지 스크롤합니다.
3. `Manage block list`를 열어 항목이 실제로 저장되어 있는지 확인합니다.
4. Regex를 flags와 함께 import했다면 JSON 형식으로 다시 가져옵니다.
5. YouTube가 이미 열려 있던 상태에서 새로 설치하거나 업데이트했다면 페이지를
   새로고침합니다.

### `⋯` 메뉴 항목이 보이지 않을 때

- 다른 YouTube 화면이 아니라 실제 댓글 항목의 메뉴를 여는지 확인합니다.
- 스크립트가 handle을 잡기 전에 YouTube가 먼저 렌더링했을 수 있으니 메뉴를 닫았다가
  다시 열어 봅니다.
- `youtube.com`에서 Tampermonkey가 활성화되어 있는지 확인합니다.

### 언어 텍스트가 섞여 보일 때

- 커스텀 대화상자를 닫았다가 다시 엽니다.
- 새 언어로 Tampermonkey 메뉴 라벨이 다시 등록되도록 페이지를 새로고침합니다.

---

## 13. 향후 작업

아래 항목은 계획 중이거나 제안된 작업이며, `v0.3.0`에는 구현되어 있지 않습니다.

`TODO.md` 기준:

- 정렬 및 이분 탐색으로 lookup 효율 개선
- 언어 변경 직후 일부 i18n UI를 즉시 갱신
- `document.body`를 계속 감시하지 않도록 `⋯` 메뉴 주입 observer 범위 축소
- Dialog의 string HTML 삽입 경로 제거 또는 강화
- 차단 목록 UI의 선택/필터링 기능 확장

`docs/기획서.md` 기준:

- Handle 매칭 위에 추가 레이어로 동작하는 선택적 UID 기반 감지
- Handle↔UID pair 메타데이터
- 저장된 pair의 stale 또는 mismatch 상태
- 수동 pair 생성/업데이트 흐름과 stale 알림

이 UID/pair 항목은 아직 설계 단계 메모입니다. 현재 릴리스된 스크립트는 위에서 설명한
`handle`, `id`, `regex` 규칙 기반으로만 동작합니다.
