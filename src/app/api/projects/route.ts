/**
 * GET /api/projects — 산학협력 프로젝트 현황 목록 (필터: year, dept, category, type, track, q)
 *   응답: { rows, facets }. 참여학생은 마스킹 이름. 매칭 기업은 company.id·name.
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { projectWhere, maskName } from '@/lib/list-filters';

const isJunk = (s: string) => /^[\d.,%\s]+$/.test(s); // 숫자만(잘못 들어간 값)
async function facet(field: 'type' | 'track'): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { [field]: { not: null } }, distinct: [field], orderBy: { [field]: 'asc' },
  });
  const vals = rows.map((r) => r[field]).filter((v): v is string => typeof v === 'string' && v.length > 0 && !isJunk(v));
  return [...new Set(vals)];
}

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const items = await prisma.project.findMany({
      where: projectWhere(sp),
      orderBy: [{ year: 'desc' }, { dept: 'asc' }],
      include: {
        company: { select: { id: true, name: true } },
        lab: { select: { professorName: true, labName: true } },
        students: { include: { student: { select: { nameMasked: true } } } },
      },
    });
    const rows = items.map((it) => {
      const named = it.students.map((s) => s.student.nameMasked).filter((x): x is string => !!x);
      const raws = it.studentNamesRaw ? it.studentNamesRaw.split(',').filter(Boolean).map(maskName) : [];
      return {
        id: it.id, year: it.year, dept: it.dept, category: it.category, type: it.type,
        title: it.title, period: it.period, track: it.track,
        professorName: it.lab?.professorName ?? null, labName: it.lab?.labName ?? null,
        companyId: it.company?.id ?? null, companyName: it.company?.name ?? it.companyNameRaw ?? '-',
        students: [...named, ...raws],
      };
    });
    const [type, track] = await Promise.all([facet('type'), facet('track')]);
    const yearRows = await prisma.project.findMany({
      where: { year: { not: null } }, distinct: ['year'], select: { year: true }, orderBy: { year: 'desc' },
    });
    const years = yearRows.map((r) => r.year).filter((y): y is number => y != null);
    return ok({ rows, facets: { type, track, years } });
  });
}
