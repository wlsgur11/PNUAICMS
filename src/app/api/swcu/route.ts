/**
 * GET /api/swcu — 전 연도 성과지표 + 총괄 원시값 (대시보드용). 연도 오름차순.
 */
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';

// 항상 라이브 DB로 조회 (AUTH_BYPASS=true 시 정적 캐시되어 옛 값이 굳는 것 방지)
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await requireRole('ADMIN');
    const years = await prisma.swcuYear.findMany({
      orderBy: { year: 'asc' },
      include: {
        indicators: { orderBy: { sortOrder: 'asc' } },
        raws: { orderBy: [{ scope: 'desc' }, { sortOrder: 'asc' }] },
      },
    });
    return ok(years);
  });
}
