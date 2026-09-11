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
