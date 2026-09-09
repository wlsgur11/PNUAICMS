/**
 * GET  /api/companies/:id/histories — 컨택이력 목록
 * POST /api/companies/:id/histories — 컨택이력 추가 (+실무자 최근컨택일 동기화)
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle, AppError } from '@/lib/http';
import { nextCode } from '@/lib/codes';
import { historyCreateSchema } from '@/lib/validation';
import { syncLastContact } from '@/lib/contact-sync';

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
      // personId 는 클라이언트가 보낸 값이라 이 기업 소속인지 확인한다.
      // (확인 없이 쓰면 다른 기업 실무자의 최근컨택일이 바뀐다)
      if (personId) {
        const person = await tx.contactPerson.findUnique({ where: { id: personId }, select: { companyId: true } });
        if (!person || person.companyId !== params.id) throw new AppError('이 기업의 실무자가 아닙니다.');
      }
      const code = await nextCode(tx, 'history');
      const h = await tx.contactHistory.create({
        data: { code, companyId: params.id, personId: personId || null, ...rest, createdBy: user.email },
      });
      // 최근컨택일은 남은 이력에서 다시 계산한다(과거 날짜를 넣어도 후퇴하지 않는다).
      await syncLastContact(tx, personId);
      return h;
    });
    return ok(history, { status: 201 });
  });
}
