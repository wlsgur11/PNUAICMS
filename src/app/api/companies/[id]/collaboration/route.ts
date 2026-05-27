/**
 * PUT /api/companies/:id/collaboration — 협업정보(1:1) upsert (낙관적 락)
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { collaborationSchema } from '@/lib/validation';

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireUser();
    const parsed = collaborationSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const { version, ...data } = parsed.data;

    const existing = await prisma.collaboration.findUnique({ where: { companyId: params.id } });
    if (!existing) {
      const created = await prisma.collaboration.create({ data: { companyId: params.id, ...data } });
      return ok(created);
    }
    if (version != null && existing.version !== version) {
      return fail('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.', 409);
    }
    const updated = await prisma.collaboration.update({
      where: { companyId: params.id },
      data: { ...data, version: { increment: 1 } },
    });
    return ok(updated);
  });
}
