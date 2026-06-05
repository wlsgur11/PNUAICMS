/**
 * GET /api/internships/export — 현재 필터 조건의 인턴십 목록을 .xlsx 로 내려보낸다.
 *  쿼리 파라미터는 GET /api/internships 와 동일.
 */
export const runtime = 'nodejs';

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { internshipWhere } from '@/lib/list-filters';

export async function GET(req: Request) {
  await requireUser();
  const sp = new URL(req.url).searchParams;
  const items = await prisma.internship.findMany({
    where: internshipWhere(sp),
    orderBy: [{ year: 'desc' }, { startDate: 'desc' }],
    include: { company: { select: { name: true } } },
  });

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet('인턴십현황');
  ws.columns = [
    { header: '연도', key: 'year', width: 8 },
    { header: '기업', key: 'company', width: 24 },
    { header: '프로그램', key: 'program', width: 22 },
    { header: '주관', key: 'host', width: 12 },
    { header: '교육방식', key: 'method', width: 10 },
    { header: '국내외', key: 'domestic', width: 8 },
    { header: '기간(주)', key: 'weeks', width: 9 },
    { header: '인정학점', key: 'credits', width: 9 },
    { header: '정컴', key: 'cse', width: 7 },
    { header: 'DS', key: 'ds', width: 7 },
    { header: '비SW', key: 'nonsw', width: 7 },
  ];
  for (const it of items) {
    ws.addRow({
      year: it.year ?? '', company: it.company?.name ?? it.companyNameRaw ?? '',
      program: it.programName ?? '', host: it.hostType ?? '', method: it.method ?? '',
      domestic: it.domestic ?? '', weeks: it.weeks ?? '', credits: it.credits ?? '',
      cse: it.cntCSE ?? '', ds: it.cntDS ?? '', nonsw: it.cntNonSW ?? '',
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
      'Content-Disposition': `attachment; filename="internships_${today}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
