/**
 * GET /api/topcit
 *  ?studentNo= : 그 학생의 회차별 결과(학생 상세)
 *  ?round=     : 회차별 요약, 그 회차의 수준 분포와 영역 평균, CMS 학생과 이어진 응시자 목록. round 를 빼면 가장 최근 회차
 *  집계는 전원 기준이고 개인 목록은 CMS 학생만 보여 준다(결과 공유용, 2026-11-26 결정)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import type { AreaScore } from '@/lib/topcit';

export const dynamic = 'force-dynamic';

const avg = (ns: number[]) => (ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : null);

export async function GET(req: Request) {
  return handle(async () => {
    await requireRole('ADMIN');
    const sp = new URL(req.url).searchParams;

    const studentNo = sp.get('studentNo');
    if (studentNo) {
      const rows = await prisma.topcitResult.findMany({ where: { studentNo }, orderBy: { round: 'desc' } });
      return ok(rows.map((r) => ({ round: r.round, examDate: r.examDate, attended: r.attended, level: r.level, total: r.total })));
    }

    const all = await prisma.topcitResult.findMany({ orderBy: [{ round: 'desc' }, { total: 'desc' }] });
    const roundNos = [...new Set(all.map((r) => r.round))];
    const rounds = roundNos.map((round) => {
      const rs = all.filter((r) => r.round === round);
      const att = rs.filter((r) => r.attended);
      return {
        round, examDate: rs[0].examDate, registered: rs.length, attended: att.length,
        avgTotal: avg(att.map((r) => r.total ?? 0)),
        level3Up: att.filter((r) => (r.level ?? 0) >= 3).length,
      };
    });
    const round = Number(sp.get('round')) || roundNos[0];
    if (!round) return ok({ rounds, round: null, rows: [], levels: [], areas: [] });

    const rs = all.filter((r) => r.round === round);
    const att = rs.filter((r) => r.attended);
    // 아무도 없는 양 끝 수준은 자른다(사이에 빈 수준은 남겨 분포 모양을 유지)
    const all5 = [1, 2, 3, 4, 5].map((lv) => ({ label: `수준 ${lv}`, count: att.filter((r) => r.level === lv).length }));
    const lo = all5.findIndex((x) => x.count > 0);
    const hi = all5.length - 1 - [...all5].reverse().findIndex((x) => x.count > 0);
    const levels = lo < 0 ? [] : all5.slice(lo, hi + 1);
    const areaNames: string[] = [];
    for (const r of att) for (const s of r.scores as AreaScore[]) if (!areaNames.includes(s.area)) areaNames.push(s.area);
    const areas = areaNames.map((area) => ({
      label: area,
      count: avg(att.flatMap((r) => (r.scores as AreaScore[]).filter((s) => s.area === area).map((s) => s.score))) ?? 0,
    }));

    return ok({
      rounds, round, levels, areas,
      rows: rs.filter((r) => r.studentNo).map((r) => ({
        examNo: r.examNo, nameMasked: r.nameMasked, affiliation: r.affiliation, occupation: r.occupation,
        attended: r.attended, level: r.level, total: r.total, studentNo: r.studentNo,
      })),
    });
  });
}
