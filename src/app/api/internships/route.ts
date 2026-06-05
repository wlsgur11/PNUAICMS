/**
 * GET /api/internships — 인턴십 현황 목록 (필터: year, host, method, domestic, q)
 *   응답: { rows, facets } — facets 는 실제 데이터에 존재하는 값만(드롭다운용).
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { internshipWhere } from '@/lib/list-filters';

async function facet(field: 'hostType' | 'method' | 'domestic'): Promise<string[]> {
  const rows = await prisma.internship.findMany({
    where: { [field]: { not: null } }, distinct: [field], orderBy: { [field]: 'asc' },
  });
  const vals = rows.map((r) => r[field]).filter((v): v is string => typeof v === 'string' && v.length > 0);
  return [...new Set(vals)];
}

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const items = await prisma.internship.findMany({
      where: internshipWhere(sp),
      orderBy: [{ year: 'desc' }, { startDate: 'desc' }],
      include: { company: { select: { id: true, name: true } } },
    });
    const rows = items.map((it) => ({
      id: it.id, year: it.year, programName: it.programName, hostType: it.hostType,
      method: it.method, domestic: it.domestic,
      weeks: it.weeks, credits: it.credits, cntCSE: it.cntCSE, cntDS: it.cntDS, cntNonSW: it.cntNonSW,
      companyId: it.company?.id ?? null,
      companyName: it.company?.name ?? it.companyNameRaw ?? '-',
    }));
    const [hostType, method, domestic] = await Promise.all([facet('hostType'), facet('method'), facet('domestic')]);
    return ok({ rows, facets: { hostType, method, domestic } });
  });
}
