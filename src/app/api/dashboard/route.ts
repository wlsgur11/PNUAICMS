/**
 * GET /api/dashboard — 메인 대시보드 집계 (v1 DashboardService 이식)
 *  총 기업 / 지역별 / 인턴십·채용연계·MOU·협약완료 / 우선순위 / 최근 컨택
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { ENUMS } from '@/lib/enums';

export async function GET() {
  return handle(async () => {
    await requireUser();

    const companies = await prisma.company.findMany({
      where: { isActive: true },
      include: { collaboration: { select: { internship: true, employment: true } } },
    });

    const regionCount: Record<string, number> = {};
    ENUMS.REGION.forEach((r) => (regionCount[r] = 0));
    const priorityCount = { A: 0, B: 0, C: 0 };
    let internshipCount = 0, employmentCount = 0, mouCount = 0, agreedCount = 0;

    for (const c of companies) {
      const r = c.region || '기타';
      regionCount[r] = (regionCount[r] ?? 0) + 1;
      if (c.priority && c.priority in priorityCount) priorityCount[c.priority as 'A' | 'B' | 'C']++;
      if (c.mou) mouCount++;
      if (c.status === '협약완료') agreedCount++;
      if (c.collaboration?.internship) internshipCount++;
      if (c.collaboration?.employment) employmentCount++;
    }

    // 최근 컨택이력 5건
    const recent = await prisma.contactHistory.findMany({
      orderBy: { contactDate: 'desc' },
      take: 5,
      include: { company: { select: { name: true } } },
    });
    const recentHistories = recent.map((h) => ({
      id: h.id,
      companyId: h.companyId,
      companyName: h.company.name,
      professor: h.professor || '',
      contactDate: h.contactDate,
      method: h.method || '',
      content: h.content || '',
      histStatus: h.histStatus,
    }));

    return ok({
      totalCount: companies.length,
      regionCount,
      priorityCount,
      internshipCount,
      employmentCount,
      mouCount,
      agreedCount,
      recentHistories,
    });
  });
}
