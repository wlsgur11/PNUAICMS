/**
 * POST /api/swcu/import — SW중심대학 정량실적 엑셀 업로드.
 *  ?dryRun=1 : 파싱 결과만 반환(미저장, 미리보기용)
 *  본 요청   : 해당 연도 전체교체 적재
 */
export const runtime = 'nodejs';
export const maxDuration = 120;

import { requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/http';
import { readSheets } from '@/lib/records-xlsx';
import { parseSwcu } from '@/lib/swcu-parse';
import { importSwcu } from '@/lib/swcu-import';

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return fail('파일이 첨부되지 않았습니다.', 400);
    const fileName = file instanceof File ? file.name : undefined;
    const buf = await file.arrayBuffer();
    const parsed = parseSwcu(readSheets(buf), fileName);
    if (dryRun) {
      return ok({
        year: parsed.year,
        university: parsed.university,
        submittedAt: parsed.submittedAt,
        indicators: parsed.indicators,
        rawCount: parsed.raws.length,
      });
    }
    const summary = await importSwcu(parsed);
    return ok(summary);
  });
}
