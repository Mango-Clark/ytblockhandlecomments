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
