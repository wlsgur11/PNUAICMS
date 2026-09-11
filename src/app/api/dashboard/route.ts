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
import {
  PIPELINE_STAGES,
  type DashboardData, type SwcuCell, type SwcuUnmet, type SwcuArea,
  type DistributionItem, type InternshipHeadcount, type InternshipComposition,
  type ProjectHeadcount,
} from '@/lib/dashboard-shape';
import { COLLAB_FIELDS } from '@/lib/enums';

// AUTH_BYPASS=true 일 때 Next 가 이 라우트를 정적 캐시하는 것을 막는다.
export const dynamic = 'force-dynamic';

/** groupBy 결과를 { key, count } 배열로. null 키는 라벨로 바꾼다. */
function toItems<T extends { _count: { _all: number } }>(
  rows: T[], field: keyof T, nullLabel: string,
): DistributionItem[] {
  return rows
    .map((r) => ({ key: (r[field] as string | null) || nullLabel, count: r._count._all }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * 같은 표시 이름끼리 합치고 건수 내림차순으로. (분과는 라벨을 붙인 뒤에야 합칠 수 있다)
 * 서로 다른 (version, code) 가 같은 라벨로 합쳐지면 드릴다운을 특정할 수 없으므로
 * code/version 을 떨어뜨린다.
 */
function mergeByKey(items: DistributionItem[]): DistributionItem[] {
  const acc = new Map<string, DistributionItem>();
  for (const it of items) {
    if (it.count <= 0) continue;
    const cur = acc.get(it.key);
    if (!cur) { acc.set(it.key, { ...it }); continue; }
    const same = cur.code === it.code && cur.version === it.version;
    acc.set(it.key, {
      key: it.key,
      count: cur.count + it.count,
      ...(same ? { code: cur.code, version: cur.version } : {}),
    });
  }
  return [...acc.values()].sort((a, b) => b.count - a.count);
}

/** 값별 건수 누적기. 빈 값은 하나의 라벨로 모은다 */
function bump(m: Map<string, number>, v: string | null) {
  const k = v?.trim() || '미기재';
  m.set(k, (m.get(k) ?? 0) + 1);
}
const toList = (m: Map<string, number>) =>
  [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const sp = new URL(req.url).searchParams;

    // 실적 현황판 전 연도를 한 번에 읽는다. 선택 연도와 전년 값, 달성률 추이가
    // 모두 이 배열에서 나오므로 findUnique 를 따로 두지 않는다.
    const [allStats, swcuYears] = await Promise.all([
      prisma.yearStat.findMany({ orderBy: { year: 'asc' } }),
      prisma.swcuYear.findMany({ select: { year: true } }),
    ]);
    // 선택 가능한 연도 = 실적 현황판 연도 + SW중심대학 연차
    const years = [...new Set([...allStats, ...swcuYears].map((y) => y.year))].sort((a, b) => b - a);

    const asked = Number(sp.get('year'));
    const year = years.includes(asked) ? asked : (years[0] ?? new Date().getFullYear());
    const prev = year - 1;
    const stat = allStats.find((r) => r.year === year) ?? null;
    const prevStat = allStats.find((r) => r.year === prev) ?? null;

    // ── 누적 타일. delta 는 선택 연도 건수와 전년 건수의 차 (stat/indicators 도 같은 year/prev 에만 의존해 한 배치로 묶는다)
    const [
      indicators, prevIndicators,
      companyTotal, partnerCompanies, mouTotal, projectTotal, internshipTotal,
      compThis, compPrev, projThis, projPrev, intThis, intPrev,
      projByYear, intByYear,
    ] = await Promise.all([
      prisma.swcuIndicator.findMany({ where: { year }, orderBy: { sortOrder: 'asc' } }),
      prisma.swcuIndicator.findMany({ where: { year: prev }, select: { target: true, actual: true } }),
      prisma.company.count({ where: { isActive: true } }),
      // 실적이 한 건이라도 붙은 기업. 관리 대상 기업 수(companyTotal)와 다르다
      prisma.company.count({ where: { OR: [{ projects: { some: {} } }, { internships: { some: {} } }] } }),
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

    // ── SW중심대학 지표: target 이 있는 것만 판정. actual >= target 이면 달성
    const cells: SwcuCell[] = [];
    const unmetAll: SwcuUnmet[] = [];
    const areaMap = new Map<string, SwcuArea>();
    let met = 0;
    for (const ind of indicators) {
      let cell: SwcuCell = 'na';
      if (ind.target != null && ind.actual != null) {
        if (ind.actual >= ind.target) { cell = 'met'; met++; }
        else {
          cell = 'unmet';
          unmetAll.push({ name: ind.name, target: ind.target, actual: ind.actual, unit: ind.unit });
        }
      }
      cells.push(cell);

      const key = ind.area?.trim() || '기타';
      const a = areaMap.get(key) ?? { area: key, met: 0, unmet: 0, na: 0, total: 0 };
      a[cell]++;
      a.total++;
      areaMap.set(key, a);
    }
    // 미달이 몰린 영역부터. 같으면 지표가 많은 영역부터
    const areas = [...areaMap.values()].sort((a, b) => b.unmet - a.unmet || b.total - a.total);
    // 부족분이 큰 순(비율 기준). 목표가 0 이면 뒤로 민다.
    unmetAll.sort((a, b) => (a.target ? a.actual / a.target : 2) - (b.target ? b.actual / b.target : 2));

    // 전년 달성 개수. 분모(지표 수)가 해마다 달라질 수 있어 개수도 같이 보낸다.
    const prevMet = prevIndicators.filter((r) => r.target != null && r.actual != null && r.actual >= r.target).length;

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
          prevAchieved: prevStat?.industryAchievedRatio ?? null,
        },
        internship: {
          target: stat?.internshipTargetRatio ?? null,
          achieved: stat?.internshipAchievedRatio ?? null,
          students: stat?.internshipStudents ?? null,
          prevAchieved: prevStat?.internshipAchievedRatio ?? null,
        },
        swcu: {
          total: indicators.length, met, unmet: unmetAll.slice(0, 3), unmetCount: unmetAll.length, cells, areas,
          prevMet: prevIndicators.length ? prevMet : null,
          prevTotal: prevIndicators.length || null,
        },
      },
      totals: {
        companies: { value: companyTotal, delta: compThis - compPrev },
        projects: { value: projectTotal, delta: projThis - projPrev },
        internships: { value: internshipTotal, delta: intThis - intPrev },
        // MOU 는 체결일 컬럼이 없어 연도별 증감을 계산할 수 없다
        mou: { value: mouTotal, delta: null },
      },
      trend,
      goalTrend: allStats.map((r) => ({
        year: r.year,
        industryAchieved: r.industryAchievedRatio,
        industryTarget: r.industryTargetRatio,
        internshipAchieved: r.internshipAchievedRatio,
        internshipTarget: r.internshipTargetRatio,
      })),
      headcount: {
        enrolledCSE: stat?.enrolledCSE ?? null, enrolledDS: stat?.enrolledDS ?? null,
        industryTargetCSE: stat?.industryTargetCSE ?? null, industryTargetDS: stat?.industryTargetDS ?? null,
        internTargetCSE: stat?.internTargetCSE ?? null, internTargetDS: stat?.internTargetDS ?? null,
      },
      partnerCompanies,
      // 아래 null 필드는 일반(GENERAL) 전용 기본값. 권한 분기에서 전부 덮어써야 한다
      pipeline: null,
      distribution: null,
      collaboration: null,
      students: null,
      internshipHeadcount: null,
      internshipComposition: null,
      projectHeadcount: null,
      labs: null,
      recentHistories: [],
    };

    // 일반 사용자는 요약까지만 본다
    if (user.role === 'GENERAL') return ok(base);

    // 쏠림 진단(dept/division/type)은 특정 연도가 아니라 전체 연도 누적 경향을 보려는 것이라 year 필터를 걸지 않는다.
    const [
      byStatus, deptRows, divRows, regionRows, typeRows, divisions, recent,
      collabRows, studentTotal, studentGraduated, studentWithProject, studentWithIntern,
      gradeRows, attentionRows, internRows, projectRows, labRows,
    ] = await Promise.all([
      prisma.company.groupBy({ by: ['status'], where: { isActive: true }, _count: { _all: true } }),
      prisma.project.groupBy({ by: ['dept'], _count: { _all: true } }),
      prisma.project.groupBy({ by: ['divisionVersion', 'divisionCode'], _count: { _all: true } }),
      prisma.company.groupBy({ by: ['region'], where: { isActive: true }, _count: { _all: true } }),
      prisma.project.groupBy({ by: ['type'], _count: { _all: true } }),
      prisma.division.findMany(),
      prisma.contactHistory.findMany({
        orderBy: { contactDate: 'desc' }, take: 5,
        include: { company: { select: { name: true } } },
      }),
      // 협력 항목은 boolean 10개라 groupBy 로 묶을 수 없다. 한 번에 읽어 와 세는 편이 싸다
      prisma.collaboration.findMany({
        where: { company: { isActive: true } },
        select: {
          internship: true, industryProject: true, curriculumCommittee: true, guestLecture: true,
          employment: true, fieldTrainingOrg: true, overseasEducation: true, valueSpread: true,
          startup: true, etc: true,
        },
      }),
      prisma.student.count(),
      prisma.student.count({ where: { graduationDate: { not: null, notIn: [''] } } }),
      prisma.student.count({ where: { projects: { some: {} } } }),
      prisma.student.count({ where: { manualInternships: { some: {} } } }),
      prisma.student.groupBy({ by: ['grade'], where: { grade: { not: null } }, _count: { _all: true } }),
      // 3~4학년인데 상담이 2회 미만인 학생. 지금 챙겨야 할 대상
      prisma.student.findMany({
        where: { grade: { in: [3, 4] }, OR: [{ graduationDate: null }, { graduationDate: '' }] },
        select: { _count: { select: { counselings: true } } },
      }),
      // 인턴십은 162건 뿐이라 연도별 합계와 구성 여섯 갈래를 따로 질의하는 것보다
      // 한 번 읽어 와 JS 로 세는 편이 싸다. 협력 항목과 같은 이유다.
      prisma.internship.findMany({
        select: {
          year: true, domestic: true, hostType: true, method: true,
          cntCSE: true, cntDS: true, cntNonSW: true, empSW: true, empNonSW: true,
        },
      }),
      prisma.project.findMany({ select: { year: true, cntPhd: true, cntMaster: true, cntUndergrad: true } }),
      prisma.lab.findMany({
        select: { professorName: true, labName: true, _count: { select: { projects: true } } },
      }),
    ]);

    const collabCount = new Map<string, number>();
    for (const row of collabRows) {
      for (const f of COLLAB_FIELDS) {
        if ((row as Record<string, boolean>)[f.key]) collabCount.set(f.label, (collabCount.get(f.label) ?? 0) + 1);
      }
    }
    // 인턴십: 교육인원·연계취업자 합계와 구성 세 축을 선택 연도/전체 누적 두 벌로 한 번에 센다
    const newHead = (): InternshipHeadcount => ({ cse: 0, ds: 0, nonSw: 0, empSw: 0, empNonSw: 0 });
    const newComp = () => ({ domestic: new Map<string, number>(), hostType: new Map<string, number>(), method: new Map<string, number>() });
    const heads = { year: newHead(), total: newHead() };
    const comps = { year: newComp(), total: newComp() };
    for (const r of internRows) {
      for (const k of (r.year === year ? ['year', 'total'] : ['total']) as ('year' | 'total')[]) {
        const h = heads[k];
        h.cse += r.cntCSE ?? 0; h.ds += r.cntDS ?? 0; h.nonSw += r.cntNonSW ?? 0;
        h.empSw += r.empSW ?? 0; h.empNonSw += r.empNonSW ?? 0;
        bump(comps[k].domestic, r.domestic);
        bump(comps[k].hostType, r.hostType);
        bump(comps[k].method, r.method);
      }
    }
    const toComp = (c: ReturnType<typeof newComp>): InternshipComposition => ({
      domestic: toList(c.domestic), hostType: toList(c.hostType), method: toList(c.method),
    });

    // 산학 과제 참여 인원. 박사·석사는 기재된 과제가 절반뿐이라 기재 건수도 같이 센다
    const newPHead = (): ProjectHeadcount => ({
      projects: 0,
      phd: { sum: 0, filled: 0 }, master: { sum: 0, filled: 0 }, undergrad: { sum: 0, filled: 0 },
    });
    const pheads = { year: newPHead(), total: newPHead() };
    for (const r of projectRows) {
      for (const k of (r.year === year ? ['year', 'total'] : ['total']) as ('year' | 'total')[]) {
        const p = pheads[k];
        p.projects++;
        for (const [f, v] of [['phd', r.cntPhd], ['master', r.cntMaster], ['undergrad', r.cntUndergrad]] as const) {
          if (v == null) continue;
          p[f].sum += v;
          p[f].filled++;
        }
      }
    }

    // 연구실별 과제 수. 과제는 연구실을 최대 하나만 갖기 때문에 합계를 빼면 미연결 건수가 나온다
    const labbed = labRows.filter((l) => l._count.projects > 0);

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
        // compThis 와 같은 값(기업 증감 delta 의 분자). 다시 쪼개서 따로 세지 말 것
        newThisYear: compThis,
      },
      distribution: {
        dept: toItems(deptRows, 'dept', '미분류'),
        division: mergeByKey(
          divRows.map((r) => ({
            key: r.divisionCode
              ? (divName.get(`${r.divisionVersion ?? ''}|${r.divisionCode}`) ?? r.divisionCode)
              : '미분류',
            count: r._count._all,
            ...(r.divisionCode ? { code: r.divisionCode, version: r.divisionVersion ?? undefined } : {}),
          })),
        ),
        region: toItems(regionRows, 'region', '미지정'),
        type: toItems(typeRows, 'type', '미분류'),
        baseline: { enrolledCSE: stat?.enrolledCSE ?? null, enrolledDS: stat?.enrolledDS ?? null },
      },
      collaboration: COLLAB_FIELDS
        .map((f) => ({ key: f.label, count: collabCount.get(f.label) ?? 0 }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count),
      students: {
        total: studentTotal,
        graduated: studentGraduated,
        projectParticipants: studentWithProject,
        internParticipants: studentWithIntern,
        gradeDistribution: [1, 2, 3, 4].map((g) => ({
          grade: g,
          count: gradeRows.find((r) => r.grade === g)?._count._all ?? 0,
        })),
        needsAttention: attentionRows.filter((s) => s._count.counselings < 2).length,
      },
      internshipHeadcount: heads,
      internshipComposition: { year: toComp(comps.year), total: toComp(comps.total) },
      projectHeadcount: pheads,
      labs: {
        top: [...labbed]
          .sort((a, b) => b._count.projects - a._count.projects)
          .slice(0, 6)
          .map((l) => ({ professor: l.professorName, lab: l.labName, count: l._count.projects })),
        labCount: labbed.length,
        unlinked: projectTotal - labbed.reduce((a, l) => a + l._count.projects, 0),
      },
      recentHistories: recent.map((h) => ({
        id: h.id, companyId: h.companyId, companyName: h.company.name,
        professor: h.professor || '', contactDate: h.contactDate,
        method: h.method || '', content: h.content || '', histStatus: h.histStatus,
      })),
    } satisfies DashboardData);
  });
}
