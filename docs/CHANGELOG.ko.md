# 변경사항

[English](CHANGELOG.md) | [한국어](CHANGELOG.ko.md)

모든 중요 변경 기록.

[Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 기반.
[Semantic Versioning](https://semver.org/lang/ko/spec/v2.0.0.html) 준수.

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

## [1.5.0] - 2026-07-18

### Added

- 설정 dialog 기본 저장 선택지에 회색 `(기본)` 표시.
- 공개 YouTube 채널 페이지 기본 handle→channel ID 조회, 결과 cache, 명시적 API 조회/API fallback, 갱신 주기, 새 handle 조회 설정 추가.

### Changed

- 없음

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 기존 debug metrics에 개인정보 제외 page, comments host, extraction 진단 추가.
- 예상 밖 async 오류 후 API·pair control 복구. 겹친 pair 요청은 단일 실행으로 병합.
- 중첩 dialog keyboard·backdrop 동작을 최상위 dialog에만 전달. 닫은 뒤 opener focus 복원.
- YouTube 테마 탐색을 직접 `ytd-app` lifecycle 변경으로 제한. YouTube 테마 외 모드에서 theme observer 비활성화.
- Tampermonkey 쓰기 거부 시 기존 설정, 규칙, pair 메타데이터, API 키, 로그 유지. 성공 알림 대신 재시도 안내.
- migration된 v2 규칙 삭제/전체 초기화 후 legacy 차단 항목 재등장 방지.
- 탭 간 동시 차단 목록 쓰기의 추가 항목 유실 방지. 추가·삭제·전체 초기화 충돌의 결정론적 수렴.
- handle context menu 가로채기를 댓글 작성자로 제한. 다른 handle 링크는 YouTube 기본 context menu 유지.
- comment host 탐색의 넓은 page root fallback 제거. 실패 mutation 재시도 제한.
- Shorts 댓글 관찰을 단일 comment renderer 대신 안정적 panel에 연결.
- page-data와 History API 갱신용 page-key 중복 제거 YouTube SPA 감지 추가.
- fallback channel ID 추출 경로와 pair mode 댓글 channel ID 미검출 진단 추가.
- YouTube가 comment DOM node를 새 댓글 identity에 재사용할 때 keyword·자동 싫어요 재적용.

### Security

- 없음

## [1.4.0] - 2026-07-12

### Added

- 필수 `origin/dev` push 후 `master` fast-forward 및 선택적 push 릴리스 스크립트 옵션 추가.

### Changed

- 없음

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- YouTube 테마 관찰자가 userscript 테마 클래스 변경에 재반응해 페이지를 반복 갱신하던 문제 수정.

### Security

- 없음

## [1.3.0] - 2026-07-11

### Added

- 로그 payload용 V0-V5 진단 상세도 설정.
- 차단 목록 내보내기 dialog에 JSON/텍스트 파일 다운로드와 목록 복귀 동작.
- 키워드 자동 처리 선택사항별 설명.
- 정규식 규칙·세부 키워드 설정용 차단 및 키워드 자동 처리 통합 창.
- 기기설정, yt설정, 반전, 커스텀 포함 userscript UI 테마 선택.

### Changed

- 설정 매칭 그룹 위 간격 추가. 설정 초기화는 파괴적 작업으로 강조.
- 설정에는 키워드 자동 처리 전체 on/off만 유지. 세부 설정은 통합 창으로 이동.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 재사용/지연 생성 YouTube popup에도 댓글 `⋯` 메뉴 항목 중복 없이 재주입.

### Security

- 없음

## [1.2.0] - 2026-07-11

### Added

- 로컬 로그 보관·브라우저 console 로그 독립 설정, 로그 수준/보관 수, 텍스트 파일 다운로드 추가.

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

## [1.1.0] - 2026-07-11

### Added

- 기본 `handle` 규칙/UID pair `id` 규칙 선택 신원 차단 방식.
- 저장 UID 확인/handle 재조회 선택 pair 갱신 검사.
- 댓글 본문, 작성자 handle, 고정 표시 문구용 키워드 자동 처리.

### Changed

- pair 최초 생성은 갱신 검사 설정과 무관하게 handle에서 UID 조회.
- 키워드 동작의 댓글별 중복 실행, 차단 목록·pair 요청 중복 방지.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 없음

### Security

- 없음

## [1.0.2] - 2026-07-11

### Added

- console 로그 prefix, 선택적 시간 표시, ISO/직접 시간 형식, timezone 선택.

### Changed

- 설정 dialog를 그룹화된 컨트롤·설명·자동 저장 안내 포함 카테고리 목록 레이아웃으로 변경.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 없음

### Security

- 없음

## [1.0.1] - 2026-07-04

### Added

- API 키 테스트와 pair 생성/갱신의 API 응답 대기 중 loading bar 표시.
- 설정 dialog↔차단 목록 이동 버튼.
- 글자 크기·UI 크기 각각 5단계 설정.

### Changed

- 없음

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 차단 목록 dialog의 기존 설정, API, pair 섹션을 실제 본문에 연결.

### Security

- 없음

## [1.0.0] - 2026-07-04

### Added

- 없음

### Changed

- 읽기 쉬운 `src/` source slice를 JavaScript→TypeScript로 변경. 생성 userscript 출력 유지.
- Node test runner workflow 유지, test file JavaScript→TypeScript 변경.
- 기존 npm command 유지, build/version script JavaScript→TypeScript 변경.
- userscript build가 명시적 TypeScript module을 esbuild로 bundle. 생성 출력은 ESLint 대상 제외.
- split userscript file을 단일 strict module로 처리하지 않도록 source, script, test file TypeScript project 경계 추가.
- source, script, test TypeScript check용 project `typecheck` script 추가.

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

- 차단 댓글 표시 방식: 완전 차단/대체 문구/클릭해서 보기.
- 확인 팝업 후 앱 표시/매칭 설정 초기화 버튼.

### Changed

- 설정 dialog 관련 컨트롤을 쉽게 훑도록 그룹화.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 차단된 상위 댓글 thread가 하위 답글까지 숨기거나 자동 싫어요를 누르던 문제 수정.

### Security

- 없음

## [0.8.0] - 2026-06-23

### Added

- 차단 댓글 자동 싫어요 3단계: 안함/새로 숨길 때만/숨긴 상태에서 항상.

### Changed

- 자동 싫어요 기본값을 안함으로 변경.
- 한국어·영어 i18n dictionary를 별도 source file로 분리.

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

- API, UID detection, regex 자동 추가, debug counter용 별도 설정 dialog.
- regex 매칭 handle 자동 추가 옵션. 같은 채널의 이후 댓글은 regex보다 handle 매칭 우선.

### Changed

- 없음

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- 공유 UID 삭제 시 다른 pair가 같은 UID를 사용하면 관련 규칙 유지.
- 원격 `blocked_v2` 동기화 시 로컬 재정규화·중복 제거.
- watch 페이지 pair 검토 배너를 `나중에` 또는 최근 pair 검사 후 stale 주기 동안 숨김.
- 잘못된 import는 검증 실패 표시를 위해 열린 상태 유지.

### Security

- API fetch에 `referrerPolicy: 'no-referrer'` 적용.
- `JSON.parse` 전 import 텍스트 크기 제한.
- 붙여넣은 API key를 저장 전 정규화.

## [0.6.0] - 2026-05-20

### Added

- 외부 의존성 없는 `node:test` 기반 회귀 테스트 하네스·로컬 DOM shim.
- pair 실행 결과 필터/정렬, 실패 handle 복사/내보내기 helper.
- YouTube Data API quota 테스트 반복 실패 시 구조화된 quota 안내.
- 루트 userscript 배포 파일 생성/검증용 무의존성 build/check 스크립트와 역할별 `src/` 소스 파일.

### Changed

- 관리자 검색, 대화상자 i18n refresh, pair 결과 disclosure 상태, 탐색 observer reset, pair update skip/force, regex safety/import literal 왕복 자동 테스트.
- build는 읽기 쉬운 소스를 `src/`에 유지하고 압축된 루트 userscript 생성.
- 지원 문서를 `docs/`로 이동, 내부 링크 갱신. 저장소 랜딩 페이지 루트 `README*.md` 유지.
- 펼친 regex 매칭 목록은 페이지 단위 표시, 해당 regex 행만 갱신.

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

- UID mismatch 시 오래된 저장 UID 규칙을 최신 조회 UID로 교체.

### Deprecated

- 없음

### Removed

- 없음

### Fixed

- plain-text regex import가 export된 `/pattern/flags` literal과 escaped slash 패턴 수용.

### Security

- 댓글 매칭·관리자 scan 중 catastrophic user regex의 페이지 정지 위험 완화: regex pattern, flag, 대상 길이, 휴리스틱 safety 검사.

## [0.5.0] - 2026-05-20

### Added

- 관리자 대화상자에 현재 userscript 버전 표시.

### Changed

- 기본 `Update Pair`는 stale 주기 전 fresh verified pair를 건너뜀. 선택 handle bulk update는 명시적 요청으로 강제 갱신 유지.

### Fixed

- 영상 탐색 시 임시 댓글 observer·메타데이터 캐시 초기화. 긴 YouTube 세션에서 분리된 댓글 DOM 노드 유지 방지.

## [0.4.0] - 2026-04-12

### Added

- handle 대소문자 구분 설정용 새 저장소 `app_settings_v1`
- 차단 목록 row 체크박스, 현재 필터 결과 전체 선택, 선택 개수 표시
- 관리자 대화상자에 `all|handle|id|regex` 타입 필터와 handle 태그 필터
- 선택 항목 삭제와 선택 handle 대상 pair 생성/갱신 bulk action
- 인덱스 기반 substring 관리자 검색
- regex 행 매칭 handle 개수, inline 확장, matching-handle 선택
- 관리자·watch 페이지 후속 dialog에 handle별 pair 실행 상세 결과
- `youtube_data_api_v3_config`에 API 키 테스트 진단 결과 저장
- 실시간 i18n 갱신용 menu 재등록·dialog refresh hook
- 사용자 스크립트 grant에 `GM_unregisterMenuCommand`

### Changed

- handle 규칙은 저장 casing 보존, `handleCaseSensitive` 설정에 따라 비교
- pair 메타데이터 매칭도 차단 규칙과 같은 handle 비교 정책 적용
- 관리자 대화상자에 handle 대소문자 섹션·확장 목록 유지보수 툴바
- `app_settings_v1`·`lang` 변경도 탭 간 동기화
- API 설정 저장소를 v2로 확장, 마지막 키 테스트 결과 유지
- watch 페이지 pair 배너에서 update 후 상세 결과 즉시 표시
- 관리자 대화상자의 visible/selected 규칙 계산을 공유 렌더 단위 view state로 정리
- regex 행 매칭은 dialog-session 캐시 사용. 전체 match 배열은 expand 또는 `Select matching handles` 때만 계산
- selection-only 동작은 규칙 목록 DOM 전체 재생성 없이 보이는 checkbox, counter, bulk action 상태만 갱신
- 댓글 숨김 page pipeline을 `/watch` 전용에서 `/watch`와 `/shorts/<id>` 지원으로 확장
- 명시적 page-mode helper 기반 page sync·comments host discovery 재구성
- Shorts도 기존 comment matching/mutation 경로 재사용. pair banner는 watch-only 유지

### Fixed

- 댓글 DOM 텍스트와 `/@...` 링크에서 추출한 handle의 case-sensitive 모드용 exact casing 유지
- 태그 필터 시 무관한 `id`/`regex` 행 노출 방지, 해당 handle만 표시
- 새 `pair_meta_v1` 저장소 기반 선택적 UID 감지 토글
- 관리자 대화상자에 handle↔UID pair 생성·갱신 액션
- 차단 handle의 pair 상태 배지·메타데이터 표시
- stale/mismatch 항목 시 pair 검토 유도 watch 페이지 배너
- pair 메타데이터 탭 간 동기화
- 관리자 대화상자에 로컬 전용 YouTube Data API v3 API 키 저장
- pair 생성/갱신에 `channels.list`의 `forHandle` 필터 사용
- 관리자 대화상자 UID 섹션, pair 요약 카드, pair 검사 시각 확장
- UID 조회를 채널 페이지 스크래핑에서 사용자 제공 API 키 호출로 변경
- `id` 규칙 매칭을 UID 감지 토글에 따라 동작하도록 변경
- `handle` 규칙 제거 시 연결 UID 규칙·pair 메타데이터도 제거
- API 키 저장 전 관리자 pair 액션 비활성화
- 문서를 API 키 기반 UID 흐름·로컬 전용 키 저장 방식에 맞게 갱신
- UID 조회/pair 검증 실패 시 handle-only 차단 fallback 유지
- UID 조회의 YouTube 채널 페이지 HTML 구조 변화 내성 개선
- regex 행 선택 시 전체 목록 재렌더 방지, `Select matching handles` 지연 주원인 제거
- 같은 상호작용 내 search/selection 상태 중복 계산 감소
- watch-only page gating으로 누락된 Shorts 차단 댓글·대댓글 숨김 지원
- storage 변경 시 현재 comments host 기준 refresh. 연결된 Shorts에서 block 직후 즉시 숨김 반영

## [0.3.0] – 2026-04-07

### Added

- `window.__ytCommentBlockerPerf`로 확인 가능한 가벼운 성능 카운터

### Changed

- 전체 페이지 대신 watch 페이지·comments host만 댓글 관찰
- 넓은 subtree 재스캔 대신 영향받은 댓글 루트만 증분 처리
- 댓글별 handle/channel 메타데이터를 노드 단위 캐시, `IntersectionObserver.observe()` 중복 등록 방지

### Fixed

- 전역 DOM 감시·반복 댓글 재스캔으로 인한 YouTube UI 지연 감소

## [0.2.4] – 2025-08-17

### Added

- 사용자 스크립트 메타데이터: `@homepage`

### Changed

- 사용자 스크립트 메타데이터: `@namespace` 수정

## [0.2.3] – 2025-08-17

### Fixed

- 새로고침 없이 즉시 차단/해제 반영. 새로고침 시 기존 댓글 노드 재평가, 업데이트 방해 캐시 가드 제거.

## [0.2.2] – 2025-08-15

### Changed

- 문서: README(영문/한국어) 표시 버전 v0.2.2
- 문서: 원클릭 설치 raw URL·메타데이터 섹션
- 문서: 언어 전환 시 열린 UI 안내 명확화

## [0.2.1] – 2025-08-15

### Added

- 차단 목록 대화상자에 정규식 직접 입력 폼
- regexr.com 연결 “정규식 만들기/테스트” 버튼
- 스크롤 독립 상단 고정(Sticky) 정규식 툴바

### Changed

- 정규식 영역 버튼 높이 축소
- README/변경사항에 양방향 언어 링크바
- 사용자 스크립트 @namespace 및 @updateURL/@downloadURL을 GitHub로 갱신

## [0.2.0] – 2025-08-15

### Added

- 채널 ID 기반 차단(가능 시 ID 우선, 핸들 폴백)
- 핸들 정규식 차단(검증·가져오기/내보내기)
- i18n(한국어/영어)·접근성(ARIA, aria-live) 개선
- IntersectionObserver 기반 가시성 처리·WeakSet 노드 캐싱
- 언어 전환 Tampermonkey 메뉴

### Changed

- 저장소를 v2 스키마로 업그레이드 `{version:2, items:[{type:'id'|'handle'|'regex', ...}]}` (자동 마이그레이션)
- 인라인 스타일 대신 클래스 토글로 일괄 업데이트

### Fixed

- rAF 디바운스·스코프 기반 새로고침으로 불필요한 전체 스캔 감소

## [0.1.5] – 2025-08-15

### Fixed

- 탭 간 동기화 최적화: 원격 업데이트 수신 시 재쓰기 방지, 다중 탭 동기화 이벤트 연쇄·지연 해결

### Changed

- 차단 목록 불변 시 중복 저장 방지

## [0.1.4] – 2025-08-14

### Changed

- 차단 목록 다이얼로그 가져오기/내보내기/닫기 버튼을 스크롤 없이 항상 표시

## [0.1.3] – 2025-08-14

### Changed

- 기본 다이얼로그 UI 확대, 가독성 향상

### Fixed

- 차단 목록 내보내기 다이얼로그 너비 확장
- 내보낸 텍스트의 핸들별 줄바꿈 표시

## [0.1.2] – 2025-08-08

### Added

- 사용자 스크립트에 `@updateURL`과 `@downloadURL` 메타데이터
- 저장소 버전 관리, 위임 컨텍스트 메뉴 이벤트, 탭 간 동기화, JSON 가져오기/내보내기 문서화

### Changed

- README 영어 재작성·한국어 번역본 추가

## [0.1.1] – 2025-08-08

### Fixed

- README의 "Tampermonkey" 철자 수정

## [0.1.0] – 2025-08-08

### Added

- 클래스 기반 OOP 구조로 전체 리팩토링
- 자동 메뉴 주입을 `MenuEnhancer` 클래스로 분리
- 차단 목록 내보내기에 JSON·줄바꿈 텍스트 포맷
- JSON 스키마·다중 포맷 가져오기
- 버전 저장 키 `blockedHandles_v1` 도입, 레거시 `blockedHandles` 자동 마이그레이션
- `GM_addValueChangeListener`로 탭 간 동기화
- 핸들 소문자 정규화
- 포커스 트랩 적용 다이얼로그
- MutationObserver·requestAnimationFrame 기반 디바운스 성능 향상

### Changed

- DOM 직접 바인딩→위임 이벤트 처리
- 목록 UI 동적 렌더링

### Deprecated

- `blockedHandles` 키 유지, 내부 미사용

### Fixed

- 일부 댓글 스레드 차단 누락 해결

### Security

- 다이얼로그에 텍스트 노드 우선 사용, XSS 위험 감소

## [0.0.1] – 2025-07-06

### Added

- 댓글 작성자 `@handle` 우클릭 차단/해제
- 실시간 댓글 차단용 `MutationObserver`
- 차단 핸들 확인·해제 팝업 목록 UI
- 줄바꿈 텍스트 차단 목록 내보내기/가져오기
- Tampermonkey 메뉴 명령 2개:
  - 🔍 차단 목록 관리
  - 🗑️ 차단 목록 초기화
- 커스텀 토스트 알림·간단한 다이얼로그 UI
