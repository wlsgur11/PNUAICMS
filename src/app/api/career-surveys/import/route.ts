/**
 * POST /api/career-surveys/import — 진로현황 조사(구글폼 응답) 엑셀 업로드.
 *  ?dryRun=1 : 읽은 결과만 돌려준다(미리보기)
 *  본 요청   : form 의 year 로 그 연도 응답 전체를 교체한다
 */
export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle, MAX_UPLOAD_BYTES } from '@/lib/http';
import { readSheets } from '@/lib/records-xlsx';
import { parseSurvey } from '@/lib/career-survey';

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return fail('파일이 첨부되지 않았습니다.', 400);
    if (file.size > MAX_UPLOAD_BYTES) return fail('파일이 너무 큽니다. 최대 10MB까지 업로드할 수 있습니다.', 413);
    const parsed = parseSurvey(readSheets(await file.arrayBuffer()), file instanceof File ? file.name : undefined);
    if (parsed.rows.length === 0) return fail('응답을 찾지 못했습니다.', 400);

    const depts = new Map<string, number>();
    for (const r of parsed.rows) depts.set(r.department ?? '미기재', (depts.get(r.department ?? '미기재') ?? 0) + 1);
    const linked = await prisma.student.count({ where: { studentNo: { in: parsed.rows.map((r) => r.studentNo) } } });
    if (dryRun) {
      return ok({
        year: parsed.year, count: parsed.rows.length, skipped: parsed.skipped, linked,
        departments: [...depts.entries()].map(([label, count]) => ({ label, count })),
        questions: parsed.questions,
      });
    }

    const year = Number(form.get('year'));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail('연도를 확인해 주세요.', 400);
    await prisma.$transaction([
      prisma.careerSurvey.deleteMany({ where: { year } }),
      prisma.careerSurvey.createMany({
        data: parsed.rows.map((r) => ({ ...r, year, createdBy: user.email })),
      }),
    ]);
    return ok({ year, count: parsed.rows.length, linked });
  });
}
