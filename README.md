# 📌 YouTube Comment Blocker by Handle — v0.1.0

Tampermonkey에서 동작하는 사용자 스크립트로, **YouTube 댓글에서 특정 사용자 핸들(@handle)을 차단**할 수 있습니다.
차단된 사용자의 댓글은 실시간으로 숨겨지며, 차단 목록은 **메뉴로 관리/가져오기/내보내기** 할 수 있습니다.

---

## ✅ 주요 기능

* 🔇 댓글의 작성자 핸들을 우클릭 → 차단/해제
* ⋯ 메뉴에도 "이 채널 댓글 숨김" 항목 자동 추가
* 실시간 DOM 반영: MutationObserver로 유튜브 동적 댓글 처리 대응
* 🔧 차단 목록 팝업:

  * 차단된 핸들 목록 확인/해제
  * 내보내기 (`@handle` 줄바꿈 텍스트)
  * 가져오기 (`@handle` 붙여넣기)
* 📝 설정 메뉴 (`GM_registerMenuCommand`)

  * `🔍 차단 목록 관리`
  * `🗑️ 차단 목록 초기화`

---

## 🧠 사용 방법

1. [Tampermonkey](https://www.tampermonkey.net/) 확장 설치
2. 새 사용자 스크립트로 `ytblockhandlecomments.js` 내용 붙여넣기
3. YouTube 페이지 접속 후, 댓글 영역에서 다음 사용 가능:

   * 작성자 핸들 우클릭 → 차단/해제 팝업
   * 핸들이 아닌 곳에서 우클릭 → Tampermonky → YouTube Comment Blocker by Handle → 차단 목록 관리 / 초기화

---

## 💾 저장 구조

* 저장 키: `'blockedHandles'`
* 저장 값: 문자열 배열 (예: `["@user1", "@user2"]`)
* LocalStorage가 아닌 Tampermonkey의 `GM_getValue`, `GM_setValue`를 사용

---

## ⚠️ 한계 및 주의사항 (v1.0)

* 핸들 비교 시 **대소문자 구분함** (`@Mango_Clark` ≠ `@mango_clark`)
* 차단 목록 저장 구조는 **버전이 없음** (v1.1부터 JSON 스키마 기반으로 개선 예정)
* 우클릭 이벤트는 DOM에 직접 바인딩 (O(n)) → 성능 이슈 가능
* 단일 탭 동작 기준. **탭 간 동기화는 미지원**
* 다이얼로그 내 `textarea` 접근은 DOM 직접 접근 방식으로 불안정

---

## 👤 Author

* **Mango\_Clark**
* License: MIT
