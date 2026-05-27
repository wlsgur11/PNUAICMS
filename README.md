# 부울경 AI기업 관리 시스템 v2 (Next.js + PostgreSQL)

부산대학교 교육원의 부울경 AI기업 인턴십·취업연계·산학협력 관리 CMS.
**v1(Google Sheets + Apps Script)을 "구글 시트를 안 쓰는" 버전으로 재구성**한 것.

- **DB**: PostgreSQL (데모: Supabase / 운영: 교내 서버 Docker)
- **앱**: Next.js 14 (App Router) + Prisma + TypeScript
- **인증**: 데모는 스텁(로그인 없음) → 운영 전환 시 NextAuth(Google, `@pusan.ac.kr` 제한)
- **디자인**: 교수님 시안(AI Biz Connect) — 인디고 사이드바 + 둥근 카드
- **자동조회**: 이름 입력 → 네이버/DART 자동 채움 (API 키 있을 때만 활성)
- **엑셀형 입력**: AG Grid 인라인 편집으로 일괄 입력

## v1 대비 무엇이 좋아졌나

| v1(시트) 한계 | v2 해결 |
|---|---|
| 동시 편집 → 늦게 저장한 쪽이 덮어씀 | `version` 컬럼 낙관적 락 → 충돌 시 409 안내 |
| 행 삭제 시 FK 깨짐 | 외래키 + soft delete(`isActive`) |
| 7초 polling | DB 단일 소스, 즉시 반영 |
| 시트 동시 추가 충돌 | 그리드도 행 단위 트랜잭션 |

---

## 0. 사전 준비 — Node 버전 (중요)

Next.js 14 는 **Node 18.18+** 필요. (기본 Node 가 v16 이면 동작하지 않음)

이 PC 에는 nvm-windows 로 **22.13.1 / 24.14.1** 이 이미 설치돼 있습니다. 22 LTS 사용:
```powershell
nvm use 22.13.1
node -v   # v22.13.1 확인
```
> ⚠ `nvm use` 후에도 셸이 v16 을 잡으면, 해당 세션 PATH 앞에 nvm 심링크 폴더를 추가:
> `$env:Path = "C:\nvm4w\nodejs;" + $env:Path` (이미 `npm install`·`npm run build` 통과 확인됨)

> **"가상환경"에 대해**: Node 는 Python 의 venv 가 없습니다. 대신 패키지가 프로젝트의
> `node_modules` 안에만 설치되어 시스템과 자동 격리됩니다(= venv 역할). Node 버전 격리는
> 위 nvm 으로 합니다. 완전 격리가 필요하면 나중에 Docker(아래 4번)로 전환하세요.

---

## 1. 설치 & 데모 실행 (Supabase 사용)

### 1-1. Supabase 프로젝트 생성
1. https://supabase.com → New project (Region 은 가까운 곳; 무료 플랜 OK)
2. Settings → Database → Connection string → **URI** 두 개 복사
   - 앱 런타임용: **6543 포트(pooler, Transaction mode)** → `DATABASE_URL`
   - 마이그레이션용: **5432 포트(직결)** → `DIRECT_URL`

### 1-2. 환경변수
```powershell
copy .env.example .env
# .env 를 열어 DATABASE_URL / DIRECT_URL 채우기
```

### 1-3. 의존성 설치 & DB 스키마 생성 & 더미데이터
```powershell
npm install
npm run db:push     # Prisma schema → Supabase 에 테이블 생성
npm run db:seed     # 합성 더미데이터 5개 기업 삽입
```

### 1-4. 개발 서버
```powershell
npm run dev
# http://localhost:3000
```

화면: `/`(대시보드) · `/companies`(목록) · `/companies/new`(등록) · `/grid`(엑셀형 일괄입력)

---

## 2. 자동조회 — 4개 소스

등록 폼의 **"이름으로 자동 채움"** 버튼이 아래를 조합해 빈 칸을 채웁니다.

| 소스 | 채우는 항목 | 키 필요 | 비고 |
|---|---|---|---|
| **위키피디아** | 기업 소개(summary) | ❌ | Vercel 데모에서도 동작 |
| **공개 임금데이터** | 평균연봉·신입사원연봉 | ❌ | 지방공기업/공공기관 매칭. 번들 JSON |
| **네이버 지역검색** | 소재지·홈페이지 | ✅ `NAVER_CLIENT_ID`/`SECRET` | https://developers.naver.com |
| **DART** | 대표자·업종·설립일·매출규모 | ✅ `DART_API_KEY` | https://opendart.fss.or.kr, 상장/외감사 |

### 2-1. 임금 데이터 JSON 굽기 (이미 `src/data/salary.json` 포함됨)
공개 임금 CSV 가 갱신되면 다시 생성:
```powershell
npx tsx scripts/build-salary-json.ts "..\엑셀파일들"
```

### 2-2. DART corp_code 캐시 동기화 (DART 사용 시 1회)
DART 는 회사명이 아닌 corp_code 로 조회하므로, 매핑(~10만건)을 먼저 캐싱:
```powershell
npm run db:push                 # DartCorpCode 테이블 생성 포함
npx tsx scripts/sync-dart.ts    # .env 의 DART_API_KEY 필요, 한 달 1회 권장
```

### 2-3. 자동조회 한계 (v1 HANDOFF 8장에서 확인된 사실)
- **평균연봉/신입초임**은 공개 임금데이터에 있는 **공공기관·지방공기업만** 매칭됩니다. 상장사라도 DART 응답엔 급여가 없습니다.
- **부산 AI 스타트업 대부분은 어떤 무료 데이터셋에도 없어**, 자동조회로는 소재지·홈페이지·소개문 정도만 채워지고 직원수·연봉 등은 **수동 입력**이 필요합니다.
- 공개 임금데이터에는 신규채용이 적은 기관의 1인당 평균이 비정상적으로 튀는 이상치가 있어, `build-salary-json.ts` 에서 상식 범위(1,000~15,000만원) 밖 값은 자동 제외합니다.

---

## 3. Vercel 배포 (데모 공유)

1. 이 폴더를 GitHub 저장소로 push
2. https://vercel.com → New Project → import
3. **Environment Variables** 에 `DATABASE_URL`, `DIRECT_URL` (+ 자동조회 키) 등록
4. Build Command 는 기본값(`npm run build`; 내부에서 `prisma generate` 수행)
5. Deploy → 나온 URL 을 교수님께 공유

> ⚠ **데모(Vercel)에는 합성 더미데이터만 올리세요.** 실제 업체 CSV 는 개인정보를
> 포함하므로 해외 호스팅 DB 에 넣지 않습니다. (아래 5번 참고)

---

## 4. 교내 서버 Docker 전환 (나중)

Vercel 데모 후 교내 PC 로 옮길 때:
```powershell
docker compose up -d --build
# app: http://서버IP:3000, db: 로컬 postgres 컨테이너
docker compose exec app npx prisma db push   # 최초 1회 스키마 생성
```
Supabase 데이터를 가져오려면 `pg_dump` 로 받아 `db` 컨테이너에 복원하면 됩니다.
**바뀌는 건 `DATABASE_URL` 뿐** — 앱 코드는 그대로입니다.

HTTPS 가 필요하면 앞단에 Caddy/nginx 리버스 프록시를 두세요.

---

## 5. 실제 업체 CSV 임포트 (로컬 전용)

`엑셀파일들\00  26년도 업체 정보 v0.1.csv` (EUC-KR) 를 DB 로 적재:
```powershell
npx tsx scripts/import-csv.ts "..\엑셀파일들\00  26년도 업체 정보 v0.1.csv"
```
- v1 마이그레이션 로직 이식: 같은 기관명은 1개 기업으로 합치고, 담당자/대표자를 실무자로 분리.
- **개인정보(이름·연락처·이메일)가 포함되므로 로컬/교내 DB 에서만 실행하세요.**
- `전문가 pool (보안요망)` 파일은 본 시스템에 절대 넣지 않습니다.

---

## 6. 운영 전환 시 인증 켜기

지금은 `src/lib/auth.ts` 가 데모 스텁입니다. 운영 전환 시:
1. `npm i next-auth@beta`
2. Google OAuth 클라이언트 발급 (승인 도메인에 배포 URL 등록)
3. NextAuth 설정에서 signIn 콜백에 `isAllowedEmail(profile.email)` 검사 추가
4. `getCurrentUser()` 를 세션 조회로 교체 → **나머지 코드는 수정 불필요**

---

## 7. 폴더 구조

```
webapp/
  prisma/schema.prisma      4테이블 + Counter (version 락 / soft delete)
  prisma/seed.ts            합성 더미데이터
  scripts/import-csv.ts     [로컬] 실제 CSV 임포터 (EUC-KR)
  src/lib/                  db / auth(스텁) / enums / codes / lookup / validation / http / client
  src/app/api/              REST 라우트 (companies·collab·persons·histories·dashboard·lookup·grid)
  src/app/                  화면 (대시보드 / 목록 / 상세 / 등록·수정 / 그리드)
  src/components/           Sidebar / PageHeader / Toaster / CompanyForm
  Dockerfile, docker-compose.yml   교내 서버 전환용
```
