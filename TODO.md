# TODO

## IMPORTANT

- None

## Normal

- 채널 ID 차단: `Extractor.getHandle`를 확장해 `channelId`도 추출하고, 저장소를 `StorageV2`로 마이그레이션해 ID 기반 차단을 우선 적용. 핸들이 바뀌거나 없는 경우에도 안정적으로 차단 유지.
- 정규식 차단 지원: `StorageV2`에 패턴 목록 추가(예: `{type:'regex', value:'.*spam.*'}`)하고 `CommentHider`에서 핸들/표시명에 매칭해 숨김. `BlockListManager` UI·가져오기/내보내기 포맷도 패턴 포함으로 확장.
- 성능 최적화: 현재 `MutationObserver`+`querySelectorAll` 스캔을 보완해 `IntersectionObserver`로 화면에 진입하는 코멘트만 평가. `CommentHider`에 `WeakSet`으로 처리된 노드 캐싱, 저장소 변경 시에만 전체 재평가.
- i18n 및 접근성: 모든 문자열을 딕셔너리로 분리(ko/en 자동 선택), `GM_registerMenuCommand`로 언어 선택 추가. `Dialog`에 `role="dialog" aria-modal="true"` 적용, `Toast`에 `aria-live="polite"` 추가, `prefers-color-scheme`로 다크 모드 스타일 대응.
- 검색을 O(logn)으로 할 수 있도록 정렬 및 이분 탐색.