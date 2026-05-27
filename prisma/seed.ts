/**
 * prisma/seed.ts
 * ---------------------------------------------------------
 * 테스트용 더미 데이터 삽입. (v1 seedDummyData 의 v2 버전)
 *  실행: npm run db:seed
 *
 * 멱등(idempotent) 처리: 같은 기관명이 이미 있으면 건너뛴다.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 사람이 읽는 코드 채번 (시드에서는 순번 그대로 사용)
function pad(prefix: string, n: number, width: number) {
  return `${prefix}-${String(n).padStart(width, '0')}`;
}

const COMPANIES = [
  {
    name: '㈜부산에이아이',
    joinYear: 2026,
    region: '부산',
    addressDetail: '부산광역시 금정구 부산대학로',
    orgType: '기업',
    aiField: '컴퓨터비전',
    mainIndustry: '소프트웨어 개발',
    professor1: '김교수',
    mou: true,
    priority: 'A',
    status: '협약완료',
    collab: { internship: true, employment: true, industryProject: true, requiredSkills: 'Python, PyTorch', preferredMajor: '컴퓨터공학', capacity: 3 },
    persons: [
      { name: '이실무', dept: 'AI연구소', position: '책임연구원', email: 'lee@busan-ai.kr', phone: '051-000-0001', contactPref: '이메일', lastContactAt: '2026-05-20' },
    ],
    histories: [
      { professor: '김교수', contactDate: '2026-05-20', method: '미팅', content: 'MOU 후속 인턴십 TO 3명 협의', histStatus: '진행완료' },
      { professor: '김교수', contactDate: '2026-04-10', method: '이메일', content: '협약식 일정 조율', histStatus: '진행완료' },
    ],
  },
  {
    name: '울산스마트팩토리㈜',
    joinYear: 2026,
    region: '울산',
    addressDetail: '울산광역시 남구',
    orgType: '기업',
    aiField: '예측정비/이상탐지',
    mainIndustry: '제조 자동화',
    professor1: '박교수',
    mou: false,
    priority: 'B',
    status: '협의중',
    collab: { internship: true, industryProject: true },
    persons: [
      { name: '최담당', dept: '생산기술팀', position: '팀장', email: 'choi@usmf.co.kr', phone: '052-000-0002', contactPref: '전화', lastContactAt: '2026-05-12' },
    ],
    histories: [
      { professor: '박교수', contactDate: '2026-05-12', method: '전화', content: '산학 프로젝트 주제 1차 논의', histStatus: '논의중' },
    ],
  },
  {
    name: '경남바이오데이터',
    joinYear: 2025,
    region: '경남',
    addressDetail: '경상남도 창원시',
    orgType: '연구소',
    aiField: '바이오 데이터 분석',
    mainIndustry: '생명과학',
    professor1: '정교수',
    professor2: '한교수',
    mou: true,
    priority: 'B',
    status: '미팅예정',
    collab: { internship: true, guestLecture: true },
    persons: [
      { name: '강책임', dept: '데이터사업부', position: '수석', email: 'kang@gnbio.kr', phone: '055-000-0003', contactPref: '미팅', lastContactAt: '2026-05-22' },
      { name: '윤사원', dept: '인사팀', position: '대리', email: 'yoon@gnbio.kr', phone: '055-000-0013', contactPref: '이메일', lastContactAt: '2026-05-01' },
    ],
    histories: [
      { professor: '정교수', contactDate: '2026-05-22', method: '이메일', content: '5월 말 방문 미팅 일정 확정 요청', histStatus: '논의중' },
    ],
  },
  {
    name: '수도권AI솔루션㈜',
    joinYear: 2026,
    region: '수도권',
    addressDetail: '서울특별시 강남구',
    orgType: '기업',
    aiField: 'LLM/생성형AI',
    mainIndustry: 'IT 서비스',
    professor1: '김교수',
    mou: false,
    priority: 'C',
    status: '연락완료',
    collab: { employment: true },
    persons: [
      { name: '서매니저', dept: '채용팀', position: '매니저', email: 'seo@skai.io', phone: '02-000-0004', contactPref: '이메일', lastContactAt: '2026-04-28' },
    ],
    histories: [
      { professor: '김교수', contactDate: '2026-04-28', method: '이메일', content: '채용연계 협력 가능성 첫 접촉', histStatus: '논의중' },
    ],
  },
  {
    name: '동남권로보틱스',
    joinYear: 2025,
    region: '부산',
    addressDetail: '부산광역시 강서구',
    orgType: '기업',
    aiField: '로보틱스/자율주행',
    mainIndustry: '로봇 제조',
    professor1: '박교수',
    mou: true,
    priority: 'A',
    status: '협약완료',
    collab: { internship: true, employment: true, fieldTrainingOrg: true, industryProject: true },
    persons: [
      { name: '한실장', dept: 'R&D센터', position: '실장', email: 'han@dnrobotics.kr', phone: '051-000-0005', contactPref: '미팅', lastContactAt: '2026-05-25' },
    ],
    histories: [
      { professor: '박교수', contactDate: '2026-05-25', method: '미팅', content: '하계 현장실습 5명 배정 확정', histStatus: '진행완료' },
      { professor: '박교수', contactDate: '2026-03-15', method: '미팅', content: '표준현장실습기관 등록 완료', histStatus: '진행완료' },
    ],
  },
];

async function main() {
  console.log('🌱 더미 데이터 시드 시작...');

  // 기존 카운터 읽기 (없으면 0)
  let cCount = (await prisma.counter.findUnique({ where: { key: 'company' } }))?.value ?? 0;
  let pCount = (await prisma.counter.findUnique({ where: { key: 'person' } }))?.value ?? 0;
  let hCount = (await prisma.counter.findUnique({ where: { key: 'history' } }))?.value ?? 0;

  for (const c of COMPANIES) {
    const exists = await prisma.company.findUnique({ where: { name: c.name } });
    if (exists) {
      console.log(`  - 이미 존재: ${c.name} (건너뜀)`);
      continue;
    }

    cCount += 1;
    const company = await prisma.company.create({
      data: {
        code: pad('C', cCount, 3),
        name: c.name,
        joinYear: c.joinYear,
        region: c.region,
        addressDetail: c.addressDetail,
        orgType: c.orgType,
        aiField: c.aiField,
        mainIndustry: c.mainIndustry,
        professor1: c.professor1,
        professor2: c.professor2 ?? null,
        mou: c.mou,
        priority: c.priority,
        status: c.status,
        collaboration: { create: { ...c.collab } },
      },
    });

    const personIdByName: Record<string, string> = {};
    for (const p of c.persons ?? []) {
      pCount += 1;
      const person = await prisma.contactPerson.create({
        data: { code: pad('P', pCount, 4), companyId: company.id, ...p },
      });
      personIdByName[p.name] = person.id;
    }

    for (const h of c.histories ?? []) {
      hCount += 1;
      // 컨택이력은 가능하면 첫 실무자에 연결
      const firstPersonId = Object.values(personIdByName)[0] ?? null;
      await prisma.contactHistory.create({
        data: { code: pad('H', hCount, 4), companyId: company.id, personId: firstPersonId, ...h },
      });
    }

    console.log(`  ✓ ${company.code} ${company.name}`);
  }

  // 카운터 저장
  await prisma.counter.upsert({ where: { key: 'company' }, update: { value: cCount }, create: { key: 'company', value: cCount } });
  await prisma.counter.upsert({ where: { key: 'person' }, update: { value: pCount }, create: { key: 'person', value: pCount } });
  await prisma.counter.upsert({ where: { key: 'history' }, update: { value: hCount }, create: { key: 'history', value: hCount } });

  console.log('✅ 시드 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
