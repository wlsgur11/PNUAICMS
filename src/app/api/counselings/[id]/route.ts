/**
 * PUT    /api/counselings/:id — 상담 수정
 * DELETE /api/counselings/:id — 상담 삭제 (실제 삭제. 컨택 이력과 같은 규약)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { counselingSchema } from '@/lib/validation';

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const parsed = counselingSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);

    const exists = await prisma.counseling.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!exists) return fail('상담 기록을 찾을 수 없습니다.', 404);

    const updated = await prisma.counseling.update({
      where: { id: params.id },
      data: {
        counselDate: parsed.data.counselDate,
        counselor: parsed.data.counselor || null,
        content: parsed.data.content || null,
      },
    });
    return ok(updated);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const exists = await prisma.counseling.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!exists) return fail('상담 기록을 찾을 수 없습니다.', 404);
    await prisma.counseling.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  });
}
