/**
 * prisma/seed-divisions.ts
 * ---------------------------------------------------------
 * 분과(Division) 참조 데이터 시드. 엑셀 ‘분과구분(참고)’ 시트 기준.
 *  실행: npm run db:seed-divisions
 * 멱등(idempotent): (version, code) 기준 upsert.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DIVISIONS = [
  // 구 5개 (정컴 졸업과제 분과)
  { version: 'old5', code: 'A', name: '인공지능' },
  { version: 'old5', code: 'B', name: '데이터/SW플랫폼' },
  { version: 'old5', code: 'C', name: '네트워크/시스템' },
  { version: 'old5', code: 'D', name: '지능형융합보안' },
  { version: 'old5', code: 'E', name: '데이터사이언스' },
  // 신 6개 트랙
  { version: 'new6', code: 'A', name: '클라우드' },
  { version: 'new6', code: 'B', name: '메타버스' },
  { version: 'new6', code: 'C', name: '융합보안' },
  { version: 'new6', code: 'D', name: '헬스케어 AI' },
  { version: 'new6', code: 'E', name: 'AIoT' },
  { version: 'new6', code: 'F', name: '데이터과학' },
];

async function main() {
  for (const d of DIVISIONS) {
    await prisma.division.upsert({
      where: { version_code: { version: d.version, code: d.code } },
      update: { name: d.name },
      create: d,
    });
  }
  const count = await prisma.division.count();
  console.log(`✅ 분과 시드 완료: ${count}건`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
