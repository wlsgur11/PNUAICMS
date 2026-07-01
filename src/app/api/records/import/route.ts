/**
 * POST /api/records/import — 실적 엑셀(.xlsx) 업로드 → Project/Internship 전체 교체 적재.
 */
export const runtime = 'nodejs';
export const maxDuration = 120;

import { requireRole } from '@/lib/auth';
import { ok, fail, handle, MAX_UPLOAD_BYTES } from '@/lib/http';
import { prisma } from '@/lib/db';
import { readSheets } from '@/lib/records-xlsx';
import { parseSheets } from '@/lib/records-parse';
import { importRecords } from '@/lib/records-import';

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
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

    // 원본 xlsx 보관(kind별 최신 1건 유지) — 재다운로드용. 실패해도 적재 결과는 유지한다.
    try {
      const filename = file instanceof File && file.name ? file.name : '산학인턴_정량실적.xlsx';
      await prisma.$transaction([
        prisma.uploadedFile.deleteMany({ where: { kind: 'records' } }),
        prisma.uploadedFile.create({
          data: {
            kind: 'records',
            filename,
            mimeType: file.type || null,
            size: buf.byteLength,
            data: Buffer.from(buf),
            uploadedBy: user.email,
          },
        }),
      ]);
    } catch (e) {
      console.error('[records/import] 원본 보관 실패(적재는 완료)', e);
    }

    return ok(summary);
  });
}
