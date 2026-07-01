/**
 * GET /api/records/original — 최근 업로드한 실적 엑셀 원본.
 *  - ?meta=1 : { filename, size, createdAt, uploadedBy } | null (다운로드 버튼 노출·파일명 표시용)
 *  - (기본)  : 원본 xlsx 바이너리 다운로드 (attachment)
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requireRole } from '@/lib/auth';
import { ok, handle } from '@/lib/http';
import { prisma } from '@/lib/db';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET(req: Request) {
  const wantMeta = new URL(req.url).searchParams.get('meta') === '1';

  // 메타 요청: 공용 JSON 규약(ok/handle) 사용
  if (wantMeta) {
    return handle(async () => {
      await requireRole('ADMIN');
      const f = await prisma.uploadedFile.findFirst({
        where: { kind: 'records' },
        orderBy: { createdAt: 'desc' },
        select: { filename: true, size: true, createdAt: true, uploadedBy: true },
      });
      return ok(f);
    });
  }

  // 파일 다운로드: 바이너리라 ok() 대신 raw Response. 권한 오류만 직접 처리.
  try {
    await requireRole('ADMIN');
  } catch (e) {
    const forbidden = (e as Error)?.name === 'ForbiddenError';
    return new Response(forbidden ? '접근 권한이 없습니다.' : '로그인이 필요합니다.', {
      status: forbidden ? 403 : 401,
    });
  }

  const f = await prisma.uploadedFile.findFirst({
    where: { kind: 'records' },
    orderBy: { createdAt: 'desc' },
  });
  if (!f) return new Response('보관된 원본 파일이 없습니다.', { status: 404 });

  const encoded = encodeURIComponent(f.filename);
  return new Response(new Uint8Array(f.data), {
    headers: {
      'Content-Type': f.mimeType || XLSX_MIME,
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Content-Length': String(f.data.length),
      'Cache-Control': 'no-store',
    },
  });
}
