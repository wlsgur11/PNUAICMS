/**
 * GET /api/career-surveys
 *  ?studentNo=  : 그 학생의 연도별 응답(학생 상세)
 *  ?year=&dept= : 연도별 응답 목록과 문항별 집계(진로조사 화면). year 를 빼면 가장 최근 해
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { summarize, type Answer } from '@/lib/career-survey';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handle(async () => {
    await requireRole('ADMIN');
    const sp = new URL(req.url).searchParams;

    const studentNo = sp.get('studentNo');
    if (studentNo) {
      const rows = await prisma.careerSurvey.findMany({ where: { studentNo }, orderBy: { year: 'desc' } });
      return ok(rows.map((r) => ({ year: r.year, submittedAt: r.submittedAt, answers: r.answers as Answer[] })));
    }

    const years = (await prisma.careerSurvey.groupBy({ by: ['year'], _count: true, orderBy: { year: 'desc' } }))
      .map((y) => ({ year: y.year, count: y._count }));
    const year = Number(sp.get('year')) || years[0]?.year;
    if (!year) return ok({ years, year: null, departments: [], rows: [], stats: [], linked: 0 });

    const all = await prisma.careerSurvey.findMany({ where: { year }, orderBy: { studentNo: 'asc' } });
    const departments = [...new Set(all.map((r) => r.department ?? '미기재'))].sort();
    const dept = sp.get('dept');
    const rows = dept ? all.filter((r) => (r.department ?? '미기재') === dept) : all;

    const known = new Set((await prisma.student.findMany({
      where: { studentNo: { in: rows.map((r) => r.studentNo) } }, select: { studentNo: true },
    })).map((s) => s.studentNo));

    // 문항 순서는 엑셀 열 순서. 빈 칸은 저장하지 않아 사람마다 빠진 문항이 있어 여러 사람 것을 이어 붙인다
    const answers = rows.map((r) => r.answers as Answer[]);
    const order: string[] = [];
    for (const as of answers) {
      as.forEach((a, i) => {
        if (order.includes(a.q)) return;
        // 처음 보는 문항은 이 사람이 바로 앞에 답한 문항 뒤에 끼운다
        const prev = i > 0 ? order.indexOf(as[i - 1].q) : -1;
        order.splice(prev + 1, 0, a.q);
      });
    }

    return ok({
      years, year, departments, linked: known.size,
      rows: rows.map((r) => ({
        studentNo: r.studentNo, nameMasked: r.nameMasked, department: r.department, grade: r.grade,
        submittedAt: r.submittedAt, inCms: known.has(r.studentNo), answers: r.answers as Answer[],
      })),
      stats: summarize(order, answers),
    });
  });
}
