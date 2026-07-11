# TODO

## P0 — Critical

## P1 — High

- [ ] 댓글 `⋯` 메뉴에 `Hide comments from this channel` 항목 추가

  - `README.md`에는 이미 지원 기능으로 설명되어 있지만, 현재 실제 댓글 메뉴에는 신고 항목만 표시되는 회귀/누락이 있음.
  - YouTube의 기본 메뉴 항목을 덮어쓰거나 신고 항목으로 오인되지 않도록, 기존 YouTube 메뉴와 시각적으로 구분되는 별도 항목/UI로 구현.
  - 메뉴를 연 댓글의 작성자 handle을 기준으로 차단하고, 기존 handle-UID pair 저장 및 차단 흐름과 동일하게 처리.
  - watch page와 Shorts page에서 동작하고, 메뉴를 닫았다 다시 열어도 중복 항목이 생성되지 않도록 idempotent하게 삽입.
  - 차단 완료 후 메뉴/댓글 상태를 즉시 갱신하고, 이미 차단된 채널에는 차단 해제 또는 비활성 상태를 명확히 표시.
  - YouTube DOM 변경에 대비해 메뉴 위치 탐색, 이벤트 연결, 중복 삽입 방지, 기능 동작을 테스트.

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

- [ ] verbose level 설정 추가

  - V=0: Get straight to the answer with zero extra commentary.
  - V=1: Provide a brief, straightforward answer.
  - V=2: Add moderate detail.
  - V=3: Default balanced explanation.
  - V=4: In-depth analysis and context.
  - V=5: Extremely verbose and exhaustive

- [ ] 내보내기 창에 뒤로가기 버튼 추가

- [ ] 내보내기 창에 파일로 내보내기 버튼 추가

## Blocked

## Backlog

## Done
