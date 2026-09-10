/**
 * PUT    /api/histories/:id — 컨택이력 수정 (낙관적 락)
 * DELETE /api/histories/:id — 컨택이력 삭제 (hard delete; 이력은 soft delete 대상 아님)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { historyUpdateSchema } from '@/lib/validation';
import { syncLastContact } from '@/lib/contact-sync';

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const parsed = historyUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const { version, personId, ...rest } = parsed.data;

    // 실무자가 바뀌면 이전 실무자의 최근컨택일도 다시 계산해야 하므로 미리 읽어 둔다.
    const before = await prisma.contactHistory.findUnique({
      where: { id: params.id },
      select: { personId: true, companyId: true },
    });
    if (!before) return fail('컨택이력을 찾을 수 없습니다.', 404);
    if (personId) {
      const person = await prisma.contactPerson.findUnique({ where: { id: personId }, select: { companyId: true } });
      if (!person || person.companyId !== before.companyId) return fail('이 기업의 실무자가 아닙니다.', 400);
    }

    const result = await prisma.contactHistory.updateMany({
      where: { id: params.id, version },
      data: { ...rest, personId: personId || null, version: { increment: 1 } },
    });
    if (result.count === 0) {
      return fail('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.', 409);
    }
    // 컨택일자나 담당 실무자가 바뀌었을 수 있다. 이전, 이후 실무자 양쪽을 다시 계산한다.
    for (const pid of new Set([before.personId, personId || null])) {
      await syncLastContact(prisma, pid);
    }
    const updated = await prisma.contactHistory.findUnique({ where: { id: params.id } });
    return ok(updated);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const before = await prisma.contactHistory.findUnique({
      where: { id: params.id },
      select: { personId: true },
    });
    await prisma.contactHistory.delete({ where: { id: params.id } });
    // 지운 이력이 마지막 컨택이었을 수 있다.
    await syncLastContact(prisma, before?.personId ?? null);
    return ok({ deleted: true });
  });
}
