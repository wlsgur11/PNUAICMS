/**
 * GET /api/year-stats — 연도별 정량실적 현황판 값 (엑셀 전체현황 시트 기반)
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';

// 항상 라이브 DB로 조회 (AUTH_BYPASS=true 시 정적 캐시되어 옛 값이 굳는 것 방지)
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await requireUser();
    const stats = await prisma.yearStat.findMany({ orderBy: { year: 'desc' } });
    return ok(stats);
  });
}
