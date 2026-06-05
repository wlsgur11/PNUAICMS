/**
 * GET /api/year-stats — 연도별 정량실적 현황판 값 (엑셀 전체현황 시트 기반)
 */
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';

export async function GET() {
  return handle(async () => {
    await requireUser();
    const stats = await prisma.yearStat.findMany({ orderBy: { year: 'desc' } });
    return ok(stats);
  });
}
