# 개발 가이드 (CONTRIBUTING)

AI 산학협력 관리 시스템 협업 규칙입니다. 새로 합류했다면 이 문서를 먼저 읽어주세요.

## 목차
- [개발 시작하기](#개발-시작하기)
- [브랜치 전략](#브랜치-전략)
- [브랜치 이름 규칙](#브랜치-이름-규칙)
- [커밋 메시지 규칙](#커밋-메시지-규칙)
- [작업 흐름 (이슈에서 머지까지)](#작업-흐름-이슈에서-머지까지)
- [릴리즈와 핫픽스](#릴리즈와-핫픽스)
- [운영 안전수칙](#운영-안전수칙)

---

## 개발 시작하기

사전 준비: Node.js 18.18 이상, PostgreSQL 접속 정보(또는 Supabase URL).

```bash
git clone https://github.com/wlsgur11/PNUAICMS.git
cd PNUAICMS

# 1) 의존성 설치
npm install

# 2) 환경변수 설정: .env.example 을 복사해 값 채우기
cp .env.example .env       # PowerShell: Copy-Item .env.example .env

# 3) Prisma 클라이언트 생성
npx prisma generate

# 4) 개발 서버 실행 → http://localhost:3000
npm run dev
```

- 환경변수 항목 설명은 [`.env.example`](./.env.example)에 주석으로 적혀 있습니다.
- Google OAuth 설정이 번거로우면 로컬 `.env`에서 `AUTH_BYPASS="true"`로 두면 로그인 없이 띄울 수 있습니다. (운영에는 절대 금지, 아래 참고)
- 데이터 구조는 [`DB.md`](./DB.md) 참고.

자주 쓰는 명령:

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npx tsc --noEmit` | 타입 검사 (PR 전 필수) |
| `npm run build` | 운영 빌드 |
| `npx prisma studio` | DB를 표로 열어보기 |

---

## 브랜치 전략

"Git Flow lite"를 씁니다. 작은 팀에 맞춰 정식 Git Flow에서 `release/*` 단계를 뺀 형태입니다.

```
feature/*  fix/*
     \       /
      ▼     ▼
     develop  ← 평소 개발이 모이는 통합 브랜치 (기본 브랜치)
        │
        ▼  (릴리즈: PR + 태그)
       main   ← 운영 서버에 배포되는 브랜치
        ▲
   hotfix/*   ← 운영 긴급 수정 (main에서 분기 → main과 develop 둘 다 반영)
```

- **`main`** = 운영. 직접 push 금지, PR로만 변경. 머지되면 자동 배포됩니다.
- **`develop`** = 통합/스테이징. 기본 브랜치. 모든 기능 브랜치는 여기서 분기하고 여기로 머지합니다.
- **`feature/*`, `fix/*`** = 작업 브랜치. `develop`에서 분기.
- **`hotfix/*`** = 운영 긴급 수정. `main`에서 분기.

> 브랜치 보호 규칙(직접 push 금지·리뷰 필수) 설정 방법은 [`docs/branch-protection.md`](./docs/branch-protection.md) 참고.

---

## 브랜치 이름 규칙

형식: `<type>/<이슈번호>-<짧은-설명>`

```
feature/12-swcu-export
fix/15-dashboard-0percent
docs/18-contributing
hotfix/21-login-redirect
```

- `<type>`: `feature` `fix` `hotfix` `docs` `refactor` `chore`
- `<이슈번호>`: 관련 GitHub 이슈 번호 (이슈가 없으면 생략 가능)
- `<짧은-설명>`: 영어 소문자 + 하이픈, 3~5단어

---

## 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org)를 따릅니다.

```
<type>: <한 줄 요약>

<본문: 무엇을 왜 바꿨는지 (선택)>
```

| type | 쓰는 때 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `style` | 포맷/공백 등 (로직 무관) |
| `chore` | 빌드·설정·의존성 등 잡일 |

예: `feat: SW중심대학 성과 탭에 연도별 추이 그래프 추가`

---

## 작업 흐름 (이슈에서 머지까지)

1. **이슈 생성** — 버그/기능 템플릿으로 작성. 무엇을·왜를 남깁니다.
2. **브랜치 분기** — `develop`에서 규칙대로 분기.
   ```bash
   git checkout develop && git pull
   git checkout -b feature/12-swcu-export
   ```
3. **작업 + 커밋** — 작은 단위로 자주 커밋. 커밋 규칙 준수.
4. **PR 전 점검** — `npx tsc --noEmit` 통과, 로컬에서 동작 확인.
5. **PR 생성** — base는 `develop`. PR 템플릿을 채우고 `Closes #이슈번호` 연결.
6. **리뷰** — 최소 1명 승인. 리뷰 의견은 반영하거나 근거를 들어 논의.
7. **머지** — **Squash and merge** 권장(커밋 이력이 깔끔해짐). 머지 후 작업 브랜치 삭제.

---

## 릴리즈와 핫픽스

**릴리즈 (develop → main)**
- `develop`이 충분히 안정되면 `develop → main` PR을 만듭니다. 이 머지가 곧 운영 배포입니다.
- 머지 후 버전 태그를 답니다. 버전은 [SemVer](https://semver.org): `v메이저.마이너.패치`
  ```bash
  git checkout main && git pull
  git tag v2.2.0
  git push origin v2.2.0
  ```
- `package.json`의 `version`도 함께 올립니다.

**핫픽스 (운영 긴급 수정)**
- `main`에서 `hotfix/*`로 분기 → 수정 → `main`으로 PR/머지(배포).
- 같은 수정을 `develop`에도 반드시 반영(백머지)해 두 브랜치가 어긋나지 않게 합니다.

---

## 운영 안전수칙

협업 중 사고를 막기 위한 규칙입니다. 꼭 지켜주세요.

- **`main` 직접 push 금지.** 항상 PR로. 머지 즉시 운영에 배포됩니다.
- **`AUTH_BYPASS`는 운영에서 항상 `false`(또는 미설정).** `true`면 로그인 전체가 무력화됩니다. 로컬 테스트 후 `true`로 커밋/배포하지 않도록 주의.
- **DB 작업 주의.** 현재 `DATABASE_URL`은 운영 Supabase를 가리킵니다. `prisma db push` / `migrate`는 **운영 DB에 즉시 반영**됩니다. 로컬 전용 DB가 없으면 스키마 작업 전 반드시 공유하세요.
- **비밀값 커밋 금지.** `.env`, API 키, DB 비밀번호는 절대 올리지 않습니다(`.gitignore`로 막혀 있지만 재확인).
- **데이터 삭제성 작업은 두 번 확인.** 운영 데이터는 복구가 어렵습니다.

---

## 향후 계획 (참고)

- 배포: 현재 Vercel → 자체 서버 PC로 이전 예정. 단일 서버 단계에서는 Docker Compose, 규모가 커지면 Swarm을 검토합니다.
- 코드 가독성 리팩토링: 후임이 이해하기 쉽도록 점진적으로 진행합니다.
