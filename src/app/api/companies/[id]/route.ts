/**
 * GET    /api/companies/:id  — 통합 프로필 (기본정보+협업+실무자+컨택이력)
 * PUT    /api/companies/:id  — 수정 (낙관적 락: version 불일치 시 409)
 * DELETE /api/companies/:id  — soft delete (isActive=false). ?hard=1 이면 실제 삭제
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { companyUpdateSchema } from '@/lib/validation';
import { maskName } from '@/lib/list-filters';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireUser();
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        collaboration: true,
        persons: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        histories: {
          orderBy: { contactDate: 'desc' },
          include: { person: { select: { name: true } } },
        },
        projects: { include: { students: { include: { student: { select: { studentNo: true, name: true, nameMasked: true } } } } } },
        internships: { include: { students: { include: { student: { select: { studentNo: true, name: true, nameMasked: true } } } } } },
      },
    });
    if (!company) return fail('기업을 찾을 수 없습니다.', 404);

    // 산학·인턴십 참여 학생 dedup (마스킹). 연결 A.
    const seen = new Map<string, { studentNo: string; nameMasked: string }>();
    const add = (st: { studentNo: string; name: string | null; nameMasked: string | null }) => {
      if (!seen.has(st.studentNo)) seen.set(st.studentNo, { studentNo: st.studentNo, nameMasked: st.name ? maskName(st.name) : (st.nameMasked || '-') });
    };
    for (const p of company.projects) for (const ps of p.students) add(ps.student);
    for (const it of company.internships) for (const is of it.students) add(is.student);
    const participatingStudents = [...seen.values()];

    // projects/internships 원시 배열은 응답 비대화를 막기 위해 제외하고 참여 학생만 추가
    const { projects: _p, internships: _i, ...rest } = company;
    return ok({ ...rest, participatingStudents });
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json();
    const parsed = companyUpdateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const { version, autoLookup: _ignore, ...data } = parsed.data;

    // 낙관적 락: 현재 version 과 일치할 때만 갱신 + version 증가
    const result = await prisma.company.updateMany({
      where: { id: params.id, version },
      data: { ...data, updatedBy: user.email, version: { increment: 1 } },
    });
    if (result.count === 0) {
      // id 가 없거나, version 이 달라짐(=다른 사용자가 먼저 수정)
      const exists = await prisma.company.findUnique({ where: { id: params.id }, select: { id: true } });
      if (!exists) return fail('기업을 찾을 수 없습니다.', 404);
      return fail('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.', 409);
    }
    const updated = await prisma.company.findUnique({ where: { id: params.id } });
    return ok(updated);
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireUser();
    const hard = new URL(req.url).searchParams.get('hard') === '1';
    if (hard) {
      await prisma.company.delete({ where: { id: params.id } });
      return ok({ deleted: true });
    }
    // 기본: soft delete (관계 무결성 보존)
    await prisma.company.update({ where: { id: params.id }, data: { isActive: false, version: { increment: 1 } } });
    return ok({ deactivated: true });
  });
}
