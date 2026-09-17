/**
 * POST /api/students/:studentNo/counselings — 상담 추가
 *
 * 상담이 이 시스템의 주 업무다. 전에는 학생 정보 수정 폼 안에서만 넣을 수 있었고
 * 저장할 때 그 학생 상담을 통째로 지우고 다시 넣는 방식이라, 두 사람이 같은 학생을
 * 열어 두면 나중에 저장한 쪽이 앞사람 상담을 지웠다. 기업 컨택 이력처럼 한 건씩 다룬다.
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { counselingSchema } from '@/lib/validation';

type Ctx = { params: { studentNo: string } };

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const parsed = counselingSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);

    const exists = await prisma.student.findUnique({ where: { studentNo: params.studentNo }, select: { studentNo: true } });
    if (!exists) return fail('학생을 찾을 수 없습니다.', 404);

    const c = await prisma.counseling.create({
      data: {
        studentNo: params.studentNo,
        counselDate: parsed.data.counselDate,
        counselor: parsed.data.counselor || null,
        content: parsed.data.content || null,
        createdBy: user.email,
      },
    });
    return ok(c, { status: 201 });
  });
}
