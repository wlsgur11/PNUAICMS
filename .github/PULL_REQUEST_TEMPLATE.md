<!--
PR 제목은 Conventional Commits 형식 권장: feat: / fix: / docs: / refactor: / chore:
대상 브랜치(base)는 보통 develop 입니다. (운영 긴급수정 hotfix만 main)
-->

## 작업 내용
<!-- 무엇을 왜 바꿨는지 1~3줄로 -->

## 관련 이슈
<!-- 예: Closes #12  (이슈 번호를 적으면 머지 시 자동으로 닫힙니다) -->
Closes #

## 변경 유형
<!-- 해당되는 항목에 x -->
- [ ] feat: 새 기능
- [ ] fix: 버그 수정
- [ ] docs: 문서
- [ ] refactor: 동작 변화 없는 구조 개선
- [ ] chore: 빌드/설정/잡일

## 확인한 것 (셀프 체크)
- [ ] `npx tsc --noEmit` 통과
- [ ] 로컬에서 화면/동작 직접 확인
- [ ] DB 스키마 변경 시: 운영 DB 영향 검토 (`prisma db push`는 운영 Supabase에 바로 반영됨)
- [ ] 운영 비밀값/`.env`를 커밋하지 않음
- [ ] `AUTH_BYPASS`를 코드/설정에 `true`로 남기지 않음

## 스크린샷 (UI 변경 시)
<!-- 변경 전/후 -->

## 리뷰어에게
<!-- 특히 봐줬으면 하는 부분, 미리 알아둘 맥락 -->
