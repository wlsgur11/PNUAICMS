/**
 * GET /api/projects/export — 현재 필터 조건의 산학협력 프로젝트 목록을 .xlsx 로.
 *  쿼리 파라미터는 GET /api/projects 와 동일. 참여학생은 마스킹 이름.
 */
export const runtime = 'nodejs';

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { projectWhere, maskName } from '@/lib/list-filters';

export async function GET(req: Request) {
  await requireUser();
  const sp = new URL(req.url).searchParams;
  const items = await prisma.project.findMany({
    where: projectWhere(sp),
    orderBy: [{ year: 'desc' }, { dept: 'asc' }],
    include: {
      company: { select: { name: true } },
      lab: { select: { professorName: true, labName: true } },
      students: { include: { student: { select: { nameMasked: true } } } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('산학협력현황');
  ws.columns = [
    { header: '연도', key: 'year', width: 8 },
    { header: '구분', key: 'category', width: 12 },
    { header: '학과', key: 'dept', width: 8 },
    { header: '유형', key: 'type', width: 12 },
    { header: '지도교수', key: 'prof', width: 12 },
    { header: '연구실', key: 'lab', width: 20 },
    { header: '연구주제', key: 'title', width: 40 },
    { header: '참여기업', key: 'company', width: 22 },
    { header: '참여학생', key: 'students', width: 28 },
  ];
  for (const it of items) {
    const named = it.students.map((s) => s.student.nameMasked).filter(Boolean);
    const raws = it.studentNamesRaw ? it.studentNamesRaw.split(',').filter(Boolean).map(maskName) : [];
    ws.addRow({
      year: it.year ?? '', category: it.category ?? '', dept: it.dept ?? '', type: it.type ?? '',
      prof: it.lab?.professorName ?? '', lab: it.lab?.labName ?? '', title: it.title ?? '',
      company: it.company?.name ?? it.companyNameRaw ?? '', students: [...named, ...raws].join(', '),
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
      'Content-Disposition': `attachment; filename="projects_${today}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
