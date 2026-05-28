/**
 * scripts/clear-data.ts
 * ---------------------------------------------------------
 * 운영용 데이터(기업/협업/실무자/컨택이력 + 코드 카운터)를 전부 삭제.
 *  ※ DartCorpCode(조회 캐시)는 보존.
 *
 *  안전장치: 실행 시 반드시 `--confirm` 플래그 필요.
 *
 *  사용:
 *    npx tsx scripts/clear-data.ts --confirm
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error('⚠ 안전을 위해 --confirm 플래그가 필요합니다.');
    console.error('   사용: npx tsx scripts/clear-data.ts --confirm');
    process.exit(1);
  }

  const before = {
    company: await prisma.company.count(),
    contactPerson: await prisma.contactPerson.count(),
    contactHistory: await prisma.contactHistory.count(),
    collaboration: await prisma.collaboration.count(),
  };
  console.log('▶ 삭제 전 카운트:');
  for (const [k, v] of Object.entries(before)) console.log(`   ${k}: ${v}`);

  if (before.company + before.contactPerson + before.contactHistory + before.collaboration === 0) {
    console.log('이미 비어있습니다. (DartCorpCode 캐시는 그대로 보존)');
    return;
  }

  // FK 순서대로 (Cascade 설정돼 있지만 명시적으로)
  console.log('\n▶ 삭제 진행...');
  await prisma.contactHistory.deleteMany({});
  await prisma.contactPerson.deleteMany({});
  await prisma.collaboration.deleteMany({});
  await prisma.company.deleteMany({});

  // 코드(C-001/P-0001/H-0001) 카운터 리셋
  for (const key of ['company', 'person', 'history']) {
    await prisma.counter.upsert({ where: { key }, update: { value: 0 }, create: { key, value: 0 } });
  }

  const after = {
    company: await prisma.company.count(),
    contactPerson: await prisma.contactPerson.count(),
    contactHistory: await prisma.contactHistory.count(),
    collaboration: await prisma.collaboration.count(),
    dartCorpCode_preserved: await prisma.dartCorpCode.count(),
  };
  console.log('\n✅ 삭제 후 카운트:');
  for (const [k, v] of Object.entries(after)) console.log(`   ${k}: ${v}`);
  console.log('\n코드 카운터(C-/P-/H-) 도 0으로 리셋되어, 다음 등록은 C-001 부터 시작됩니다.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
