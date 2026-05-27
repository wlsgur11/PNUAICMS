/**
 * GET /api/lookup?name=...
 *  → 외부 API(네이버/DART)로 기업 정보 자동조회. (서버에서만 키 사용)
 * 등록 폼의 "자동 채움" 버튼이 호출.
 */
import { requireUser } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { lookupCompany, lookupEnabled } from '@/lib/lookup';

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser();
    const name = new URL(req.url).searchParams.get('name')?.trim();
    if (!name) return ok({ enabled: lookupEnabled(), sources: [] });
    const result = await lookupCompany(name);
    return ok(result);
  });
}
