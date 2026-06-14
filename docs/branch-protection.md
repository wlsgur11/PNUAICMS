# 브랜치 보호 설정 가이드

`main`과 `develop`을 실수로 망가뜨리지 않도록 GitHub에서 보호 규칙을 거는 방법입니다. 저장소 관리자(Owner)가 한 번만 설정하면 됩니다.

## 1. 기본 브랜치를 develop으로 변경

평소 PR이 `develop`을 기준으로 열리도록 기본 브랜치를 바꿉니다.

1. GitHub 저장소 → **Settings** → **General**
2. **Default branch** 항목에서 연필(↔) 아이콘 클릭
3. `develop` 선택 → **Update**

> `develop` 브랜치가 아직 없다면 먼저 만들어 push 해야 목록에 나옵니다.
> ```bash
> git checkout main && git pull
> git checkout -b develop
> git push -u origin develop
> ```

## 2. 브랜치 보호 규칙 추가

**Settings → Branches → Add branch ruleset** (또는 구버전: *Add rule*).

### main (운영) — 엄격하게
- **Branch name pattern**: `main`
- ✅ Require a pull request before merging
  - ✅ Require approvals: **1**
- ✅ Require status checks to pass (CI를 붙이면 빌드/타입검사 통과 필수로)
- ✅ Do not allow bypassing the above settings (관리자도 직접 push 금지)
- ✅ Restrict deletions (브랜치 삭제 금지)

### develop (통합) — 약간 느슨하게
- **Branch name pattern**: `develop`
- ✅ Require a pull request before merging
  - 승인은 1명 권장(인원이 적으면 선택)
- ✅ Restrict deletions

## 3. 머지 방식 정리 (선택)

**Settings → General → Pull Requests**

- ✅ Allow squash merging  ← 기본값으로 권장 (커밋 이력이 깔끔)
- ⬜ Allow merge commits (필요 없으면 끔)
- ✅ Automatically delete head branches (머지된 작업 브랜치 자동 삭제)

## 4. 라벨·마일스톤 (가벼운 관리)

GitHub Projects 대신 이슈 라벨과 마일스톤으로 관리합니다.

- 라벨 예: `bug` `enhancement` `docs` `refactor` `good first issue`(후임 입문용)
- 마일스톤 예: `v2.2.0` 처럼 릴리즈 단위로 묶기

---

설정 후에는 [`CONTRIBUTING.md`](../CONTRIBUTING.md)의 작업 흐름대로 진행하면 됩니다.
