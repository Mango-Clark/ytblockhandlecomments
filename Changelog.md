# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 새롭게 추가된 기능

### Changed

- 기존 기능이 변경된 내용

### Deprecated

- 향후 제거될 예정인 기능

### Removed

- 완전히 제거된 기능

### Fixed

- 버그 수정 내역

### Security

- 보안 관련 수정 내역

## [0.1.0] – 2025-08-08

### Added

- OOP 구조(Class 기반)로 전체 코드 리팩토링
- 댓글 ⋯ 메뉴 자동 주입 기능 분리 (`MenuEnhancer` 클래스)
- 차단 목록 내보내기(JSON + 라인별) 포맷 제공
- 가져오기 시 JSON 스키마 형식 및 다중 포맷 처리
- 차단 목록 저장 구조에 버전(`blockedHandles_v1`) 도입 및 레거시(`blockedHandles`) 자동 마이그레이션
- 탭 간 동기화(`GM_addValueChangeListener`) 지원
- 핸들 정규화(@handle → 소문자 처리)
- 포커스 트랩 적용한 다이얼로그 개선
- MutationObserver 및 rAF 기반 디바운스 적용으로 성능 향상

### Changed

- 기존 DOM 탐색/이벤트 처리 방식 → 위임 이벤트 처리로 변경
- 목록 UI를 동적으로 렌더링하도록 개선

### Deprecated

- `blockedHandles` 키는 유지하되 내부적으로는 사용하지 않음

### Removed

- 없음

### Fixed

- 일부 댓글 스레드에서 차단이 누락되던 문제 해결

### Security

- 다이얼로그에 텍스트 노드를 우선 사용하여 XSS 위험 감소

## [0.0.1] – 2025-07-06

### Added

- 댓글 작성자 핸들(@handle)을 우클릭하여 차단/해제하는 기능
- 실시간 댓글 차단 적용을 위한 `MutationObserver` 도입
- 차단된 핸들을 팝업에서 확인·해제 가능한 차단 목록 UI
- 차단 목록을 줄바꿈 텍스트로 **내보내기/가져오기** 기능
- Tampermonkey 메뉴(`GM_registerMenuCommand`)에 관리 명령 2종 추가:
  - 🔍 차단 목록 관리
  - 🗑️ 차단 목록 초기화
- 사용자용 커스텀 토스트 알림 및 간단한 다이얼로그 인터페이스

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
