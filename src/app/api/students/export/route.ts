/** GET /api/students/export — 학생 목록 엑셀. 쿼리는 /api/students 와 동일 의미. */
export const runtime = 'nodejs';

import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { studentWhere, studentOrderBy } from '@/lib/list-filters';
import { gradeLabel } from '@/lib/enums';

export async function GET(req: Request) {
  await requireRole('ADMIN');
  const sp = new URL(req.url).searchParams;
  const items = await prisma.student.findMany({
    where: studentWhere(sp),
    orderBy: studentOrderBy(sp),
    include: { _count: { select: { counselings: true } } },
  });

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('학생목록');
  ws.columns = [
    { header: '학번', key: 'no', width: 14 },
    { header: '이름', key: 'name', width: 12 },
    { header: '학과', key: 'dept', width: 16 },
    { header: '전공', key: 'major', width: 16 },
    { header: '학년', key: 'grade', width: 8 },
    { header: '진로희망', key: 'career', width: 16 },
    { header: '동아리', key: 'clubs', width: 20 },
    { header: '상담횟수', key: 'counsel', width: 10 },
    { header: '재학/졸업', key: 'status', width: 10 },
  ];
  for (const s of items) {
    ws.addRow({
      no: s.studentNo,
      name: s.name || s.nameMasked || '',
      dept: s.department ?? '',
      major: s.major ?? '',
      grade: gradeLabel(s.grade),
      career: s.careerGoal ?? '',
      clubs: s.clubs.join(', '),
      counsel: s._count.counselings,
      status: s.graduationDate ? '졸업' : '재학',
    });
  }
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="students_${today}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
