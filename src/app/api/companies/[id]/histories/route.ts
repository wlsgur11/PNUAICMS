/**
 * GET  /api/companies/:id/histories — 컨택이력 목록
 * POST /api/companies/:id/histories — 컨택이력 추가 (+실무자 최근컨택일 동기화)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { nextCode } from '@/lib/codes';
import { historyCreateSchema } from '@/lib/validation';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const histories = await prisma.contactHistory.findMany({
      where: { companyId: params.id },
      orderBy: { contactDate: 'desc' },
      include: { person: { select: { name: true } } },
    });
    return ok(histories);
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const parsed = historyCreateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);
    const { personId, ...rest } = parsed.data;

    const history = await prisma.$transaction(async (tx) => {
      const code = await nextCode(tx, 'history');
      const h = await tx.contactHistory.create({
        data: { code, companyId: params.id, personId: personId || null, ...rest, createdBy: user.email },
      });
      // 컨택이력 추가 시 해당 실무자의 최근컨택일 갱신 (편의)
      if (personId) {
        await tx.contactPerson.update({ where: { id: personId }, data: { lastContactAt: rest.contactDate } });
      }
      return h;
    });
    return ok(history, { status: 201 });
  });
}
