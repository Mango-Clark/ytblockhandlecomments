# TODO

## Important

- [x] 다양한 차단 방식 지원 설정 추가.
  - 기본 차단 기준은 `handle` 유지.
  - `pair` 최초 생성 시에는 `handle -> UID` 조회를 사용.
  - `pair update` 는 저장된 `UID` 를 기준으로 handle 상태를 갱신하는 흐름을 지원.
  - 각 차단 방식이 저장소와 UI에서 어떻게 노출되는지 명확히 구분.
- 댓글 자체에서 키워드 확인하여 자동 싫어요 및 차단목록 등록.
  - 댓글 본문, 작성자 handle, 고정 문구 등 어떤 입력을 검사할지 설정 가능해야 함.
  - 키워드 일치 시 자동으로 `싫어요`, `handle 차단`, `UID pair` 중 필요한 동작만 선택해서 실행.
  - 중복 등록은 막고, 기존 차단 규칙과 충돌하지 않게 처리.
- log 파일 / console logging 생성 여부 각각 설정 만들어줘
  - 파일 로그 저장 여부와 console 출력 여부를 분리.
  - 로그 레벨, 보관 범위, 저장 위치는 최소한 설정 단위로 구분.
  - 디버그용 로그가 사용자 차단 동작을 느리게 만들지 않게 고려.
- verbose level
  - V=0: Get straight to the answer with zero extra commentary.
  - V=1: Provide a brief, straightforward answer.
  - V=2: Add moderate detail.
  - V=3: Default balanced explanation.
  - V=4: In-depth analysis and context.
  - V=5: Extremely verbose and exhaustive

## Normal

## Small

- 내보내기 창에서 뒤로가기, 파일로 내보내기 버튼 만들어줘.
