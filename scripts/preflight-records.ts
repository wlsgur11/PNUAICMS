/**
 * scripts/preflight-records.ts
 * ---------------------------------------------------------
 * 실적 엑셀을 올리기 전 점검. 실제 업로드에 쓰는 파서를 그대로 써서
 * 무엇이 들어오고 무엇이 지워지는지 보여 준다. DB 는 읽기만 한다.
 *
 *   npx tsx scripts/preflight-records.ts <파일.xlsx>
 *
 * 실적 업로드는 project, internship 을 조건 없이 전부 지우고 엑셀 내용으로
 * 다시 만든다. 엑셀에 2026년치만 들어 있으면 2023~2025 실적이 사라진다.
 * 화면에는 '전체 교체' 라고 한 줄 적혀 있을 뿐 미리보기도 확인 창도 없어서,
 * 한 번 누르면 백업 복구 말고는 되돌릴 방법이 없다.
 *
 * 학생 이름 같은 개인정보는 찍지 않는다. 연도별 건수만 센다.
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { readSheets } from '../src/lib/records-xlsx';
import { parseSheets } from '../src/lib/records-parse';

const prisma = new PrismaClient();

/** 연도별 건수. 연도가 빈 행은 '미기재' 로 모은다 */
function byYear(rows: { year: number | null }[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = r.year == null ? '미기재' : String(r.year);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function table(title: string, before: [string, number][], after: [string, number][]) {
  const years = [...new Set([...before, ...after].map(([y]) => y))].sort();
  console.log(`\n${title}`);
  console.log('  연도      지금    올린 뒤   변화');
  const b = new Map(before), a = new Map(after);
  for (const y of years) {
    const x = b.get(y) ?? 0, z = a.get(y) ?? 0, d = z - x;
    const mark = d === 0 ? '' : d > 0 ? `+${d}` : `${d}`;
    // 있던 연도가 통째로 사라지는 것이 이 점검의 핵심이다
    const warn = x > 0 && z === 0 ? '   ← 이 연도가 전부 사라집니다' : '';
    console.log(`  ${y.padEnd(8)} ${String(x).padStart(5)} ${String(z).padStart(8)}   ${mark.padEnd(6)}${warn}`);
  }
  const bt = before.reduce((s, [, n]) => s + n, 0);
  const at = after.reduce((s, [, n]) => s + n, 0);
  console.log(`  ${'합계'.padEnd(7)} ${String(bt).padStart(5)} ${String(at).padStart(8)}   ${at - bt >= 0 ? `+${at - bt}` : at - bt}`);
  return { before: bt, after: at, lostYears: years.filter((y) => (b.get(y) ?? 0) > 0 && (a.get(y) ?? 0) === 0) };
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('사용: npx tsx scripts/preflight-records.ts <파일.xlsx>');
    process.exit(1);
  }

  const buf = readFileSync(path);
  const sheets = readSheets(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  console.log(`파일: ${path}`);
  console.log(`시트: ${sheets.map((s) => `${s.name}(${s.rows.length}행)`).join(', ')}`);

  const parsed = parseSheets(sheets);

  // DB 에 못 붙어도 엑셀 쪽 집계는 볼 수 있어야 한다. 관리자 PC 의 .env 가
  // 옛 주소를 가리키고 있어도 '이 엑셀에 어느 연도가 들어 있는가' 는 답이 나온다
  let curProjects: { year: number | null }[] = [];
  let curInternships: { year: number | null }[] = [];
  let dbOk = true;
  try {
    [curProjects, curInternships] = await Promise.all([
      prisma.project.findMany({ select: { year: true } }),
      prisma.internship.findMany({ select: { year: true } }),
    ]);
  } catch (e) {
    dbOk = false;
    console.log('\n△ DB 에 붙지 못해 현재 값과 비교하지 못합니다.');
    console.log('  DATABASE_URL 을 지정해 다시 돌리면 비교까지 나옵니다.');
  }

  const p = table('■ 산학협력 과제', byYear(curProjects), byYear(parsed.projects));
  const i = table('■ 인턴십', byYear(curInternships), byYear(parsed.internships));

  console.log(`\n■ 연도별 현황판(전체현황 시트): ${parsed.yearStats.map((y) => y.year).sort().join(', ') || '없음'}`);
  console.log('  이 값은 연도별로 덮어쓰기라 엑셀에 없는 연도는 그대로 남습니다.');

  if (!dbOk) {
    console.log('\n△ 현재 값과 비교하지 못했습니다. 위 "올린 뒤" 열만 참고하세요.');
    console.log(`  엑셀에 든 연도 - 과제: ${[...new Set(parsed.projects.map((x) => x.year))].sort().join(', ')}`);
    console.log(`               인턴십: ${[...new Set(parsed.internships.map((x) => x.year))].sort().join(', ')}`);
    return;
  }
  const lost = [...new Set([...p.lostYears, ...i.lostYears])].sort();
  console.log('\n────────────────────────────────────────');
  if (lost.length) {
    console.log(`✗ 올리면 안 됩니다. 지금 있는 ${lost.join(', ')}년 실적이 사라집니다.`);
    console.log('  엑셀이 전체 기간이 아니라 일부 연도만 담고 있다는 뜻입니다.');
    process.exit(1);
  }
  if (p.after < p.before || i.after < i.before) {
    console.log('△ 건수가 줄어듭니다. 의도한 것인지 확인하세요.');
  } else {
    console.log('✓ 사라지는 연도가 없습니다.');
  }
  console.log('  올리기 전 백업: cd ~/cms && ./backup-db.sh');
}

main().finally(() => prisma.$disconnect());
