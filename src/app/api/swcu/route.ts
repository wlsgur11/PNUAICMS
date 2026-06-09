/**
 * GET /api/swcu — 전 연도 성과지표 + 총괄 원시값 (대시보드용). 연도 오름차순.
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';

export async function GET() {
  return handle(async () => {
    await requireUser();
    const years = await prisma.swcuYear.findMany({
      orderBy: { year: 'asc' },
      include: {
        indicators: { orderBy: { sortOrder: 'asc' } },
        raws: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return ok(years);
  });
}
