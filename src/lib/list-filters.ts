/**
 * src/lib/list-filters.ts
 * ---------------------------------------------------------
 * 인턴십·산학협력 목록/엑셀 라우트가 공유하는 필터(where) 빌더 + 이름 마스킹.
 * (route.ts 에서 직접 export 하면 Next.js 라우트 타입 제약에 걸려 lib 으로 분리)
 */
import { Prisma } from '@prisma/client';

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
  const counsel = sp.get('counsel'); // '없음' | '있음'
  if (counsel === '없음') and.push({ counselings: { none: {} } });
  if (counsel === '있음') and.push({ counselings: { some: {} } });

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
export const isJunkValue = (s: string) => /^[\d.,%\s]+$/.test(s);

/** 이름 마스킹: 2글자→끝, 3글자+→가운데 */
export function maskName(name: string): string {
  const n = (name || '').trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + '*';
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
}
