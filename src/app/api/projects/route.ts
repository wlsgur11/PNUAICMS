/**
 * GET /api/projects — 산학협력 프로젝트 현황 목록 (필터: year, dept, category, type, track, q)
 *   응답: { rows, facets }. 참여학생은 { studentNo, nameMasked }(연결된 학생만 studentNo 존재). 매칭 기업은 company.id·name.
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { projectWhere, isJunkValue } from '@/lib/list-filters';

async function facet(field: 'type' | 'track'): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { [field]: { not: null } }, distinct: [field], orderBy: { [field]: 'asc' },
  });
  const vals = rows.map((r) => r[field]).filter((v): v is string => typeof v === 'string' && v.length > 0 && !isJunkValue(v));
  return [...new Set(vals)];
}

export async function GET(req: Request) {
  return handle(async () => {
    await requireRole('ADMIN');
    const sp = new URL(req.url).searchParams;
    const items = await prisma.project.findMany({
      where: projectWhere(sp),
      orderBy: [{ year: 'desc' }, { dept: 'asc' }],
      include: {
        company: { select: { id: true, name: true } },
        lab: { select: { professorName: true, labName: true } },
        students: { include: { student: { select: { studentNo: true, name: true, nameMasked: true } } } },
      },
    });
    const rows = items.map((it) => {
      const named = it.students
        .map((s) => ({ studentNo: s.student.studentNo, studentName: s.student.name || s.student.nameMasked || '' }))
        .filter((s) => !!s.studentName);
      const raws = it.studentNamesRaw
        ? it.studentNamesRaw.split(',').filter(Boolean).map((n) => ({ studentNo: null, studentName: n.trim() }))
        : [];
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
