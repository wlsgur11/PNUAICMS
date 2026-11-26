/**
 * GET /api/topcit
 *  ?studentNo= : 그 학생의 회차별 결과(학생 상세)
 *  그 밖       : 회차별 요약, 수준 분포, 영역 평균, CMS 학생과 이어진 응시자 목록(전 회차 한 번에, 830명 수준이라 가볍다)
 *  집계는 전원 기준이고 개인 목록은 CMS 학생만 보여 준다(결과 공유용, 2026-11-26 결정)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import type { AreaScore } from '@/lib/topcit';

export const dynamic = 'force-dynamic';

type Result = Awaited<ReturnType<typeof prisma.topcitResult.findMany>>[number];
const avg = (ns: number[]) => (ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : null);

/** 수준 1~5 인원. 아무도 없는 양 끝 수준은 자른다(사이에 빈 수준은 남겨 분포 모양을 유지) */
function levelDist(att: Result[]) {
  const all5 = [1, 2, 3, 4, 5].map((lv) => ({ label: `수준 ${lv}`, count: att.filter((r) => r.level === lv).length }));
  const lo = all5.findIndex((x) => x.count > 0);
  if (lo < 0) return [];
  const hi = all5.length - 1 - [...all5].reverse().findIndex((x) => x.count > 0);
  return all5.slice(lo, hi + 1);
}

export async function GET(req: Request) {
  return handle(async () => {
    await requireRole('ADMIN');
    const studentNo = new URL(req.url).searchParams.get('studentNo');
    if (studentNo) {
      const rows = await prisma.topcitResult.findMany({ where: { studentNo }, orderBy: { round: 'desc' } });
      return ok(rows.map((r) => ({ round: r.round, examDate: r.examDate, attended: r.attended, level: r.level, total: r.total })));
    }

    const all = await prisma.topcitResult.findMany({ orderBy: [{ round: 'desc' }, { total: 'desc' }] });
    const rounds = [...new Set(all.map((r) => r.round))].map((round) => {
      const rs = all.filter((r) => r.round === round);
      const att = rs.filter((r) => r.attended);
      const areaNames: string[] = [];
      for (const r of att) for (const s of r.scores as AreaScore[]) if (!areaNames.includes(s.area)) areaNames.push(s.area);
      return {
        round,
        examDate: rs[0].examDate,
        year: Number(rs[0].examDate?.slice(0, 4)) || null,
        registered: rs.length,
        attended: att.length,
        avgTotal: avg(att.map((r) => r.total ?? 0)),
        level3Up: att.filter((r) => (r.level ?? 0) >= 3).length,
        levels: levelDist(att),
        areas: areaNames.map((area) => ({
          label: area,
          count: avg(att.flatMap((r) => (r.scores as AreaScore[]).filter((s) => s.area === area).map((s) => s.score))) ?? 0,
        })),
        students: rs.filter((r) => r.studentNo).map((r) => ({
          studentNo: r.studentNo!, nameMasked: r.nameMasked, affiliation: r.affiliation, occupation: r.occupation,
          attended: r.attended, level: r.level, total: r.total,
        })),
      };
    });
    const attAll = all.filter((r) => r.attended);
    return ok({ rounds, overall: { attended: attAll.length, levels: levelDist(attAll), level3Up: attAll.filter((r) => (r.level ?? 0) >= 3).length } });
  });
}
