/**
 * PUT    /api/persons/:id — 실무자 수정 (낙관적 락)
 * DELETE /api/persons/:id — soft delete
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { personUpdateSchema } from '@/lib/validation';

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const parsed = personUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const { version, ...data } = parsed.data;

    const result = await prisma.contactPerson.updateMany({
      where: { id: params.id, version },
      data: { ...data, updatedBy: user.email, version: { increment: 1 } },
    });
    if (result.count === 0) return fail('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.', 409);
    const updated = await prisma.contactPerson.findUnique({ where: { id: params.id } });
    return ok(updated);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireUser();
    await prisma.contactPerson.update({ where: { id: params.id }, data: { isActive: false, version: { increment: 1 } } });
    return ok({ deactivated: true });
  });
}
