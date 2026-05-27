/**
 * GET /api/companies/check-duplicate?name=...
 *  → { duplicate: boolean, match?: {id, code, name} }
 * 신규 등록 폼에서 기관명 입력 즉시 호출 (v1의 중복체크 이식)
 */
import { prisma } from '@/lib/db';
import { ok, handle } from '@/lib/http';

export async function GET(req: Request) {
  return handle(async () => {
    const name = new URL(req.url).searchParams.get('name')?.trim();
    if (!name) return ok({ duplicate: false });
    const match = await prisma.company.findUnique({
      where: { name },
      select: { id: true, code: true, name: true },
    });
    return ok({ duplicate: !!match, match: match ?? undefined });
  });
}
