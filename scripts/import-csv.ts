/**
 * scripts/import-csv.ts
 * ---------------------------------------------------------
 * [로컬 전용] 기존 "26년도 업체 정보" CSV → DB 일괄 임포트.
 *  (v1 MigrationService.gs 의 migrateFrom2026Sheet 로직 이식)
 *
 * ⚠ 이 파일은 실제 사람의 이름·연락처·이메일(개인정보)을 적재한다.
 *    Vercel(해외 호스팅) 데모 DB 에는 실행하지 말 것.
 *    로컬 PostgreSQL 또는 교내 서버 DB 에서만 실행한다.
 *
 * 사용법:
 *    npx tsx scripts/import-csv.ts "..\엑셀파일들\00  26년도 업체 정보 v0.1.csv"
 *
 * CSV 는 EUC-KR 인코딩이므로 TextDecoder('euc-kr') 로 디코딩한다.
 * (Node 18+ 는 full-ICU 기본 포함이라 euc-kr 지원)
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── 아주 단순한 CSV 파서 (따옴표 안 줄바꿈/콤마 처리) ──
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch === '\r') { /* skip */ }
      else cur += ch;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function guessRegion(loc: string): string {
  const s = loc || '';
  if (s.includes('부산')) return '부산';
  if (s.includes('울산')) return '울산';
  if (['경남', '창원', '진주', '김해', '양산', '밀양'].some((k) => s.includes(k))) return '경남';
  if (['서울', '경기', '인천'].some((k) => s.includes(k))) return '수도권';
  return '기타';
}
function toBool(v: string): boolean {
  const s = (v || '').trim();
  return ['O', 'o', '○', 'Y', 'y', '1', 'true', 'TRUE', 'V', 'v'].includes(s);
}
function normName(s: string): string {
  return (s || '').replace(/[\s㈜()（）　]/g, '').replace(/주식회사/g, '').toLowerCase();
}
const pad = (p: string, n: number, w: number) => `${p}-${String(n).padStart(w, '0')}`;

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('사용법: npx tsx scripts/import-csv.ts <CSV경로>'); process.exit(1); }

  const buf = readFileSync(file);
  const text = new TextDecoder('euc-kr').decode(buf);
  const data = parseCsv(text);

  // 헤더 행 탐색 (연번 + 기관명)
  let h = -1;
  for (let r = 0; r < Math.min(data.length, 12); r++) {
    if (data[r].includes('연번') && data[r].includes('기관명')) { h = r; break; }
  }
  if (h < 0) { console.error('헤더 행(연번/기관명)을 찾지 못했습니다.'); process.exit(1); }
  const headers = data[h];
  const idx = (name: string) => headers.indexOf(name);
  const get = (row: string[], name: string) => { const i = idx(name); return i >= 0 ? (row[i] || '').trim() : ''; };

  const body = data.slice(h + 1).filter((r) => get(r, '기관명'));

  // 기관명 그룹화
  const groups: Record<string, { name: string; rows: string[][] }> = {};
  for (const r of body) {
    const name = get(r, '기관명');
    const key = normName(name);
    if (!groups[key]) groups[key] = { name, rows: [] };
    groups[key].rows.push(r);
  }

  let companyCreated = 0, personCreated = 0, skipped = 0;
  let cN = (await prisma.counter.findUnique({ where: { key: 'company' } }))?.value ?? 0;
  let pN = (await prisma.counter.findUnique({ where: { key: 'person' } }))?.value ?? 0;

  for (const key of Object.keys(groups)) {
    const g = groups[key];
    const first = g.rows[0];

    const exists = await prisma.company.findUnique({ where: { name: g.name } });
    if (exists) { skipped++; continue; }

    const loc = get(first, '소재지');
    cN += 1;
    const company = await prisma.company.create({
      data: {
        code: pad('C', cN, 3),
        name: g.name,
        joinYear: Number(get(first, '사업참여연도')) || null,
        region: guessRegion(loc),
        addressDetail: loc || null,
        orgType: ['공공기관', '연구소', '대학'].includes(get(first, '유형')) ? get(first, '유형') : '기업',
        priority: 'C',
        status: '연락완료',
        note: '[CSV 임포트]',
        collaboration: {
          create: {
            internship: g.rows.some((r) => toBool(get(r, '인턴십'))),
            overseasEducation: g.rows.some((r) => toBool(get(r, '해외교육'))),
            industryProject: g.rows.some((r) => toBool(get(r, '산학협력프로젝트'))),
            curriculumCommittee: g.rows.some((r) => toBool(get(r, '교과과정혁신위원회'))),
            guestLecture: g.rows.some((r) => toBool(get(r, '특강'))),
            valueSpread: g.rows.some((r) => toBool(get(r, '가치확산'))),
            memo: g.rows.map((r) => get(r, '기타')).filter(Boolean).join(' / ') || null,
          },
        },
      },
    });
    companyCreated++;

    // 실무자: 담당자 + 대표자
    for (const r of g.rows) {
      const pName = get(r, '담당자명');
      if (pName) {
        pN += 1;
        await prisma.contactPerson.create({
          data: {
            code: pad('P', pN, 4), companyId: company.id, name: pName,
            position: get(r, '직위') || get(r, '직책') || null,
            email: get(r, '연락처E') || null,
            phone: get(r, '연락처M') || get(r, '연락처P') || null,
            note: '임포트(담당자)',
          },
        });
        personCreated++;
      }
      const ceo = get(r, '대표자명');
      if (ceo) {
        pN += 1;
        await prisma.contactPerson.create({
          data: {
            code: pad('P', pN, 4), companyId: company.id, name: ceo, position: '대표',
            email: get(r, '대표자연락처E') || null,
            phone: get(r, '대표자연락처M') || null,
            note: '임포트(대표자)',
          },
        });
        personCreated++;
      }
    }
  }

  await prisma.counter.upsert({ where: { key: 'company' }, update: { value: cN }, create: { key: 'company', value: cN } });
  await prisma.counter.upsert({ where: { key: 'person' }, update: { value: pN }, create: { key: 'person', value: pN } });

  console.log(`✅ 임포트 완료 — 기업 ${companyCreated}개 생성, 실무자 ${personCreated}명, 중복 ${skipped}개 건너뜀`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
