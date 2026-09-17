/**
 * GET /api/projects/:id — 상세 정보 (년도, 구분, 유형, 연구기간, 특성화트랙, 지도교수, 연구실, 참여기업, 참여학생)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const it = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        lab: { select: { professorName: true, labName: true } },
        students: { include: { student: { select: { studentNo: true, name: true, nameMasked: true } } } },
      },
    });
    if (!it) return fail('프로젝트를 찾을 수 없습니다.', 404);

    const named = it.students
      .map((s) => ({ studentNo: s.student.studentNo, studentName: s.student.name || s.student.nameMasked || '' }))
      .filter((s) => !!s.studentName);
    const raws = it.studentNamesRaw
      ? it.studentNamesRaw.split(',').map((n) => ({ studentNo: null, studentName: n.trim() })).filter((s) => !!s.studentName)
      : [];

    const row = {
      id: it.id,
      year: it.year,
      dept: it.dept,
      category: it.category,
      type: it.type,
      title: it.title,
      period: it.period,
      track: it.track,
      professorName: it.lab?.professorName ?? null,
      labName: it.lab?.labName ?? null,
      companyId: it.company?.id ?? null,
      companyName: it.company?.name ?? it.companyNameRaw ?? '-',
      students: [...named, ...raws],
    };

    return ok(row);
  });
}
