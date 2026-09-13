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
  // 대소문자 무시, IPv6 리터럴은 URL 파서가 대괄호를 붙여 돌려준다
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase())) {
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
      data: { status: stages[i % stages.length], joinYear: 2023 + (i % 4) },
    });
  }

  // 데모 스크립트는 실적(project, projectStudent, internship)을 통째로 교체하므로
  // 재실행해도 멱등성을 보장한다. 기업/학생/컨택 데이터는 건드리지 않는다.
  await prisma.projectStudent.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.internship.deleteMany({});

  // 연구실. 대시보드 연구실별 카드가 과제 수 상위를 뽑는다.
  // 운영 DB 는 Lab 의 식별키가 (교수명|연구실명) 이라 엑셀 연구실명 칸이 밀리면
  // 같은 교수가 여러 행으로 쪼개지고, 교수명 칸까지 밀린 행도 있다.
  // 그 형태를 그대로 재현해 대시보드가 합치고 걸러내는지 확인한다.
  const demoLabs = [
    ['데모 김교수', '지능시스템연구실', '정컴'],
    ['데모 김교수', '1772b', '정컴'],          // 연구실명 칸이 밀림. 김교수가 두 행으로 쪼개진다
    ['데모 이교수', '데이터마이닝연구실', 'DS'],
    ['데모 이교수', '빅데이터연구실', 'DS'],    // 연구실명이 둘. 대표를 못 정해 비워야 한다
    ['데모 박교수', '컴퓨터비전연구실', '정컴'],
    ['데모 박교수 (정보컴퓨터공학부)', '컴퓨터비전연구실', '정컴'], // 소속이 덧붙음. 박교수로 합쳐야 한다
    ['데모 최교수', null, '정컴'],
    ['371', '2151', '정컴'],                   // 교수명 칸까지 밀림. 목록에서 빠져야 한다
  ] as const;
  await prisma.lab.deleteMany({ where: { professorName: { in: demoLabs.map((l) => l[0]) } } });
  const labIds: string[] = [];
  for (const [prof, name, aff] of demoLabs) {
    const lab = await prisma.lab.create({ data: { professorName: prof, labName: name, affiliation: aff } });
    labIds.push(lab.id);
  }

  const depts = ['정컴', '정컴', '정컴', 'DS', null];
  const types = ['졸업과제', 'R&D', '용역', '캡스톤', 'R&D'];
  const divisions = ['A', 'B', 'C', 'A', 'B'];
  type DemoProject = {
    year: number; dept: string | null; type: string; divisionCode: string; divisionVersion: string;
    companyId: string; title: string; labId: string | null;
    cntPhd: number | null; cntMaster: number | null; cntUndergrad: number | null;
  };
  const projects: DemoProject[] = [];
  // 연도별 과제 수. 늘어나는 추세로 두어 추이 차트의 곡선이 실제로 휘게 한다.
  // 2026 은 아직 끝나지 않은 해라 추이 차트에서 점선 구간으로 그려진다
  for (const [year, n] of [[2023, 3], [2024, 6], [2025, 10], [2026, 14]] as const) {
    for (let i = 0; i < n; i++) {
      projects.push({
        year,
        dept: depts[i % depts.length],
        type: types[i % types.length],
        divisionCode: divisions[i % divisions.length],
        divisionVersion: 'new6',
        companyId: companies[i % companies.length].id,
        title: `${year} 데모 과제 ${i + 1}`,
        // 일부는 연구실을 비워 둔다. 대시보드가 '미연결 과제' 를 따로 센다
        labId: i % 9 === 8 ? null : labIds[i % labIds.length],
        // 운영 데이터도 박사·석사는 절반가량이 비어 있다. 그 상태를 그대로 재현해
        // 기재 건수 표기가 동작하는지 본다
        cntPhd: i % 2 === 0 ? 1 + (i % 3) : null,
        cntMaster: i % 3 === 0 ? null : 1 + (i % 4),
        cntUndergrad: i % 11 === 10 ? null : 2 + (i % 5),
      });
    }
  }
  await prisma.project.createMany({ data: projects });

  // 교육인원과 연계취업자도 채운다. 대시보드 인턴십 실적 카드가 이 값을 합산한다
  const internships: {
    year: number; programName: string; companyId: string;
    domestic: string; hostType: string; method: string;
    cntCSE: number; cntDS: number; cntNonSW: number; empSW: number; empNonSW: number;
  }[] = [];
  // 2026 이 전년보다 적은 것은 연중이기 때문이다. 이 모양이 있어야
  // 진행중 연도를 점선으로 끊는 표기가 실제로 필요한지 눈으로 확인된다
  for (const [year, n] of [[2023, 2], [2024, 4], [2025, 9], [2026, 6]] as const) {
    for (let i = 0; i < n; i++) {
      internships.push({
        year, programName: `${year} 데모 인턴십 ${i + 1}`, companyId: companies[i % companies.length].id,
        // 해외는 소수. SW중심대학 '해외 인턴십' 미달 지표와 같은 방향으로 둔다
        domestic: i % 5 === 0 ? '해외' : '국내',
        hostType: i % 3 === 0 ? '학점연계' : '자체',
        method: ['집중형', '학기중', '방학중'][i % 3],
        cntCSE: 3 + (i % 4), cntDS: 1 + (i % 3), cntNonSW: i % 2,
        empSW: i % 3 === 0 ? 1 : 0, empNonSW: i % 5 === 0 ? 1 : 0,
      });
    }
  }
  await prisma.internship.createMany({ data: internships });

  // 학생. 학년, 졸업, 상담 건수를 흩뿌려 대시보드 학생 카드가 의미 있는 값을 보이게 한다
  await prisma.counseling.deleteMany({});
  await prisma.studentInternship.deleteMany({});
  await prisma.student.deleteMany({ where: { studentNo: { startsWith: '9999' } } });
  const names = ['김민수', '이서연', '박지훈', '최유진', '정하늘', '강도윤', '윤서아', '임준호', '한가을', '오세훈', '신예린', '배준서'];
  for (let i = 0; i < names.length; i++) {
    const grade = (i % 4) + 1;
    const graduated = grade === 4 && i % 3 === 0;
    await prisma.student.create({
      data: {
        studentNo: `9999${String(i).padStart(4, '0')}`,
        name: names[i],
        nameMasked: names[i][0] + '*'.repeat(names[i].length - 2) + names[i].slice(-1),
        department: i % 3 === 0 ? 'DS' : '정컴',
        grade,
        graduationDate: graduated ? '2026-02-20' : null,
        careerGoal: i % 2 === 0 ? '취업(대기업)' : '대학원진학',
        // 3~4학년 일부는 상담을 비워 '관리 필요' 로 잡히게 한다
        counselings: i % 3 === 0 ? { create: [] } : { create: [{ counselDate: '2026-03-02', counselor: '지도교수', content: '진로 상담' }] },
        manualInternships: i % 4 === 0 ? { create: [{ internshipType: '기업체험형', companyName: null, durationWeeks: 4, activityDate: '2026-07-01' }] } : undefined,
      },
    });
  }
  // 산학 참여 학생 연결
  const someProjects = await prisma.project.findMany({ where: { year: 2026 }, select: { id: true }, take: 5 });
  const someStudents = await prisma.student.findMany({ where: { studentNo: { startsWith: '9999' } }, select: { studentNo: true }, take: 5 });
  for (let i = 0; i < Math.min(someProjects.length, someStudents.length); i++) {
    await prisma.projectStudent.create({ data: { projectId: someProjects[i].id, studentNo: someStudents[i].studentNo } });
  }

  for (const [year, ind, indT, itn, itnT, cse, ds] of [
    [2023, 0.095, 0.15, 0.062, 0.125, 500, 195],
    [2024, 0.121, 0.15, 0.081, 0.125, 520, 210],
    [2025, 0.152, 0.15, 0.104, 0.125, 540, 230],
    [2026, 0.184, 0.15, 0.092, 0.125, 560, 250],
  ] as const) {
    const values = {
      industryAchievedRatio: ind, industryTargetRatio: indT, industryStudents: Math.round(cse * ind),
      internshipAchievedRatio: itn, internshipTargetRatio: itnT, internshipStudents: Math.round(cse * itn),
      enrolledCSE: cse, enrolledDS: ds,
      // 목표 기준치 인원. 대시보드 목표 대비 카드가 참여율의 분모로 같이 보여준다
      industryTargetCSE: Math.round(cse * indT), industryTargetDS: Math.round(ds * indT),
      internTargetCSE: Math.round(cse * itnT), internTargetDS: Math.round(ds * itnT),
    };
    // update 를 비워 두면 재실행해도 예전 값이 남아 시드를 늘려도 화면에 안 나온다
    await prisma.yearStat.upsert({ where: { year }, update: values, create: { year, ...values } });
  }

  await prisma.swcuYear.upsert({ where: { year: 2026 }, update: {}, create: { year: 2026, university: '부산대학교' } });
  await prisma.swcuIndicator.deleteMany({ where: { year: 2026 } });
  // 영역을 흩뿌린다. 미달이 서로 다른 영역에 들어가야 영역별 카드의 정렬을 볼 수 있다.
  // 목표가 빈 행 하나로 '판정 불가(사선)' 칸을 만든다.
  //
  // 단위가 '%' 인 지표는 운영 DB 에 비율로 들어 있다 (78% 는 0.78). 나눗셈 결과가
  // 그대로 들어와 0.018181818181818... 같은 값이 되는 행이 있어 그 모양도 같이 둔다.
  // 영역 칸이 밀려 숫자만 들어간 행도 운영에 섞여 있다 (688, 535 같은 값)
  const indicators = [
    ['SW교육', '캡스톤 참여율', 0.8, 0.62, '%'], ['산학협력', '해외 인턴십', 10, 3, '명'],
    ['창업', '창업 강좌 수', 4, 2, '개'], ['산학협력', '산학 과제 수', 10, 14, '건'],
    ['산학협력', 'MOU 체결', 30, 42, '건'], ['SW교육', '취업률', 0.7, 0.78, '%'],
    ['SW교육', '전공 강좌 수', 40, 44, '개'], ['가치확산', '비교과 참여', 200, 260, '명'],
    ['연구', '논문 실적', 12, 15, '건'], ['연구', '특허 출원', 5, 7, '건'],
    ['SW교육', '교육 만족도', 4, 4.3, '점'], ['가치확산', '현장실습 인원', null, 61, '명'],
    ['688', '창업률', 0.05, 1 / 55, '%'], ['535', '인턴십 연계취업률', 0.05, 1 / 22, '%'],
  ] as const;
  await prisma.swcuIndicator.createMany({
    data: indicators.map(([area, name, target, actual, unit], i) => ({
      year: 2026, name, target, actual, unit, area, sortOrder: i,
    })),
  });

  console.log('데모 데이터 적재 완료');
  await prisma.$disconnect();
}
main();
