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

## [0.9.0] - 2026-06-24

### Added

- 차단 댓글 표시 방식을 완전 차단, 대체 문구, 클릭해서 보기 중에서 고르는 설정을 추가했습니다.
- 확인 팝업 이후 앱 표시/매칭 설정을 초기화하는 버튼을 추가했습니다.

### Changed

- 설정 dialog의 관련 컨트롤을 더 쉽게 훑어볼 수 있도록 그룹화했습니다.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 차단된 상위 댓글 thread가 하위 답글까지 숨기거나 자동 싫어요를 누르던 문제를 수정했습니다.

### Security

- 없음

## [0.8.0] - 2026-06-23

### Added

- 차단 댓글 자동 싫어요 설정을 안함, 새로 숨길 때만, 숨긴 상태에서 항상의 3단계로 추가했습니다.

### Changed

- 자동 싫어요 모드 기본값을 안함으로 변경했습니다.
- 한국어와 영어 i18n dictionary를 별도 source file로 분리했습니다.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 없음

### Security

- 없음


## [0.7.0] - 2026-06-18

### Added

- API, UID detection, regex 자동 추가, debug counter를 다루는 별도 설정 dialog 추가.
- regex로 매칭된 handle을 자동 추가하는 옵션을 추가해, 같은 채널의 이후 댓글은 regex
  전에 handle 매칭을 사용하도록 함.

### Changed

- 없음

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 공유 UID 삭제 시 다른 pair가 같은 UID를 쓰고 있으면 관련 규칙이 유지되도록 수정.
- 원격 `blocked_v2` 동기화 시 항목을 로컬에서 다시 정규화하고 중복 제거하도록 수정.
- watch 페이지 pair 검토 배너가 `나중에` 또는 최근 pair 검사 후 stale 주기 전체 동안
  숨겨지도록 수정.
- 잘못된 import는 검증 실패가 보이도록 열린 상태를 유지하도록 수정.

### Security

- API fetch에 `referrerPolicy: 'no-referrer'`를 적용.
- `JSON.parse` 전에 import 텍스트 크기를 제한.
- 붙여넣은 API key를 저장 전에 정규화.

## [0.6.0] - 2026-05-20

### Added

- 외부 의존성 없는 `node:test` 기반 회귀 테스트 하네스와 로컬 DOM shim 추가.
- pair 실행 결과 필터/정렬과 실패 handle 복사/내보내기 helper 추가.
- YouTube Data API quota 테스트 실패가 반복될 때 구조화된 quota 안내 추가.
- 루트 userscript 배포 파일을 생성/검증하는 무의존성 build/check 스크립트와 역할별
  `src/` 소스 파일 추가.

### Changed

- 관리자 검색, 대화상자 i18n refresh, pair 결과 disclosure 상태, 탐색 observer reset,
  pair update skip/force 동작, regex safety/import literal 왕복을 자동 테스트로 커버.
- build가 읽기 쉬운 소스는 `src/`에 유지하면서 압축된 루트 userscript를 생성하도록 변경.
- 지원 문서를 `docs/`로 이동하고 내부 링크를 갱신했으며, 저장소 랜딩 페이지인
  루트 `README*.md`는 유지.
- 펼친 regex 매칭 목록은 결과를 페이지 단위로 표시하고 해당 regex 행만 갱신하도록 변경.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 없음

### Security

- 없음

## [0.5.1] - 2026-05-20

### Added

- 없음

### Changed

- UID mismatch 처리 시 오래된 저장 UID 규칙을 계속 두지 않고 최신 조회 UID로
  교체하도록 변경.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- plain-text regex import가 export된 `/pattern/flags` literal과 escaped slash 패턴을
  받아들이도록 수정.

### Security

- 댓글 매칭과 관리자 scan 중 catastrophic user regex로 페이지가 멈출 위험을 줄이기
  위해 regex pattern, flag, 대상 길이, 휴리스틱 safety 검사를 추가.

## [0.5.0] - 2026-05-20

### Added

- 관리자 대화상자에 현재 userscript 버전 표시 추가.

### Changed

- 기본 `Update Pair`가 stale 주기 전의 fresh verified pair를 건너뛰도록 변경하고,
  선택 handle bulk update는 명시적 사용자 요청으로 계속 강제 갱신되도록 유지.

### Fixed

- 영상 탐색 시 임시 댓글 observer와 메타데이터 캐시를 초기화해 긴 YouTube 세션에서
  분리된 댓글 DOM 노드를 계속 붙잡지 않도록 수정.

## [0.4.0] - 2026-04-12

### Added

- handle 대소문자 구분 설정용 새 저장소 `app_settings_v1` 추가
- 차단 목록 row 체크박스, 현재 필터 결과 전체 선택, 선택 개수 표시 추가
- 관리자 대화상자에 `all|handle|id|regex` 타입 필터와 handle 태그 필터 추가
- 선택 항목 삭제와 선택 handle 대상 pair 생성/갱신 bulk action 추가
- 인덱스 기반 substring 검색이 가능한 관리자 검색 추가
- regex 행에 매칭 handle 개수, inline 확장, matching-handle 선택 기능 추가
- 관리자와 watch 페이지 후속 dialog에 handle별 pair 실행 상세 결과 추가
- `youtube_data_api_v3_config`에 API 키 테스트 진단 결과 저장 추가
- 실시간 i18n 갱신용 menu 재등록과 dialog refresh hook 추가
- 사용자 스크립트 grant에 `GM_unregisterMenuCommand` 추가

### Changed

- handle 규칙이 저장된 casing을 보존하고 `handleCaseSensitive` 설정에 따라 비교되도록 변경
- pair 메타데이터 매칭도 차단 규칙과 같은 handle 비교 정책을 따르도록 변경
- 관리자 대화상자에 handle 대소문자 섹션과 확장된 목록 유지보수 툴바 추가
- `app_settings_v1`와 `lang` 변경도 탭 간 동기화 대상에 포함되도록 확장
- API 설정 저장소를 v2로 확장하고 마지막 키 테스트 결과를 유지하도록 변경
- watch 페이지 pair 배너에서 update 후 상세 결과를 바로 볼 수 있도록 변경
- 관리자 대화상자에서 visible/selected 규칙 계산을 공유하는 렌더 단위 view state로 정리
- regex 행 매칭이 dialog-session 캐시를 사용하고, 전체 match 배열은 expand 또는
  `Select matching handles` 때만 계산되도록 변경
- selection-only 동작은 규칙 목록 DOM 전체를 다시 만들지 않고 보이는 checkbox, counter,
  bulk action 상태만 갱신하도록 변경
- 댓글 숨김 page pipeline을 `/watch` 전용에서 `/watch`와 `/shorts/<id>` 지원으로 확장
- 명시적인 page-mode helper 기준으로 page sync와 comments host discovery를 재구성
- Shorts에서도 기존 comment matching / mutation 경로를 재사용하면서 pair banner는
  계속 watch-only로 유지

### Fixed

- 댓글 DOM 텍스트와 `/@...` 링크에서 추출한 handle이 case-sensitive 모드용 exact casing을 유지하도록 보정
- 태그 필터 사용 시 관련 없는 `id` 또는 `regex` 행이 같이 보이던 동작을 막고, 해당 handle만 표시되도록 정리
- 새로운 `pair_meta_v1` 저장소를 사용하는 선택적 UID 감지 토글 추가
- 관리자 대화상자에 handle↔UID pair 생성 및 갱신 액션 추가
- 차단된 handle에 대한 pair 상태 배지와 메타데이터 표시 추가
- stale 또는 mismatch 항목이 있을 때 pair 검토를 유도하는 watch 페이지 배너 추가
- pair 메타데이터 변경에 대한 탭 간 동기화 추가
- 관리자 대화상자에 로컬 전용 YouTube Data API v3 API 키 저장 기능 추가
- pair 생성/갱신이 `channels.list`의 `forHandle` 필터를 사용하도록 구현
- 관리자 대화상자에 UID 섹션, pair 요약 카드, pair 검사 시각을 확장 추가
- UID 조회 방식이 채널 페이지 스크래핑 대신 사용자 제공 API 키 기반 호출로 변경
- `id` 규칙 매칭은 항상 활성 대신 UID 감지 토글에 따라 동작하도록 변경
- `handle` 규칙 제거 시 연결된 UID 규칙과 pair 메타데이터도 함께 제거하도록 변경
- API 키가 저장되기 전에는 관리자에서 pair 액션이 비활성화되도록 변경
- 문서를 API 키 기반 UID 흐름과 로컬 전용 키 저장 방식에 맞춰 갱신
- UID 조회 실패 또는 pair 검증 실패 시 handle-only 차단이 안전한 fallback으로 계속 유지되도록 보강
- UID 조회가 YouTube 채널 페이지 HTML 구조 변화에 덜 취약하도록 개선
- regex 행 선택 시 전체 목록 재렌더를 피해서 `Select matching handles` 지연의 주원인 제거
- 같은 상호작용 안에서 search/selection 상태를 여러 번 다시 계산하던 중복 작업 감소
- watch-only page gating 때문에 건너뛰던 Shorts 페이지의 차단 댓글과 대댓글 숨김을 지원
- storage 변경 시 현재 연결된 comments host를 기준으로 refresh하여, 이미 host가 붙은
  Shorts에서는 block 직후 즉시 숨김이 반영되도록 보정

## [0.3.0] – 2026-04-07

### Added

- `window.__ytCommentBlockerPerf`로 확인할 수 있는 가벼운 성능 카운터 추가

### Changed

- 전체 페이지 반응 대신 watch 페이지와 comments host만 댓글 관찰 대상으로 제한
- 넓은 subtree 재스캔 대신 영향받은 댓글 루트만 증분 처리하도록 새로고침 방식 변경
- 댓글별 handle/channel 메타데이터를 노드 단위로 캐시하고 `IntersectionObserver.observe()` 등록을 중복 방지

### Fixed

- 전역 DOM 감시와 반복 댓글 재스캔 때문에 발생하던 YouTube UI 지연 감소

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
