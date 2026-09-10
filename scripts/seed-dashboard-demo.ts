/**
 * scripts/seed-dashboard-demo.ts
 * ---------------------------------------------------------
 * 대시보드 개편 검증용 로컬 데이터. 운영 DB 에서 실행하지 말 것.
 * 실행: npx tsx scripts/seed-dashboard-demo.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  const masked = url.replace(/:[^:@]*@/, ':***@');
  // 호스트명을 직접 파싱한다. 문자열 포함 검사는 localhost-prod.example.com 같은
  // 운영 주소를 통과시켜, 아래 deleteMany 가 운영 데이터를 지울 수 있다.
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error('DATABASE_URL 을 해석할 수 없습니다: ' + masked);
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error('로컬 DB 가 아닙니다. 중단합니다: ' + masked);
  }

  if (!process.argv.includes('--confirm')) {
    console.error('⚠ 안전을 위해 --confirm 플래그가 필요합니다.');
    console.error('   사용: npx tsx scripts/seed-dashboard-demo.ts --confirm');
    process.exit(1);
  }

  const companies = await prisma.company.findMany({ select: { id: true }, orderBy: { code: 'asc' } });
  if (companies.length === 0) throw new Error('먼저 npm run db:seed 를 실행하세요.');

  // 기업 상태를 파이프라인 단계에 흩뿌린다
  const stages = ['미접촉', '연락완료', '미팅예정', '협의중', '협약완료'];
  for (let i = 0; i < companies.length; i++) {
    await prisma.company.update({
      where: { id: companies[i].id },
      data: { status: stages[i % stages.length], joinYear: 2024 + (i % 3) },
    });
  }

  // 데모 스크립트는 실적(project, projectStudent, internship)을 통째로 교체하므로
  // 재실행해도 멱등성을 보장한다. 기업/학생/컨택 데이터는 건드리지 않는다.
  await prisma.projectStudent.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.internship.deleteMany({});

  const depts = ['정컴', '정컴', '정컴', 'DS', null];
  const types = ['졸업과제', 'R&D', '용역', '캡스톤', 'R&D'];
  const divisions = ['A', 'B', 'C', 'A', 'B'];
  const projects: { year: number; dept: string | null; type: string; divisionCode: string; divisionVersion: string; companyId: string; title: string }[] = [];
  for (const year of [2024, 2025, 2026]) {
    const n = year === 2024 ? 6 : year === 2025 ? 10 : 14;
    for (let i = 0; i < n; i++) {
      projects.push({
        year,
        dept: depts[i % depts.length],
        type: types[i % types.length],
        divisionCode: divisions[i % divisions.length],
        divisionVersion: 'new6',
        companyId: companies[i % companies.length].id,
        title: `${year} 데모 과제 ${i + 1}`,
      });
    }
  }
  await prisma.project.createMany({ data: projects });

  const internships: { year: number; programName: string; companyId: string }[] = [];
  for (const year of [2024, 2025, 2026]) {
    const n = year === 2024 ? 4 : year === 2025 ? 9 : 6; // 2026 은 전년 대비 감소
    for (let i = 0; i < n; i++) {
      internships.push({ year, programName: `${year} 데모 인턴십 ${i + 1}`, companyId: companies[i % companies.length].id });
    }
  }
  await prisma.internship.createMany({ data: internships });

  for (const [year, ind, indT, itn, itnT, cse, ds] of [
    [2024, 0.121, 0.15, 0.081, 0.125, 520, 210],
    [2025, 0.152, 0.15, 0.104, 0.125, 540, 230],
    [2026, 0.184, 0.15, 0.092, 0.125, 560, 250],
  ] as const) {
    await prisma.yearStat.upsert({
      where: { year },
      update: {},
      create: {
        year,
        industryAchievedRatio: ind, industryTargetRatio: indT, industryStudents: Math.round(cse * ind),
        internshipAchievedRatio: itn, internshipTargetRatio: itnT, internshipStudents: Math.round(cse * itn),
        enrolledCSE: cse, enrolledDS: ds,
      },
    });
  }

  await prisma.swcuYear.upsert({ where: { year: 2026 }, update: {}, create: { year: 2026, university: '부산대학교' } });
  await prisma.swcuIndicator.deleteMany({ where: { year: 2026 } });
  const indicators = [
    ['캡스톤 참여율', 80, 62, '%'], ['해외 인턴십', 10, 3, '명'], ['창업 강좌 수', 4, 2, '개'],
    ['산학 과제 수', 10, 14, '건'], ['MOU 체결', 30, 42, '건'], ['취업률', 70, 78, '%'],
    ['전공 강좌 수', 40, 44, '개'], ['비교과 참여', 200, 260, '명'], ['논문 실적', 12, 15, '건'],
    ['특허 출원', 5, 7, '건'], ['교육 만족도', 4, 4.3, '점'], ['현장실습 인원', 50, 61, '명'],
  ];
  await prisma.swcuIndicator.createMany({
    data: indicators.map(([name, target, actual, unit], i) => ({
      year: 2026, name: name as string, target: target as number, actual: actual as number,
      unit: unit as string, area: '공통', sortOrder: i,
    })),
  });

  console.log('데모 데이터 적재 완료');
  await prisma.$disconnect();
}
main();
