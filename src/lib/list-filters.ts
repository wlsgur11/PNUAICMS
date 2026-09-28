/**
 * src/lib/list-filters.ts
 * ---------------------------------------------------------
 * 인턴십·산학협력·학생·기업 목록/엑셀 라우트가 공유하는 필터(where)·정렬 빌더.
 * (route.ts 에서 직접 export 하면 Next.js 라우트 타입 제약에 걸려 lib 으로 분리)
 * 대시보드 숫자에서 목록으로 넘어가는 조건도 여기 둔다. 기준이 두 곳에 있으면
 * 대시보드는 7명이라는데 목록은 9명이 나오는 식으로 어긋난다.
 */
import { Prisma } from '@prisma/client';
import { COLLAB_FIELDS } from '@/lib/enums';
import { kstDate } from '@/lib/kst';

/** 상담 관리 필요: 3~4학년 재학생 중 상담이 NEEDS_COUNSEL_MAX 회 미만 */
export const NEEDS_COUNSEL_WHERE: Prisma.StudentWhereInput = {
  grade: { in: [3, 4] }, OR: [{ graduationDate: null }, { graduationDate: '' }],
};
export const NEEDS_COUNSEL_MAX = 2;

/**
 * counsel=관리필요 일 때 상담 횟수로 한 번 더 거르는 함수. 관계 개수는 where 로 걸 수 없어
 * 목록을 받은 뒤 거른다(목록은 페이지 없이 전부 받는다). 해당 없으면 null
 */
export const counselCountFilter = (sp: URLSearchParams) =>
  (sp.get('counsel') === '관리필요'
    ? (s: { _count: { counselings: number } }) => s._count.counselings < NEEDS_COUNSEL_MAX
    : null);

/** 후속 연락에서 빼는 진행상태. 지금 할 일이 없는 기업이다 */
export const FOLLOWUP_DONE = ['협약완료', '보류', '종료'];
/** 이 날짜보다 오래 연락이 없으면 '반년 넘게 조용'. 컨택 주기가 학기 단위라 한 학기를 통째로 건너뛴 셈이다 */
export const followupCutoff = () => kstDate(new Date(Date.now() - 182 * 864e5));

export function internshipWhere(sp: URLSearchParams): Prisma.InternshipWhereInput {
  const where: Prisma.InternshipWhereInput = {};
  const year = sp.get('year'); if (year) where.year = Number(year);
  const host = sp.get('host'); if (host) where.hostType = host;
  const method = sp.get('method'); if (method) where.method = method;
  const domestic = sp.get('domestic'); if (domestic) where.domestic = domestic;
  const q = sp.get('q')?.trim();
  if (q) where.OR = [
    { companyNameRaw: { contains: q } },
    { company: { name: { contains: q } } },
    { programName: { contains: q } },
  ];
  return where;
}

export function projectWhere(sp: URLSearchParams): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {};
  const year = sp.get('year'); if (year) where.year = Number(year);
  const dept = sp.get('dept'); if (dept) where.dept = dept;
  const category = sp.get('category'); if (category) where.category = category;
  const type = sp.get('type'); if (type) where.type = type;
  const track = sp.get('track'); if (track) where.track = track;
  const division = sp.get('division'); if (division) where.divisionCode = division;
  const divisionVersion = sp.get('divisionVersion'); if (divisionVersion) where.divisionVersion = divisionVersion;
  const q = sp.get('q')?.trim();
  if (q) where.OR = [
    { title: { contains: q } },
    { companyNameRaw: { contains: q } },
    { company: { name: { contains: q } } },
    { lab: { professorName: { contains: q } } },
  ];
  return where;
}

/**
 * 학생 목록 필터. 화면, 엑셀 두 라우트가 같이 쓴다.
 *
 * 전에는 두 파일에 같은 함수를 복사해 뒀는데 한쪽만 고쳐져서, 화면에서 '재학' 으로
 * 거른 뒤 엑셀을 받으면 졸업생까지 들어 있었다. 필터는 한 곳에만 둔다.
 */
export function studentWhere(sp: URLSearchParams): Prisma.StudentWhereInput {
  const and: Prisma.StudentWhereInput[] = [];
  const dept = sp.get('department'); if (dept) and.push({ department: dept });
  const major = sp.get('major'); if (major) and.push({ major: major });
  const grade = sp.get('grade'); if (grade) and.push({ grade: Number(grade) });
  const career = sp.get('careerGoal'); if (career) and.push({ careerGoal: career });

  const status = sp.get('status'); // '재학' | '졸업'
  if (status === '졸업') and.push({ graduationDate: { not: null } });
  if (status === '재학') and.push({ OR: [{ graduationDate: null }, { graduationDate: '' }] });

  // 상담이 이 시스템의 주 업무다. '아직 한 번도 안 만난 학생' 을 뽑는 게 제일 잦다
  const counsel = sp.get('counsel'); // '없음' | '있음' | '관리필요'
  if (counsel === '없음') and.push({ counselings: { none: {} } });
  if (counsel === '있음') and.push({ counselings: { some: {} } });
  // 대시보드 '상담 관리 필요' 에서 넘어온다. 상담 횟수는 counselCountFilter 가 거른다
  if (counsel === '관리필요') and.push(NEEDS_COUNSEL_WHERE);

  // 신규 등록은 연락처가 필수지만, 실적 엑셀에서 들어온 학생은 비어 있다.
  // 채워 넣을 대상을 뽑아 보는 칸이다
  const contact = sp.get('contact'); // '없음' | '있음'
  const blank = (f: 'phone' | 'email') => ({ OR: [{ [f]: null }, { [f]: '' }] } as Prisma.StudentWhereInput);
  if (contact === '없음') and.push({ OR: [blank('phone'), blank('email')] });
  if (contact === '있음') and.push({ AND: [{ phone: { not: null } }, { phone: { not: '' } }, { email: { not: null } }, { email: { not: '' } }] });

  // 이메일은 대소문자가 섞여 들어온다. 학번, 전화는 영향 없고 이름은 한글이라 무관
  const q = sp.get('q')?.trim();
  if (q) and.push({ OR: [
    { name: { contains: q } },
    { studentNo: { contains: q } },
    { phone: { contains: q } },
    { email: { contains: q, mode: 'insensitive' } },
  ] });

  return and.length ? { AND: and } : {};
}

/**
 * 학생 목록 정렬. 기본은 최근 수정순이다.
 * 같은 이름이 여러 줄 보일 때 학번순으로 바꿔 보면 중복이 나란히 붙는다.
 */
export function studentOrderBy(sp: URLSearchParams): Prisma.StudentOrderByWithRelationInput[] {
  const no = { studentNo: 'asc' as const };
  switch (sp.get('sort')) {
    case 'created_desc': return [{ createdAt: 'desc' as const }, no];
    case 'name_asc': return [{ name: 'asc' as const }, no];
    case 'no_asc': return [no];
    // 상담이 주 업무다. 아직 못 만난 학생부터 올려 본다
    case 'counsel_asc': return [{ counselings: { _count: 'asc' as const } }, no];
    case 'counsel_desc': return [{ counselings: { _count: 'desc' as const } }, no];
    default: return [{ updatedAt: 'desc' as const }, no]; // updated_desc
  }
}

/**
 * 엑셀 칸이 밀려 들어온 값. 숫자와 기호만 있는 문자열은 교수명이나 유형 이름이
 * 아니라 옆 칸 값이 새어 들어온 것으로 본다. 목록 필터와 대시보드가 함께 쓴다.
 */
/**
 * 협력 기업 목록과 엑셀 내보내기가 같이 쓴다. 따로 적어 두었더니 내보내기에서
 * 관심사업분야 조건이 빠져, 걸러 놓고 내려받아도 전체 기업이 나왔다.
 */
export function companyWhere(sp: URLSearchParams): Prisma.CompanyWhereInput {
  const and: Prisma.CompanyWhereInput[] = [];
  const get = (k: string) => sp.get(k)?.trim();
  if (sp.get('includeInactive') !== '1') and.push({ isActive: true });
  const q = get('q'); if (q) and.push({ name: { contains: q, mode: 'insensitive' } });
  const region = get('region'); if (region) and.push({ region });
  const priority = get('priority'); if (priority) and.push({ priority });
  const status = get('status'); if (status) and.push({ status });
  const aiField = get('aiField'); if (aiField) and.push({ aiField: { contains: aiField, mode: 'insensitive' } });
  if (sp.get('mou') === '1') and.push({ mou: true });
  // 사업단: 해당 사업단으로 컨택한 이력이 있는 기업만 (사업단은 컨택이력에 기록됨)
  const business = get('business'); if (business) and.push({ histories: { some: { business } } });

  // 협력 항목(체크된 항목 모두 만족 — AND)
  const collab: Record<string, true> = {};
  for (const f of COLLAB_FIELDS) if (sp.get(f.key) === '1') collab[f.key] = true;
  if (Object.keys(collab).length) and.push({ collaboration: { is: collab } });

  // 후속 연락. 대시보드 '다음에 연락할 기업' 의 숫자와 같은 범위다
  const followup = sp.get('followup'); // 'none' | 'stale'
  if (followup === 'none' || followup === 'stale') {
    and.push({ isActive: true, status: { notIn: FOLLOWUP_DONE } });
    if (followup === 'none') and.push({ histories: { none: {} } });
    // 연락은 했지만 기준일 이후로는 한 번도 없음
    else and.push({ histories: { some: {} } }, { histories: { none: { contactDate: { gte: followupCutoff() } } } });
  }
  return { AND: and };
}

export const isJunkValue = (s: string) => /^[\d.,%\s]+$/.test(s);
