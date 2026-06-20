/**
 * POST /api/companies/import — 엑셀(.xlsx) 업로드 → 기업/협업/실무자 일괄 적재.
 *   같은 기관명은 기존 행 갱신(빈 값으로 덮어쓰지 않음).
 *   교수님 요청: "업로드한 엑셀 파일을 일단 DB에 넣고, 자동 채움 버튼은 별도".
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, handle, MAX_UPLOAD_BYTES } from '@/lib/http';
import { nextCode } from '@/lib/codes';
import { classifyHeader, toBool, cellText, type HeaderCat } from '@/lib/excel-import';

type Parsed = {
  company: Record<string, unknown>;
  collab: Record<string, unknown>;
  contact: Record<string, string>;
  ceo: Record<string, string>;
};

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
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    if (wb.worksheets.length === 0) return fail('워크시트를 찾을 수 없습니다.', 400);

    // ── 모든 시트를 훑어 헤더 행 탐색 ──
    //  진짜 헤더 행으로 인정하려면: ① '기관명/기업명/회사명/업체명' 포함 + ② 다른 표 마커가 2개 이상.
    //  이렇게 해야 "실습기관 명단"(제목) 같은 안내문이 잘못 헤더로 잡히지 않는다.
    const TABLE_MARKERS = [
      '연번', '소재지', '주소', '유형', '지역', '담당자', '인턴십', '연도',
      '대표자', '직위', '직책', '우선순위', '진행상태', '국가', '국내외',
      'mou', '교과', '산학', '특강', '가치확산', '해외교육', '채용', '현장실습',
    ];
    const tryDetect = (strict: boolean): { ws: ExcelJS.Worksheet; row: number } | null => {
      for (const sheet of wb.worksheets) {
        for (let r = 1; r <= Math.min(15, sheet.rowCount); r++) {
          const vals = (sheet.getRow(r).values as unknown[]) ?? [];
          const cellTexts = vals.slice(1).map((v) => cellText(v).replace(/\s/g, '').toLowerCase());
          const hasName = cellTexts.some((t) => /(기관|기업|회사|업체)명/.test(t));
          if (!hasName) continue;
          if (strict) {
            let count = 0;
            for (const m of TABLE_MARKERS) {
              if (cellTexts.some((t) => t.includes(m))) count++;
              if (count >= 2) break;
            }
            if (count < 2) continue;
          }
          return { ws: sheet, row: r };
        }
      }
      return null;
    };
    // 1차: 엄격(권장). 실패하면 2차: 관대(과거 호환).
    const found = tryDetect(true) ?? tryDetect(false);
    const ws = found?.ws ?? null;
    const headerRow = found?.row ?? -1;

    if (!ws || headerRow < 0) {
      // 진단: 어떤 시트에 어떤 내용이 들어있는지 보여줘서 원인 파악
      const diag: string[] = [];
      for (const sheet of wb.worksheets) {
        diag.push(`[시트 '${sheet.name}', 행수=${sheet.rowCount}]`);
        for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
          const cells = ((sheet.getRow(r).values as unknown[]) ?? [])
            .slice(1)
            .map((v) => cellText(v))
            .filter(Boolean)
            .slice(0, 12);
          diag.push(`  ${r}행: ${cells.join(' | ') || '(빈 행)'}`);
        }
      }
      return fail(`헤더(기관명/기업명) 컬럼을 찾지 못했습니다. 다음 내용 확인 후 알려주세요:\n\n${diag.join('\n')}`, 400);
    }

    // ── 컬럼 → 카테고리 매핑 ──
    const headerCells = ws.getRow(headerRow).values as unknown[];
    const cols: { col: number; cat: HeaderCat }[] = [];
    for (let c = 1; c < headerCells.length; c++) {
      const cat = classifyHeader(cellText(headerCells[c]));
      if (cat) cols.push({ col: c, cat });
    }
    if (!cols.find((x) => x.cat.kind === 'company' && x.cat.field === 'name')) {
      // 매핑 결과 진단 — 어떤 셀 텍스트가 있었는지 + 어떻게 매핑됐는지 함께 표시
      const rowCells = ((ws.getRow(headerRow).values as unknown[]) ?? [])
        .slice(1)
        .map((v) => cellText(v))
        .filter(Boolean);
      const detected = cols.map((x) => `${cellText(headerCells[x.col])}→${x.cat.field}`).join(' / ');
      return fail(
        `헤더 행은 ${headerRow}행에서 찾았지만 '기관명' 컬럼 매핑에 실패했습니다.\n` +
        `${headerRow}행 셀들: [${rowCells.join(' | ')}]\n` +
        `인식된 컬럼: ${detected || '(없음)'}`,
        400,
      );
    }

    // ── 데이터 행 파싱 ──
    const records: Parsed[] = [];
    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const vals = ws.getRow(r).values as unknown[];
      if (!vals || vals.length === 0) continue;

      const rec: Parsed = { company: {}, collab: {}, contact: {}, ceo: {} };
      const memoParts: string[] = [];
      const companyNoteParts: string[] = [];

      for (const { col, cat } of cols) {
        const raw = vals[col];
        const text = cellText(raw);
        if (cat.kind === 'company') {
          if (cat.field === 'mou') rec.company.mou = toBool(raw);
          else if (cat.field === 'joinYear') rec.company.joinYear = text ? Number(text) || null : null;
          else if (text) rec.company[cat.field] = text;
        } else if (cat.kind === 'collabBool') {
          const truthy = toBool(raw);
          rec.collab[cat.field] = truthy;
          // 창업/기타 컬럼에 자유 텍스트가 적혀있으면 메모로 보존 (데이터 손실 방지)
          if (!truthy && text && (cat.field === 'startup' || cat.field === 'etc')) {
            memoParts.push(`${cat.field === 'startup' ? '창업' : '기타'}:${text}`);
          }
        } else if (cat.kind === 'collabStr') {
          if (text) rec.collab[cat.field] = text;
        } else if (cat.kind === 'collabNum') {
          if (text) {
            const n = Number(text.replace(/[^0-9.-]/g, ''));
            if (!Number.isNaN(n)) rec.collab[cat.field] = n;
          }
        } else if (cat.kind === 'contact') {
          if (text) rec.contact[cat.field] = text;
        } else if (cat.kind === 'ceo') {
          if (text) rec.ceo[cat.field] = text;
        } else if (cat.kind === 'memo') {
          if (text) memoParts.push(`${cat.field === 'startup' ? '창업' : '기타'}:${text}`);
        } else if (cat.kind === 'companyNote') {
          if (text) companyNoteParts.push(`${cat.field}:${text}`);
        }
      }

      // 기관명 없는 행은 스킵
      if (!rec.company.name) continue;
      if (memoParts.length) rec.collab.memo = memoParts.join(' / ');
      if (companyNoteParts.length) rec.company.note = companyNoteParts.join(' / ');
      records.push(rec);
    }

    // ── 진단: 컬럼 매핑 결과 + 협력 항목별 카운트 ──
    const columnMapping = cols.map((x) => {
      const fieldName = 'field' in x.cat ? x.cat.field : '?';
      return `${cellText(headerCells[x.col])}→${x.cat.kind}.${fieldName}`;
    });
    const COLLAB_KEYS = ['internship', 'industryProject', 'curriculumCommittee', 'guestLecture', 'employment', 'overseasEducation', 'valueSpread', 'fieldTrainingOrg', 'startup', 'etc'] as const;
    const collabCounts: Record<string, number> = {};
    for (const k of COLLAB_KEYS) collabCounts[k] = 0;
    for (const r of records) {
      for (const k of COLLAB_KEYS) if (r.collab[k]) collabCounts[k]++;
    }

    // ── DB 적재 ──
    let created = 0, updated = 0;
    const errors: { name: string; error: string }[] = [];

    for (const rec of records) {
      const name = String(rec.company.name);
      try {
        // 1) 기업: name 으로 찾고 없으면 생성, 있으면 비어있지 않은 필드만 갱신(기존값 우선)
        let companyId: string;
        const existing = await prisma.company.findUnique({ where: { name } });
        if (existing) {
          const patch: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(rec.company)) {
            if (k === 'name') continue;
            if (v == null || (typeof v === 'string' && !v.trim())) continue;
            // 기존값 보존: 기존이 비어있을 때만 채움
            const cur = (existing as Record<string, unknown>)[k];
            if (cur == null || (typeof cur === 'string' && !cur.trim())) patch[k] = v;
          }
          if (Object.keys(patch).length) {
            await prisma.company.update({
              where: { id: existing.id },
              data: { ...patch, version: { increment: 1 } },
            });
          }
          companyId = existing.id;
          updated++;
        } else {
          const newCompany = await prisma.$transaction(async (tx) => {
            const code = await nextCode(tx, 'company');
            return tx.company.create({
              data: {
                code,
                name,
                ...rec.company,
                collaboration: { create: {} }, // 빈 1:1 협업 생성
              } as { code: string; name: string; collaboration: { create: object } },
            });
          });
          companyId = newCompany.id;
          created++;
        }

        // 2) 협업: 빈 값만 채우는 방식으로 upsert
        if (Object.keys(rec.collab).length) {
          const cur = await prisma.collaboration.findUnique({ where: { companyId } });
          const collabPatch: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(rec.collab)) {
            if (v == null) continue;
            if (typeof v === 'string' && !v.trim()) continue;
            if (cur) {
              const curVal = (cur as Record<string, unknown>)[k];
              if (typeof v === 'boolean') {
                // boolean 은 true 만 의미 있는 정보로 간주 → 기존이 false 일 때만 덮어씀
                if (v && curVal === false) collabPatch[k] = true;
              } else if (curVal == null || (typeof curVal === 'string' && !curVal.trim())) {
                collabPatch[k] = v;
              }
            } else {
              collabPatch[k] = v;
            }
          }
          if (Object.keys(collabPatch).length) {
            await prisma.collaboration.upsert({
              where: { companyId },
              update: collabPatch,
              create: { companyId, ...collabPatch },
            });
          }
        }

        // 3) 실무자: 담당자 + 대표자 (이름 기준 upsert; 빈 값으로 기존 덮어쓰지 않음)
        await upsertPerson(companyId, rec.contact.name, rec.contact.position, rec.contact.phone, rec.contact.email, rec.contact.dept);
        await upsertPerson(companyId, rec.ceo.name, '대표', rec.ceo.phone, rec.ceo.email);
      } catch (e) {
        errors.push({ name, error: e instanceof Error ? e.message : '오류' });
      }
    }

    return ok({
      total: records.length, created, updated, errors,
      headerRow, sheetName: ws.name,
      columnMapping,
      collabCounts,
    });
  });
}

async function upsertPerson(
  companyId: string,
  name?: string,
  position?: string | null,
  phone?: string,
  email?: string,
  dept?: string,
) {
  const nm = (name || '').trim();
  if (!nm) return;
  const existing = await prisma.contactPerson.findFirst({ where: { companyId, name: nm } });
  const patch: Record<string, unknown> = {};
  if (position && (!existing || !existing.position)) patch.position = position;
  if (phone && (!existing || !existing.phone)) patch.phone = phone;
  if (email && (!existing || !existing.email)) patch.email = email;
  if (dept && (!existing || !existing.dept)) patch.dept = dept;
  if (existing) {
    if (Object.keys(patch).length) await prisma.contactPerson.update({ where: { id: existing.id }, data: patch });
  } else {
    await prisma.$transaction(async (tx) => {
      const code = await nextCode(tx, 'person');
      await tx.contactPerson.create({ data: { code, companyId, name: nm, ...patch } });
    });
  }
}
