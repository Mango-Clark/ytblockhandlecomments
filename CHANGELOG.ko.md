# 변경사항

[English](CHANGELOG.md) | [한국어](CHANGELOG.ko.md)

이 프로젝트의 모든 중요한 변경 사항은 이 파일에 기록됩니다.

이 포맷은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)을 기반으로 하며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/spec/v2.0.0.html)을 따릅니다.

## [Unreleased]

### Added
- 없음

### Changed
- 없음

### Deprecated
- 없음

### Removed
- 없음

### Fixed
- 없음

### Security
- 없음

## [0.2.4] – 2025-08-17

### Added
- 사용자 스크립트 메타데이터: `@homepage` 추가

### Changed
- 사용자 스크립트 메타데이터: `@namespace` 수정

## [0.2.3] – 2025-08-17

### Fixed
- 페이지 새로고침 없이 즉시 차단/해제가 반영되도록, 새로고침 시 기존 댓글 노드를 재평가하고 업데이트를 막던 캐시 가드를 제거했습니다.

## [0.2.2] – 2025-08-15

### Changed
- 문서: README(영문/한국어) 표시 버전을 v0.2.2로 갱신
- 문서: 원클릭 설치용 raw URL과 메타데이터 섹션 추가
- 문서: 언어 전환 시 이미 열린 UI에 대한 안내 명확화

## [0.2.1] – 2025-08-15

### Added
- 차단 목록 대화상자에 정규식 직접 입력 폼 추가
- regexr.com으로 연결되는 “정규식 만들기/테스트” 버튼 추가
- 스크롤에 영향받지 않는 상단 고정(Sticky) 정규식 툴바 분리

### Changed
- 정규식 영역 버튼 높이를 낮춰 UI 간결화
- README/변경사항에 양방향 언어 링크바 추가
- 사용자 스크립트 @namespace 및 @updateURL/@downloadURL을 GitHub로 갱신

## [0.2.0] – 2025-08-15

### Added
- 채널 ID 기반 차단(가능 시 ID 우선, 핸들 폴백)
- 핸들에 대한 정규식 차단(검증 및 가져오기/내보내기 지원)
- i18n(한국어/영어) 및 접근성(ARIA, aria-live) 개선
- IntersectionObserver 기반 가시성 처리 및 WeakSet 노드 캐싱
- 언어 전환 Tampermonkey 메뉴 추가

### Changed
- 저장소를 v2 스키마로 업그레이드 `{version:2, items:[{type:'id'|'handle'|'regex', ...}]}` (자동 마이그레이션)
- 인라인 스타일 대신 클래스 토글로 일괄 업데이트

### Fixed
- rAF 디바운스와 스코프 기반 새로고침으로 불필요한 전체 스캔 감소

## [0.1.5] – 2025-08-15

### Fixed
- 탭 간 동기화 최적화: 원격 업데이트 수신 시 다시 쓰기를 방지하여 많은 탭에서 동기화 이벤트가 연쇄적으로 발생하며 지연이 커지는 문제 해결

### Changed
- 차단 목록이 변하지 않은 경우 중복 저장을 피하도록 내부 저장 로직 개선

## [0.1.4] – 2025-08-14

### Changed
- 차단 목록 다이얼로그의 가져오기/내보내기/닫기 버튼이 스크롤 없이 항상 보이도록 고정됨

## [0.1.3] – 2025-08-14

### Changed
- 기본 다이얼로그 UI를 확대하여 가독성 향상

### Fixed
- 차단 목록 내보내기 다이얼로그 너비 확장
- 내보낸 텍스트가 이제 각 핸들을 줄바꿈하여 표시함

## [0.1.2] – 2025-08-08

### Added
- 사용자 스크립트에 `@updateURL`과 `@downloadURL` 메타데이터 추가
- 저장소 버전 관리, 위임 컨텍스트 메뉴 이벤트, 탭 간 동기화, JSON 가져오기/내보내기 문서화

### Changed
- README를 영어로 재작성하고 한국어 번역본 추가

## [0.1.1] – 2025-08-08

### Fixed
- README에서 "Tampermonkey" 철자 수정

## [0.1.0] – 2025-08-08

### Added
- 클래스 기반 OOP 구조로 전체 코드 리팩토링
- 자동 메뉴 주입 기능을 `MenuEnhancer` 클래스로 분리
- 차단 목록 내보내기에 JSON 및 줄바꿈 텍스트 포맷 제공
- JSON 스키마 및 다중 포맷 가져오기 처리
- 버전이 있는 저장 키 `blockedHandles_v1` 도입 및 레거시 `blockedHandles` 자동 마이그레이션
- `GM_addValueChangeListener`로 탭 간 동기화 지원
- 핸들을 소문자로 정규화
- 포커스 트랩이 적용된 다이얼로그 개선
- MutationObserver와 requestAnimationFrame 기반 디바운스로 성능 향상

### Changed
- DOM 직접 바인딩 방식에서 위임 이벤트 처리로 변경
- 목록 UI를 동적으로 렌더링하도록 개선

### Deprecated
- `blockedHandles` 키는 유지하되 내부적으로는 사용하지 않음

### Fixed
- 일부 댓글 스레드에서 차단이 누락되던 문제 해결

### Security
- 다이얼로그에 텍스트 노드를 우선 사용하여 XSS 위험 감소

## [0.0.1] – 2025-07-06

### Added
- 댓글 작성자 `@handle`을 우클릭하여 차단/해제 기능
- 실시간 댓글 차단을 위한 `MutationObserver` 도입
- 차단된 핸들을 팝업에서 확인·해제 가능한 차단 목록 UI
- 줄바꿈 텍스트로 차단 목록 내보내기/가져오기 기능
- 다음 두 가지 Tampermonkey 메뉴 명령 추가:
  - 🔍 차단 목록 관리
  - 🗑️ 차단 목록 초기화
- 사용자용 커스텀 토스트 알림 및 간단한 다이얼로그 인터페이스
