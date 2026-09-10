/**
 * GET /api/dashboard?year=<연도>
 *   대시보드 한 화면에 필요한 모든 집계를 한 번에 내려준다.
 *   (예전에는 /api/dashboard 와 /api/year-stats 를 따로 불렀다)
 *
 * 권한: 로그인만 필요. 단 일반(GENERAL) 에게는 민감한 블록을 비운다.
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { PIPELINE_STAGES, type DashboardData, type SwcuCell, type SwcuUnmet, type DistributionItem } from '@/lib/dashboard-shape';

// AUTH_BYPASS=true 일 때 Next 가 이 라우트를 정적 캐시하는 것을 막는다.
export const dynamic = 'force-dynamic';

/** groupBy 결과를 { key, count } 배열로. null 키는 라벨로 바꾼다. */
function toItems<T extends Record<string, unknown>>(
  rows: T[], field: keyof T, nullLabel: string,
): DistributionItem[] {
  return rows
    .map((r) => ({ key: (r[field] as string | null) || nullLabel, count: Number((r as { _count?: { _all?: number } })._count?._all ?? 0) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** 같은 표시 이름끼리 합치고 건수 내림차순으로. (분과는 라벨을 붙인 뒤에야 합칠 수 있다) */
function mergeByKey(items: DistributionItem[]): DistributionItem[] {
  const acc = new Map<string, number>();
  for (const it of items) {
    if (it.count <= 0) continue;
    acc.set(it.key, (acc.get(it.key) ?? 0) + it.count);
  }
  return [...acc.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const sp = new URL(req.url).searchParams;

    // 선택 가능한 연도 = 실적 현황판 연도 + SW중심대학 연차
    const [statYears, swcuYears] = await Promise.all([
      prisma.yearStat.findMany({ select: { year: true } }),
      prisma.swcuYear.findMany({ select: { year: true } }),
    ]);
    const years = [...new Set([...statYears, ...swcuYears].map((y) => y.year))].sort((a, b) => b - a);

    const asked = Number(sp.get('year'));
    const year = years.includes(asked) ? asked : (years[0] ?? new Date().getFullYear());
    const prev = year - 1;

    const [stat, indicators] = await Promise.all([
      prisma.yearStat.findUnique({ where: { year } }),
      prisma.swcuIndicator.findMany({ where: { year }, orderBy: { sortOrder: 'asc' } }),
    ]);

    // ── SW중심대학 지표: target 이 있는 것만 판정. actual >= target 이면 달성
    const cells: SwcuCell[] = [];
    const unmetAll: SwcuUnmet[] = [];
    let met = 0;
    for (const ind of indicators) {
      if (ind.target == null || ind.actual == null) { cells.push('na'); continue; }
      if (ind.actual >= ind.target) { cells.push('met'); met++; continue; }
      cells.push('unmet');
      unmetAll.push({ name: ind.name, target: ind.target, actual: ind.actual, unit: ind.unit });
    }
    // 부족분이 큰 순(비율 기준). 목표가 0 이면 뒤로 민다.
    unmetAll.sort((a, b) => (a.target ? a.actual / a.target : 2) - (b.target ? b.actual / b.target : 2));

    // ── 누적 타일. delta 는 선택 연도 건수와 전년 건수의 차
    const [
      companyTotal, mouTotal, projectTotal, internshipTotal,
      compThis, compPrev, projThis, projPrev, intThis, intPrev,
      projByYear, intByYear,
    ] = await Promise.all([
      prisma.company.count({ where: { isActive: true } }),
      prisma.company.count({ where: { isActive: true, mou: true } }),
      prisma.project.count(),
      prisma.internship.count(),
      prisma.company.count({ where: { isActive: true, joinYear: year } }),
      prisma.company.count({ where: { isActive: true, joinYear: prev } }),
      prisma.project.count({ where: { year } }),
      prisma.project.count({ where: { year: prev } }),
      prisma.internship.count({ where: { year } }),
      prisma.internship.count({ where: { year: prev } }),
      prisma.project.groupBy({ by: ['year'], where: { year: { not: null } }, _count: { _all: true } }),
      prisma.internship.groupBy({ by: ['year'], where: { year: { not: null } }, _count: { _all: true } }),
    ]);

    const trendMap = new Map<number, { projects: number; internships: number }>();
    for (const r of projByYear) {
      const y = r.year as number;
      trendMap.set(y, { projects: r._count._all, internships: trendMap.get(y)?.internships ?? 0 });
    }
    for (const r of intByYear) {
      const y = r.year as number;
      const cur = trendMap.get(y) ?? { projects: 0, internships: 0 };
      trendMap.set(y, { ...cur, internships: r._count._all });
    }
    const trend = [...trendMap.entries()]
      .map(([y, v]) => ({ year: y, ...v }))
      .sort((a, b) => a.year - b.year);

    const base: DashboardData = {
      years,
      year,
      goals: {
        industry: {
          target: stat?.industryTargetRatio ?? null,
          achieved: stat?.industryAchievedRatio ?? null,
          students: stat?.industryStudents ?? null,
        },
        internship: {
          target: stat?.internshipTargetRatio ?? null,
          achieved: stat?.internshipAchievedRatio ?? null,
          students: stat?.internshipStudents ?? null,
        },
        swcu: { total: indicators.length, met, unmet: unmetAll.slice(0, 3), unmetCount: unmetAll.length, cells },
      },
      totals: {
        companies: { value: companyTotal, delta: compThis - compPrev },
        projects: { value: projectTotal, delta: projThis - projPrev },
        internships: { value: internshipTotal, delta: intThis - intPrev },
        // MOU 는 체결일 컬럼이 없어 연도별 증감을 계산할 수 없다
        mou: { value: mouTotal, delta: null },
      },
      trend,
      pipeline: null,
      distribution: null,
      recentHistories: [],
    };

    // 일반 사용자는 요약까지만 본다
    if (user.role === 'GENERAL') return ok(base);

    const [byStatus, newThisYear, deptRows, divRows, regionRows, typeRows, divisions, recent] = await Promise.all([
      prisma.company.groupBy({ by: ['status'], where: { isActive: true }, _count: { _all: true } }),
      prisma.company.count({ where: { isActive: true, joinYear: year } }),
      prisma.project.groupBy({ by: ['dept'], where: { year }, _count: { _all: true } }),
      prisma.project.groupBy({ by: ['divisionVersion', 'divisionCode'], where: { year }, _count: { _all: true } }),
      prisma.company.groupBy({ by: ['region'], where: { isActive: true }, _count: { _all: true } }),
      prisma.project.groupBy({ by: ['type'], where: { year }, _count: { _all: true } }),
      prisma.division.findMany(),
      prisma.contactHistory.findMany({
        orderBy: { contactDate: 'desc' }, take: 5,
        include: { company: { select: { name: true } } },
      }),
    ]);

    const statusCount = new Map(byStatus.map((r) => [r.status, r._count._all]));
    // 분과 코드(A~F)는 old5 / new6 두 버전에 같은 글자가 서로 다른 이름으로 존재한다.
    // 버전까지 합쳐 키를 만들지 않으면 다른 분과가 같은 이름으로 뭉개진다.
    const divName = new Map(divisions.map((d) => [`${d.version}|${d.code}`, d.name]));

    return ok({
      ...base,
      pipeline: {
        byStatus: PIPELINE_STAGES.map((s) => ({ status: s, count: statusCount.get(s) ?? 0 })),
        onHold: statusCount.get('보류') ?? 0,
        closed: statusCount.get('종료') ?? 0,
        newThisYear,
      },
      distribution: {
        dept: toItems(deptRows, 'dept', '미분류'),
        division: mergeByKey(
          divRows.map((r) => ({
            key: r.divisionCode
              ? (divName.get(`${r.divisionVersion ?? ''}|${r.divisionCode}`) ?? r.divisionCode)
              : '미분류',
            count: r._count._all,
          })),
        ),
        region: toItems(regionRows, 'region', '미지정'),
        type: toItems(typeRows, 'type', '미분류'),
        baseline: { enrolledCSE: stat?.enrolledCSE ?? null, enrolledDS: stat?.enrolledDS ?? null },
      },
      recentHistories: recent.map((h) => ({
        id: h.id, companyId: h.companyId, companyName: h.company.name,
        professor: h.professor || '', contactDate: h.contactDate,
        method: h.method || '', content: h.content || '', histStatus: h.histStatus,
      })),
    } satisfies DashboardData);
  });
}
