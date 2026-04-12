# TODO

## IMPORTANT

- [x] 차단이 실시간으로 적용이 안됨. 차단 이후 새로고침 또는 다른 비디오로 넘어가야함. (v0.2.3에서 해결)
- [x] 전체 YouTube DOM 감시로 인한 지연을 줄이기 위해 watch 페이지 댓글 영역만 관찰하도록 최적화. (v0.3.0에서 해결)
- [x] 선택적 UID 기반 감지와 handle↔UID pair 메타 저장소 추가. (v0.4.0-pre1에서 해결)
- [x] pair 생성/갱신, stale/mismatch 배지, watch 페이지 알림 추가. (v0.4.0-pre1에서 해결)
- [x] UID 조회를 YouTube Data API v3 `channels.list(forHandle)` 기반으로 전환하고 API 키를 로컬 저장 방식으로 분리. (v0.4.0-pre1에서 해결)
- [x] handle 대소문자 구분 설정 추가. (v0.4.0-pre2에서 해결)
- [x] 차단된 채널 list에서 Checkbox 만들기. 전체 check하는 box도 만들기. check된 채널만 삭제, 또는 pair 등의 행동을 할 수 있는 버튼, 드롭박스를 만들기. (v0.4.0-pre2에서 해결)
- [x] 차단된 채널의 tag(paired, unverified 등) 별도로 check 할 수 있게하기. (v0.4.0-pre2에서 해결)

## Normal

- [ ] 검색을 O(logn)으로 할 수 있도록 정렬 및 이분 탐색.
- [ ] 언어 변경이 바로 안됨. 언어 변경 이후에 새로 고침을 해야지만 언어 변경이 됨. 변경 안되는 부분은 menuChange, menuClear.
- [ ] regex 만족하는 개별 태그는 삭제.
- [ ] i18n 실시간 반영: 열린 다이얼로그/메뉴 텍스트도 즉시 업데이트되도록 개선.
- [ ] ⋯ 메뉴 주입용 MutationObserver가 document.body 전체 subtree를 계속 감시하지 않도록 범위를 줄이거나 필요할 때만 연결하도록 개선.
- [ ] Dialog body의 string HTML 삽입 경로를 제거하거나 sanitize를 강제해 향후 XSS footgun을 막기.
- [ ] API 키 유효성 테스트 버튼과 quota/에러 상세 표시를 추가.
- [ ] pair bulk action 결과를 행 단위로 더 자세히 보여주는 요약 UI 추가.

## small

- [ ] 선택된 항목 개수와 현재 필터 결과 개수를 더 명확히 구분해 표시.
