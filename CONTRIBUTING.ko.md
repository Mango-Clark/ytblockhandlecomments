# 기여 안내

[English](CONTRIBUTING.md) | [한국어](CONTRIBUTING.ko.md)

## 시작하기 전에

- 저장소 루트의 `AGENTS.md`와 수정 영역에 적용되는 `AGENTS.md`를 확인하세요.
- `dev`에서 시작하세요. `master`에서 직접 작업하지 마세요.
- `feature/<slug>`, `fix/<slug>`, `docs/<slug>` 형식의 목적에 맞는 브랜치를 사용하세요.

## 변경하기

- 변경 범위를 좁게 유지하고 작업 디렉터리에 이미 있는 관련 없는 변경을 보존하세요.
- TypeScript 소스는 `src/`에서 수정하세요. `ytblockhandlecomments.js`는 생성 파일입니다. 소스 변경 후 `npm run build`를 실행하고 생성 결과도 함께 포함하세요.
- 생성 문서는 `src/template/`에서 수정하세요. `npm run build`로 README와 `docs/` 생성 파일을 갱신하고 생성 파일을 직접 편집하지 마세요. `docs/AGENTS.md`는 직접 관리합니다.
- 영어·한국어 문서를 함께 맞추세요. 영어를 먼저 수정한 뒤 한국어 짝 문서를 갱신하고, 섹션 순서·링크·명령·날짜·버전을 동일하게 유지하세요.
- UI·README는 10개 로케일을 지원합니다. 영어 메시지 계약을 먼저 갱신하고 모든 카탈로그·README 번역을 맞추세요. 매개변수·명령·기계용 식별자는 보존합니다. 언어명·README 경로·기여자는 `src/i18n/locales.ts`, 언어 범위는 `i18n-mason.toml`에서 관리합니다.
- 의미 있는 기술 변경은 기존 Keep a Changelog 범주를 사용해 짝 changelog의 `Unreleased`에 기록하세요.
- 사용자 동작, 저장 방식, 호환성 설명은 실제 구현과 일치시켜야 합니다.

## 검증 및 제출

- 제출 전에 `npm run verify`를 실행하세요. 코드 lint, Markdown lint, typecheck, test, build, 생성 결과 검사를 수행합니다.
- 작업 중에는 필요한 개별 명령을 사용할 수 있습니다: `npm run lint`, `npm run lint:markdown`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:build`.
- 허용된 유형을 사용하는 Conventional Commit을 작성하세요. 예: `docs: add contribution guide`, `fix: preserve pair state`.
- `dev` 대상 pull request를 여세요. 변경 요약과 실행한 검증 명령 및 결과를 적으세요. `master`에 직접 push하지 마세요.
- 명시적 요청 없이 버전을 변경하거나 release하지 마세요. Release는 `npm run bump:version -- <MAJOR.MINOR.PATCH>`를 사용합니다.
