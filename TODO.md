# TODO

## IMPORTANT

- None

## Normal

- 채널 ID 차단:
  - `Extractor` 확장으로 `channelId` 추출(`a[href*="/channel/UC"]` 등 경로/속성 탐색).
  - 저장소 `StorageV2` 도입: `{type:'id'|'handle', value:string}` 스키마.
  - 마이그레이션: V1 핸들 목록을 V2로 승격하고 새 키에 저장.
  - `CommentHider`: ID 우선 매칭, 없으면 핸들 폴백. id/handle 전용 Set 유지.
  - `BlockListManager`: 목록에 핸들과 ID 동시 표기, 항목 해제 시 두 키 동기화.
  - 가져오기/내보내기: V2 JSON 포맷 지원, V1 자동 감지/병합.
  - 교차 탭 동기화: V2 키 기준 리스너 등록 및 로컬 반영.
- 정규식 차단 지원:
  - `StorageV2`에 `{type:'regex', value:string, flags?:string}` 추가 및 유효성 검사.
  - 매칭 대상: 핸들(`@...`) 및 표시명(가능 시)만 매칭(본문 제외).
  - `CommentHider`: 정규식 사전 컴파일/캐시, 일치 시 즉시 차단.
  - UI: 패턴 추가/삭제, 시험 입력 필드, 잘못된 정규식 경고.
  - 가져오기/내보내기: 패턴 포함 V2 JSON/텍스트 지원.
  - 성능 가드: 패턴 수 제한, try/catch 보호, 디버그 플래그로 로깅.
- 성능 최적화:
  - `IntersectionObserver`로 화면에 진입하는 코멘트만 평가.
  - `WeakSet` 캐시와 data-sentinel로 중복 처리 방지.
  - 전체 `querySelectorAll` 스캔 지양, scope 기반 새로고침 + rAF 디바운스.
  - 저장소 변경 시에만 set 재구성, DOM 변경에는 증분 적용.
  - 인라인 스타일 대신 클래스 토글로 일괄 스타일 적용.
  - 단일 `MutationObserver` 보장 및 네비게이션 시 `disconnect()` 처리.
  - 타이밍 로그와 디버그 플래그로 성능 영향 측정.
- i18n 및 접근성:
  - 문자열 i18n 딕셔너리 분리(ko/en), `navigator.language` 기반 기본값.
  - `GM_registerMenuCommand`로 언어 선택 제공, 설정 저장/즉시 반영.
  - `Dialog`에 `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 적용, 포커스 복귀.
  - `Toast`에 `aria-live="polite"`와 키보드 해제 경로 제공.
  - `prefers-color-scheme` 대응 CSS 변수 도입(명암/고대비).
  - RTL 대비 레이아웃/읽기순서 점검 체크리스트.
- 검색을 O(logn)으로 할 수 있도록 정렬 및 이분 탐색.
