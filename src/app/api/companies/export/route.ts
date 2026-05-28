/**
 * GET /api/companies/export — 현재 필터 조건의 기업 목록을 .xlsx 파일로 내려보낸다.
 *  쿼리 파라미터는 GET /api/companies 와 동일.
 *  교수님 요청: 기업 리스트에서 검색된 결과를 엑셀로 받기.
 */
export const runtime = 'nodejs'; // exceljs 는 Node 런타임 필요(Buffer 등)

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { COLLAB_FIELDS } from '@/lib/enums';

const COLLAB_KEYS = [
  'internship', 'industryProject', 'curriculumCommittee', 'guestLecture',
  'employment', 'overseasEducation', 'valueSpread', 'fieldTrainingOrg',
  'startup', 'etc',
] as const;

export async function GET(req: Request) {
  await requireUser();
  const sp = new URL(req.url).searchParams;

  // ── 필터(목록 GET 과 동일 규칙) ──
  const q = sp.get('q')?.trim();
  const region = sp.get('region')?.trim();
  const priority = sp.get('priority')?.trim();
  const status = sp.get('status')?.trim();
  const aiField = sp.get('aiField')?.trim();
  const mou = sp.get('mou') === '1';
  const includeInactive = sp.get('includeInactive') === '1';

  const where: Record<string, unknown> = {};
  if (!includeInactive) where.isActive = true;
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (region) where.region = region;
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (aiField) where.aiField = { contains: aiField, mode: 'insensitive' };
  if (mou) where.mou = true;
  const collabConds: Record<string, true> = {};
  for (const k of COLLAB_KEYS) if (sp.get(k) === '1') collabConds[k] = true;
  if (Object.keys(collabConds).length) where.collaboration = { is: collabConds };

  const companies = await prisma.company.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      collaboration: true,
      histories: { orderBy: { contactDate: 'desc' }, take: 1, select: { contactDate: true } },
    },
  });

  // ── 워크북 작성 ──
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI Biz Connect';
  wb.created = new Date();
  const ws = wb.addWorksheet('기업목록');

  const collabHeaders = COLLAB_FIELDS.map((cf) => ({ header: cf.label, key: cf.key, width: 10 }));
  ws.columns = [
    { header: '코드', key: 'code', width: 9 },
    { header: '기관명', key: 'name', width: 28 },
    { header: '지역', key: 'region', width: 9 },
    { header: '유형', key: 'orgType', width: 9 },
    { header: '사업참여연도', key: 'joinYear', width: 12 },
    { header: '소재지', key: 'addressDetail', width: 30 },
    { header: '홈페이지', key: 'homepage', width: 28 },
    { header: 'AI기술분야', key: 'aiField', width: 16 },
    { header: '주요산업', key: 'mainIndustry', width: 16 },
    { header: '매출규모', key: 'revenueScale', width: 12 },
    { header: '평균연봉', key: 'avgSalary', width: 12 },
    { header: '신입사원연봉', key: 'newcomerSalary', width: 12 },
    { header: '담당교수1', key: 'professor1', width: 10 },
    { header: '담당교수2', key: 'professor2', width: 10 },
    { header: 'MOU체결', key: 'mou', width: 9 },
    { header: '협력우선순위', key: 'priority', width: 12 },
    { header: '진행상태', key: 'status', width: 11 },
    ...collabHeaders,
    { header: '요구역량', key: 'requiredSkills', width: 18 },
    { header: '우대전공', key: 'preferredMajor', width: 14 },
    { header: '수용가능인원', key: 'capacity', width: 12 },
    { header: '협력메모', key: 'collabMemo', width: 24 },
    { header: '최근컨택일', key: 'lastContactDate', width: 12 },
  ];

  for (const c of companies) {
    const co = c.collaboration;
    const row: Record<string, unknown> = {
      code: c.code,
      name: c.name,
      region: c.region ?? '',
      orgType: c.orgType ?? '',
      joinYear: c.joinYear ?? '',
      addressDetail: c.addressDetail ?? '',
      homepage: c.homepage ?? '',
      aiField: c.aiField ?? '',
      mainIndustry: c.mainIndustry ?? '',
      revenueScale: c.revenueScale ?? '',
      avgSalary: c.avgSalary ?? '',
      newcomerSalary: c.newcomerSalary ?? '',
      professor1: c.professor1 ?? '',
      professor2: c.professor2 ?? '',
      mou: c.mou ? '체결' : '미체결',
      priority: c.priority ?? '',
      status: c.status,
      requiredSkills: co?.requiredSkills ?? '',
      preferredMajor: co?.preferredMajor ?? '',
      capacity: co?.capacity ?? '',
      collabMemo: co?.memo ?? '',
      lastContactDate: c.histories[0]?.contactDate ?? '',
    };
    for (const k of COLLAB_KEYS) {
      row[k] = (co as Record<string, unknown> | null)?.[k] ? 'O' : '';
    }
    ws.addRow(row);
  }

  // 헤더 스타일
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { horizontal: 'center', vertical: 'middle' };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const arrayBuf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const filename = `companies_${today}.xlsx`;

  return new Response(arrayBuf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
