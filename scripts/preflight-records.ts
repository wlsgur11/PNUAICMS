/**
 * scripts/preflight-records.ts
 * ---------------------------------------------------------
 * 실적 엑셀을 올리기 전 점검. 업로드 화면의 미리보기와 같은 계산을 명령줄에서
 * 본다. DB 는 읽기만 한다.
 *
 *   npx tsx scripts/preflight-records.ts <파일.xlsx>
 *
 * 실적 적재는 project, internship 을 조건 없이 전부 지우고 엑셀 내용으로 다시
 * 만든다. 엑셀에 일부 연도만 들어 있으면 나머지 연도가 사라진다.
 *
 * 화면에도 미리보기가 붙었지만 이 스크립트를 남겨 둔다. 파일을 받자마자
 * 로그인 없이 확인할 수 있고, 운영 DB 를 가리켜 돌리면 서버에 올리기 전에
 * 결과를 알 수 있다.
 *
 * 학생 이름은 찍지 않는다. 건별 대조에는 기업명과 과제 제목만 쓴다.
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { readSheets } from '../src/lib/records-xlsx';
import { parseSheets } from '../src/lib/records-parse';
import {
  buildRecordsPreview,
  type YearDelta, type SideDiff, type CurrentProject, type CurrentInternship,
} from '../src/lib/records-preview';

const prisma = new PrismaClient();

function table(title: string, rows: YearDelta[], before: number, after: number) {
  console.log(`\n${title}`);
  console.log('  연도      지금    올린 뒤   변화');
  for (const r of rows) {
    const d = r.after - r.before;
    const mark = d === 0 ? '' : d > 0 ? `+${d}` : `${d}`;
    // 있던 연도가 통째로 사라지는 것이 이 점검의 핵심이다
    const warn = r.before > 0 && r.after === 0 ? '   ← 이 연도가 전부 사라집니다' : '';
    console.log(`  ${r.year.padEnd(8)} ${String(r.before).padStart(5)} ${String(r.after).padStart(8)}   ${mark.padEnd(6)}${warn}`);
  }
  const d = after - before;
  console.log(`  ${'합계'.padEnd(7)} ${String(before).padStart(5)} ${String(after).padStart(8)}   ${d >= 0 ? `+${d}` : d}`);
}

/**
 * 건별 대조 결과. 연도별로 묶어 찍는다. 건수가 같아도 안에서 맞바뀐 경우를
 * 잡는 것이 이쪽 몫이다. 58건에서 58건이 되어도 10건이 빠지고 다른 10건이
 * 들어왔을 수 있다.
 */
function sides(title: string, d: SideDiff) {
  console.log(`
  [${title} 건별 대조] 유지 ${d.kept} · 사라짐 ${d.removedTotal} · 새로 들어옴 ${d.addedTotal}`);
  for (const y of d.years) {
    if (y.removedTotal === 0 && y.addedTotal === 0) continue;
    const head = [y.addedTotal ? `+${y.addedTotal}` : '', y.removedTotal ? `-${y.removedTotal}` : ''].filter(Boolean).join(' ');
    console.log(`
  ── ${y.year === '미기재' ? '연도 미기재' : `${y.year}년`}  ${head}`);
    for (const label of y.removed) console.log(`     - ${label}`);
    if (y.removedTotal > y.removed.length) console.log(`     ⋯ 사라지는 건 ${y.removedTotal - y.removed.length}건 더`);
    if (y.kept) console.log(`     ⋯ 그대로 유지 ${y.kept}건`);
    for (const label of y.added) console.log(`     + ${label}`);
    if (y.addedTotal > y.added.length) console.log(`     ⋯ 새로 들어오는 건 ${y.addedTotal - y.added.length}건 더`);
  }
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
  let curProjects: CurrentProject[] = [];
  let curInternships: CurrentInternship[] = [];
  let dbOk = true;
  try {
    [curProjects, curInternships] = await Promise.all([
      prisma.project.findMany({
        select: { year: true, title: true, companyNameRaw: true, company: { select: { name: true } } },
      }),
      prisma.internship.findMany({
        select: { year: true, programName: true, companyNameRaw: true, company: { select: { name: true } } },
      }),
    ]);
  } catch {
    dbOk = false;
    console.log('\n△ DB 에 붙지 못해 현재 값과 비교하지 못합니다.');
    console.log('  DATABASE_URL 을 지정해 다시 돌리면 비교까지 나옵니다.');
  }

  // 업로드 화면과 같은 함수를 쓴다. 여기 숫자와 화면 숫자가 다르면 안 된다
  const p = buildRecordsPreview(parsed, curProjects, curInternships);

  table('■ 산학협력 과제', p.projects, p.totals.projectsBefore, p.totals.projectsAfter);
  if (dbOk) sides('산학협력 과제', p.projectDiff);
  table('■ 인턴십', p.internships, p.totals.internshipsBefore, p.totals.internshipsAfter);
  if (dbOk) sides('인턴십', p.internshipDiff);

  console.log(`\n■ 연도별 현황판(전체현황 시트): ${p.yearStats.join(', ') || '없음'}`);
  console.log('  이 값은 연도별로 덮어쓰기라 엑셀에 없는 연도는 그대로 남습니다.');

  console.log('\n────────────────────────────────────────');
  if (!dbOk) {
    console.log('△ 현재 값과 비교하지 못했습니다. "올린 뒤" 열만 참고하세요.');
    return;
  }
  if (p.lostYears.length) {
    console.log(`✗ 올리면 안 됩니다. 지금 있는 ${p.lostYears.join(', ')}년 실적이 사라집니다.`);
    console.log('  엑셀이 전체 기간이 아니라 일부 연도만 담고 있다는 뜻입니다.');
    process.exit(1);
  }
  if (p.totals.projectsAfter < p.totals.projectsBefore || p.totals.internshipsAfter < p.totals.internshipsBefore) {
    console.log('△ 건수가 줄어듭니다. 의도한 것인지 확인하세요.');
  } else if (p.projectDiff.removedTotal || p.internshipDiff.removedTotal) {
    console.log(`△ 사라지는 건이 있습니다. 과제 ${p.projectDiff.removedTotal}건, 인턴십 ${p.internshipDiff.removedTotal}건.`);
    console.log('  제목이나 기업명이 조금만 달라져도 사라진 건 하나와 새 건 하나로 잡힙니다.');
    console.log('  목록을 보고 실제로 빠진 건인지 이름만 바뀐 건인지 확인하세요.');
  } else {
    console.log('✓ 사라지는 건이 없습니다.');
  }
  console.log('  올리기 전 백업: cd ~/cms && ./backup-db.sh');
}

main().finally(() => prisma.$disconnect());
