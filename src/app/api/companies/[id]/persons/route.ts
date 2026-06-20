/**
 * GET  /api/companies/:id/persons — 실무자 목록
 * POST /api/companies/:id/persons — 실무자 추가
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { nextCode } from '@/lib/codes';
import { personCreateSchema } from '@/lib/validation';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole('ADMIN');
    const persons = await prisma.contactPerson.findMany({
      where: { companyId: params.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return ok(persons);
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const parsed = personCreateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력값 오류', 422);

    const person = await prisma.$transaction(async (tx) => {
      const code = await nextCode(tx, 'person');
      return tx.contactPerson.create({ data: { code, companyId: params.id, ...parsed.data, createdBy: user.email } });
    });
    return ok(person, { status: 201 });
  });
}
