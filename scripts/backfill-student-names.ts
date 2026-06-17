/**
 * scripts/backfill-student-names.ts
 * ---------------------------------------------------------
 * 실적 엑셀에서 학번→실명을 읽어 기존 Student.name 을 채운다.
 * 비파괴: 기존 학생 행만 update(실명+마스킹 갱신). 생성/삭제/프로젝트 변경 없음.
 *
 *   사용: npx tsx scripts/backfill-student-names.ts "<xlsx 경로>"
 */
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { readSheets } from '../src/lib/records-xlsx';
import { parseSheets } from '../src/lib/records-parse';

const prisma = new PrismaClient();

function mask(name: string): string {
  const n = (name || '').trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + '*';
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('엑셀 경로를 인자로 주세요.');

  const buf = readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const parsed = parseSheets(readSheets(ab));

  const nameByNo = new Map<string, string>();
  for (const p of parsed.projects) {
    for (const s of p.students) {
      const no = s.studentNo?.trim();
      const nm = s.name?.trim();
      if (no && nm && !nameByNo.has(no)) nameByNo.set(no, nm);
    }
  }

  let updated = 0;
  let notInDb = 0;
  for (const [studentNo, name] of nameByNo) {
    const r = await prisma.student.updateMany({ where: { studentNo }, data: { name, nameMasked: mask(name) } });
    if (r.count > 0) updated += r.count;
    else notInDb++;
  }
  console.log(`엑셀 내 학번+실명: ${nameByNo.size} / DB 업데이트: ${updated} / DB에 없는 학번: ${notInDb}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
