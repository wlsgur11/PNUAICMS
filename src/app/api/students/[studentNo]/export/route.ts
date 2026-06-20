/** GET /api/students/:studentNo/export — 개별 학생 상세 엑셀 (실명, 행정 보고용). */
export const runtime = 'nodejs';

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { toProgramMap } from '@/lib/student-shape';

type Ctx = { params: { studentNo: string } };

export async function GET(_req: Request, { params }: Ctx) {
  await requireRole('ADMIN');
  const s = await prisma.student.findUnique({
    where: { studentNo: params.studentNo },
    include: {
      counselings: { orderBy: { counselDate: 'asc' } },
      projects: { include: { project: { include: { company: { select: { name: true } }, lab: { select: { professorName: true } } } } } },
      manualInternships: { orderBy: { activityDate: 'asc' } },
    },
  });
  if (!s) return new Response('not found', { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('학생상세');
  const sw = toProgramMap(s.swPrograms);
  const bc = toProgramMap(s.bootcampPrograms);
  const kv: [string, string | number][] = [
    ['학번', s.studentNo], ['이름', s.name ?? ''], ['학과', s.department ?? ''], ['전공', s.major ?? ''],
    ['학년', s.grade ?? ''], ['학점', s.gpa ?? ''], ['진로희망', s.careerGoal ?? ''],
    ['전화번호', s.phone ?? ''], ['이메일', s.email ?? ''],
    ['자격증', s.certificates.join(', ')], ['외국어', s.foreignLanguages.join(', ')],
    ['졸업일자', s.graduationDate ?? ''], ['취업기업', s.employmentCompany ?? ''],
    ['SW사업', [sw.program1, sw.program2, sw.program3, sw.program4, sw.program5].filter(Boolean).join(' / ')],
    ['부트캠프', [bc.program1, bc.program2, bc.program3, bc.program4, bc.program5].filter(Boolean).join(' / ')],
  ];
  ws.addRow(['항목', '내용']);
  kv.forEach(([k, v]) => ws.addRow([k, v]));
  ws.addRow([]);
  ws.addRow(['진로지도 상담']);
  ws.addRow(['상담일자', '상담자', '상담내역']);
  s.counselings.forEach((c) => ws.addRow([c.counselDate ?? '', c.counselor ?? '', c.content ?? '']));
  ws.addRow([]);
  ws.addRow(['연결 산학 프로젝트']);
  ws.addRow(['연도', '과제명', '기간', '지도교수', '기업']);
  s.projects.forEach((ps) => ws.addRow([ps.project.year ?? '', ps.project.title ?? '', ps.project.period ?? '', ps.project.lab?.professorName ?? '', ps.project.company?.name ?? ps.project.companyNameRaw ?? '']));
  ws.addRow([]);
  ws.addRow(['인턴십 이력']);
  ws.addRow(['유형', '기업체명', '기간(주)', '연월일']);
  s.manualInternships.forEach((it) => ws.addRow([it.internshipType ?? '', it.companyName ?? '', it.durationWeeks ?? '', it.activityDate ?? '']));
  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 30;

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="student_${s.studentNo}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
