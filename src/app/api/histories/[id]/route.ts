/**
 * PUT    /api/histories/:id — 컨택이력 수정 (낙관적 락)
 * DELETE /api/histories/:id — 컨택이력 삭제 (hard delete; 이력은 soft delete 대상 아님)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { historyUpdateSchema } from '@/lib/validation';

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const parsed = historyUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const { version, personId, ...rest } = parsed.data;

    const result = await prisma.contactHistory.updateMany({
      where: { id: params.id, version },
      data: { ...rest, personId: personId || null, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const exists = await prisma.contactHistory.findUnique({ where: { id: params.id }, select: { id: true } });
      if (!exists) return fail('컨택이력을 찾을 수 없습니다.', 404);
      return fail('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.', 409);
    }
    const updated = await prisma.contactHistory.findUnique({ where: { id: params.id } });
    return ok(updated);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    await prisma.contactHistory.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  });
}
