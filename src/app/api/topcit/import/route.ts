/**
 * POST /api/topcit/import — TOPCIT 회차별 등록접수자 엑셀(.xls, .xlsx) 업로드.
 *  ?dryRun=1 : 읽은 결과만 돌려준다(미리보기)
 *  본 요청   : 그 회차 결과 전체를 교체한다
 */
export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ok, fail, handle, MAX_UPLOAD_BYTES } from '@/lib/http';
import { parseTopcit, readXlsRows, matchStudents } from '@/lib/topcit';

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireRole('ADMIN');
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return fail('파일이 첨부되지 않았습니다.', 400);
    if (file.size > MAX_UPLOAD_BYTES) return fail('파일이 너무 큽니다. 최대 10MB까지 업로드할 수 있습니다.', 413);
    const parsed = parseTopcit(readXlsRows(await file.arrayBuffer()), file instanceof File ? file.name : undefined);
    if (!parsed.round) return fail('회차를 찾지 못했습니다. 평가명 열이나 파일 이름에 "19회" 처럼 회차가 있어야 합니다.', 400);
    if (parsed.rows.length === 0) return fail('응시자를 찾지 못했습니다.', 400);

    const students = await prisma.student.findMany({
      where: { phone: { not: null } }, select: { studentNo: true, name: true, nameMasked: true, phone: true },
    });
    const matched = matchStudents(parsed.rows, students);
    const summary = {
      round: parsed.round, examDate: parsed.examDate, registered: parsed.rows.length,
      attended: parsed.rows.filter((r) => r.attended).length, linked: matched.filter(Boolean).length,
    };
    if (dryRun) return ok(summary);

    const round = parsed.round;
    await prisma.$transaction([
      prisma.topcitResult.deleteMany({ where: { round } }),
      prisma.topcitResult.createMany({
        data: parsed.rows.map((r, i) => ({
          // 집계(추이)에는 전원이 들어가고, 개인을 알아볼 칸은 CMS 학생과 이어진 사람만 남긴다
          round, examDate: parsed.examDate, examNo: r.examNo, nameMasked: matched[i] ? r.nameMasked : null,
          affiliation: matched[i] ? r.affiliation : null, occupation: r.occupation, attended: r.attended,
          level: r.level, total: r.total, scores: r.scores, studentNo: matched[i], createdBy: user.email,
        })),
        skipDuplicates: true,
      }),
    ]);
    return ok(summary);
  });
}
