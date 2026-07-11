# TODO

## P0 — Critical

## P1 — High

## P2 — Normal

- [ ] 테마 설정 확장

  - 설정에서 다음 모드를 선택할 수 있도록 지원: `라이트`, `다크`, `기기설정`, `기기설정(반대)`, `yt설정`, `yt설정(inverted)`, `커스텀`.
  - `기기설정`은 OS의 `prefers-color-scheme`을 따르고, `기기설정(반대)`는 그 결과를 반전.
  - `yt설정`은 현재 YouTube 테마를 감지해 적용하고, `yt설정(inverted)`는 감지한 YouTube 테마를 반전.
  - 테마 모드 변경 시 설정 화면과 모든 관리 UI에 즉시 적용하고, 새로고침/탭 재실행 후에도 저장된 모드를 복원.
  - `커스텀` 선택 시 별도의 테마 커스텀 UI 창을 열어 색상 등 사용자 값을 편집하고 저장할 수 있게 구현.
  - 커스텀 UI는 각 모드의 적용 범위를 명확히 보여주고, 기본값 복원 및 잘못된 색상값 검증을 제공.
  - YouTube 본문/기존 YouTube UI와 확장 UI의 테마 적용 범위를 분리해 기존 페이지 스타일을 오염시키지 않도록 구현.

## P3 — Low

## Blocked

## Backlog

## Done

- [x] 댓글 `⋯` 메뉴에 `Hide comments from this channel` 항목 추가
- [x] verbose level 설정 추가
- [x] 내보내기 창에 뒤로가기 버튼 추가
- [x] 내보내기 창에 파일로 내보내기 버튼 추가
