/**
 * GET /api/dashboard — 메인 대시보드 집계 (v1 DashboardService 이식)
 *  총 기업 / 지역별 / 인턴십·채용연계·MOU·협약완료 / 우선순위 / 최근 컨택
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { ENUMS } from '@/lib/enums';

// 항상 라이브 DB로 조회. AUTH_BYPASS=true 면 인증이 쿠키를 안 읽어 Next 가 이 라우트를
// 정적 캐시(빌드 시점 값 고정)해버린다 → 재업로드해도 옛 값이 굳음. 이를 막는다.
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await requireUser();

    const companies = await prisma.company.findMany({
      where: { isActive: true },
      include: { collaboration: { select: { internship: true, employment: true, industryProject: true } } },
    });

    const regionCount: Record<string, number> = {};
    ENUMS.REGION.forEach((r) => (regionCount[r] = 0));
    const priorityCount = { A: 0, B: 0, C: 0 };
    let internshipCount = 0, employmentCount = 0, industryProjectCount = 0, mouCount = 0, agreedCount = 0;

    for (const c of companies) {
      const r = c.region || '기타';
      regionCount[r] = (regionCount[r] ?? 0) + 1;
      if (c.priority && c.priority in priorityCount) priorityCount[c.priority as 'A' | 'B' | 'C']++;
      if (c.mou) mouCount++;
      if (c.status === '협약완료') agreedCount++;
      if (c.collaboration?.internship) internshipCount++;
      if (c.collaboration?.employment) employmentCount++;
      if (c.collaboration?.industryProject) industryProjectCount++;
    }

    // 실적 누적 집계 (전체 추이 뷰 요약 타일)
    const [projectTotal, internshipTotal, studentTotal, projCompanies, intCompanies] = await Promise.all([
      prisma.project.count(),
      prisma.internship.count(),
      prisma.student.count(),
      prisma.project.findMany({ where: { companyId: { not: null } }, select: { companyId: true }, distinct: ['companyId'] }),
      prisma.internship.findMany({ where: { companyId: { not: null } }, select: { companyId: true }, distinct: ['companyId'] }),
    ]);
    const partnerCompanyTotal = new Set(
      [...projCompanies, ...intCompanies].map((x) => x.companyId).filter(Boolean),
    ).size;

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
      industryProjectCount,
      mouCount,
      agreedCount,
      projectTotal,
      internshipTotal,
      studentTotal,
      partnerCompanyTotal,
      recentHistories,
    });
  });
}
