/**
 * POST /api/records/import — 실적 엑셀(.xlsx) 업로드 → Project/Internship 전체 교체 적재.
 */
export const runtime = 'nodejs';
export const maxDuration = 120;

import { requireUser } from '@/lib/auth';
import { ok, fail, handle, MAX_UPLOAD_BYTES } from '@/lib/http';
import { readSheets } from '@/lib/records-xlsx';
import { parseSheets } from '@/lib/records-parse';
import { importRecords } from '@/lib/records-import';

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const len = Number(req.headers.get('content-length') ?? 0);
    if (len > MAX_UPLOAD_BYTES) return fail('파일이 너무 큽니다. 최대 10MB까지 업로드할 수 있습니다.', 413);
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return fail('파일이 첨부되지 않았습니다.', 400);
    if (file.size > MAX_UPLOAD_BYTES) return fail('파일이 너무 큽니다. 최대 10MB까지 업로드할 수 있습니다.', 413);
    const buf = await file.arrayBuffer();
    let parsed;
    try {
      parsed = parseSheets(readSheets(buf));
    } catch {
      return fail('엑셀(.xlsx) 파일을 읽지 못했습니다. 양식과 형식을 확인해 주세요.', 400);
    }
    if (parsed.projects.length === 0 && parsed.internships.length === 0) {
      return fail('적재할 데이터를 찾지 못했습니다. 시트 구조를 확인하세요.', 400);
    }
    const summary = await importRecords(parsed);
    return ok(summary);
  });
}
