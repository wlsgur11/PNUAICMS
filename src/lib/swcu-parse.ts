/**
 * src/lib/swcu-parse.ts
 * SW중심대학 정량실적 엑셀 → {year, indicators, raws}.
 * readSheets(records-xlsx)로 시트를 읽은 뒤,
 * 성과지표/KMAC/총괄 시트를 시트명·헤더 텍스트 기반으로 자동 탐지해 파싱한다.
 * (2023·2024 = 실적 '직접산출 비교'열, 2025 = 자동검출 직전 열 등 양식 차이를 헤더로 흡수)
 *
 * 주의: 실제 파일의 '성과지표' 열(B)은 영역(merge) 경계 행에만 값이 있고
 * 대부분 비어 있다. 따라서 지표명은 영역 내 위치 순서로 표준 17개 명칭을
 * 부여하고(아래 CANONICAL_NAMES), 파일에 텍스트가 있으면 그것을 우선 사용한다.
 */
import type { SheetRows } from '@/lib/records-xlsx';

export type SwcuIndicatorRow = {
  area: string | null;
  name: string;
  unit: string | null;
  target: number | null;
  actual: number | null;
  verifiedActual: number | null;
  verifyResult: string | null;
  sortOrder: number;
};
export type SwcuRawRow = {
  scope: '공통' | 'AI';
  category: string | null;
  label: string;
  value: number | null;
  sortOrder: number;
};
export type ParsedSwcu = {
  year: number;
  university: string | null;
  submittedAt: string | null;
  indicators: SwcuIndicatorRow[];
  raws: SwcuRawRow[];
};

/**
 * SW중심대학 공통 정량지표 표준 17개 명칭(영역 내 등장 순서 = sortOrder).
 * 파일의 '성과지표'(B) 열이 영역 경계 행에만 채워져 있어, 위치 기준으로 부여한다.
 * (2023·2024·2025 모두 동일 순서로 확인됨)
 */
const CANONICAL_NAMES: string[] = [
  // 교육체계 및 제도개선
  '전체 계열 대비 SW정원 비율',
  '참여학과 교원 1인당 학생수',
  '산업체 경력 교원 비율',
  // 교육과정 개편·운영
  'AI 등 신기술 반영 신규개설 과목수',
  'SW기초교육 이수율',
  'SW전공 참여인원',
  'SW전공 배출인원',
  '산학협력 프로젝트 참여율',
  '인턴십 이수율',
  '인턴십 연계취업률',
  // 교육성과 공유 및 확산
  '온/오프라인 교육콘텐츠 공동개발 건수',
  '교육콘텐츠 활용 건수',
  '개방형 온라인 강좌 공개 건수',
  '취업률',
  '창업률',
  '수혜학생 만족도',
  '기업 만족도',
];

const cell = (rows: string[][], r: number, c: number): string => (rows[r]?.[c] ?? '').trim();

/** 숫자 파싱. '목표치없음'·'-'·'별도조사'·'' → null */
function num(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 헤더 밴드(여러 행)에서 열별 텍스트를 합쳐 pred를 만족하는 첫 열 인덱스 */
function findCol(bands: string[][], pred: (h: string) => boolean, maxCol: number): number {
  for (let c = 0; c < maxCol; c++) {
    let txt = '';
    for (const b of bands) txt += (b[c] ?? '') + ' ';
    if (pred(txt)) return c;
  }
  return -1;
}

const FOOTER = (s: string) => s.includes('제출일') || s.includes('성과담당자');

/**
 * 연도 감지.
 * 주의: '1단계 성과지표'·AI 과거 시트의 A1 은 모든 파일에서 'YYYY년'(과거 양식, 항상 2023)
 * 으로 고정돼 있어 신뢰할 수 없다. 따라서:
 *  1) 당해 성과지표 시트(이름에 '성과지표' 포함, 1단계 제외) 제목의 'YYYY년도' 우선
 *  2) 그 외 시트 제목의 'YYYY년도'
 *  3) fileName 의 선두 4자리
 *  4) 마지막으로 아무 시트의 'YYYY년'
 */
function detectYear(sheets: SheetRows[], fileName?: string): number | null {
  const yearOf = (title: string, re: RegExp): number | null => {
    const m = title.match(re);
    return m ? Number(m[1]) : null;
  };
  const current = sheets.filter((s) => s.name.includes('성과지표') && !s.name.includes('1단계'));
  for (const s of current) {
    const y = yearOf(cell(s.rows, 0, 0), /(20\d{2})\s*년도/);
    if (y) return y;
  }
  for (const s of sheets) {
    const y = yearOf(cell(s.rows, 0, 0), /(20\d{2})\s*년도/);
    if (y) return y;
  }
  if (fileName) {
    const m = fileName.match(/(20\d{2})/);
    if (m) return Number(m[1]);
  }
  for (const s of sheets) {
    const y = yearOf(cell(s.rows, 0, 0), /(20\d{2})\s*년/);
    if (y) return y;
  }
  return null;
}

/** 성과지표 시트: 이름에 '성과지표' 포함 & '1단계'·'AI'·'KMAC' 제외 */
function findIndicatorSheet(sheets: SheetRows[]): SheetRows | null {
  return (
    sheets.find(
      (s) => s.name.includes('성과지표') && !s.name.includes('1단계') && !s.name.includes('AI') && !s.name.includes('KMAC'),
    ) ?? null
  );
}

/** 헤더 행 인덱스: '성과지표'와 '단위'가 같은 행에 있는 행 */
function findHeaderRow(rows: string[][]): number {
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const joined = (rows[r] ?? []).join('|');
    if (joined.includes('성과지표') && joined.includes('단위')) return r;
  }
  return -1;
}

/**
 * 실적(최종 자동산출) 열 탐지.
 * - 양식별로 값이 들어가는 열이 다르고(2023·24=E '직접산출 비교', 2025=I), 2025 E열은
 *   분자 텍스트가 들어가 신뢰할 수 없다.
 * - 모든 양식에서 '자동검출' 열 바로 왼쪽 열이 최종 산출값(직접산출 비교/자동검출(A))이다.
 * - 그래도 못 찾으면 '직접산출' > '실적' 헤더로 폴백.
 */
function detectActualCol(bands: string[][], maxCol: number): number {
  const auto = findCol(bands, (h) => h.includes('자동검출'), maxCol);
  if (auto > 0) return auto - 1;
  let c = findCol(bands, (h) => h.includes('직접산출'), maxCol);
  if (c < 0) c = findCol(bands, (h) => h.includes('실적') && !h.includes('목표'), maxCol);
  return c;
}

/**
 * 성과지표 시트 파싱.
 * 데이터 행 식별: 헤더 다음 행부터, '단위' 열에 값이 있고 footer 가 아닌 행.
 * 지표명은 파일 텍스트(있으면) → 없으면 위치 기준 CANONICAL_NAMES.
 */
function parseIndicators(sheet: SheetRows): SwcuIndicatorRow[] {
  const rows = sheet.rows;
  const hdr = findHeaderRow(rows);
  if (hdr < 0) return [];
  const bands = [rows[hdr] ?? [], rows[hdr + 1] ?? []];
  const maxCol = Math.max(...bands.map((b) => b.length), 0);

  const areaCol = findCol(bands, (h) => h.includes('영역'), maxCol);
  const nameCol = findCol(bands, (h) => h.includes('성과지표'), maxCol);
  const unitCol = findCol(bands, (h) => h.includes('단위'), maxCol);
  const targetCol = findCol(bands, (h) => h.includes('목표'), maxCol);
  const actualCol = detectActualCol(bands, maxCol);

  const normalize = (s: string) => s.replace(/\s+/g, '');
  const out: SwcuIndicatorRow[] = [];
  let area: string | null = null;
  let order = 0;
  for (let r = hdr + 1; r < rows.length; r++) {
    const a = areaCol >= 0 ? cell(rows, r, areaCol) : '';
    if (a && FOOTER(a)) break;
    const fileName = nameCol >= 0 ? cell(rows, r, nameCol) : '';
    if (fileName && FOOTER(fileName)) break;
    if (a) area = a;
    // 데이터 행 = 단위 열에 값이 있는 행(빈 줄/footer 제외)
    const unit = unitCol >= 0 ? cell(rows, r, unitCol) : '';
    if (!unit) continue;
    // 드리프트 감지: 파일에 지표명이 실제로 있는 행(영역 경계 행 = 위치 0·3·10)은
    // CANONICAL_NAMES 와 일치해야 한다. 불일치 시 양식의 지표 추가/삭제/이름변경으로
    // 위치 매핑이 어긋난 것이므로 즉시 중단한다.
    // (단, 이름 없는 영역 내부 행끼리의 순서만 바뀐 경우는 이 검사로 잡을 수 없다.)
    if (fileName && CANONICAL_NAMES[order] && normalize(fileName) !== normalize(CANONICAL_NAMES[order])) {
      throw new Error(
        `성과지표 정렬 불일치: 위치 ${order}에 '${CANONICAL_NAMES[order]}' 기대, 파일은 '${fileName}'. ` +
          `엑셀 양식에서 지표가 추가/삭제/재정렬된 것으로 보입니다. CANONICAL_NAMES 갱신이 필요합니다.`,
      );
    }
    const name = fileName || CANONICAL_NAMES[order] || `지표${order + 1}`;
    out.push({
      area,
      name,
      unit: unit || null,
      target: num(cell(rows, r, targetCol)),
      actual: actualCol >= 0 ? num(cell(rows, r, actualCol)) : null,
      verifiedActual: null,
      verifyResult: null,
      sortOrder: order++,
    });
  }
  return out;
}

/**
 * KMAC 검증시트(있는 해만). 검증시트의 데이터 행 순서가 성과지표 시트와 동일하므로
 * 위치(sortOrder) 기준으로 정렬해 매칭한다(이름 열도 비어 있어 텍스트 매칭 불가).
 *  - verifyResult: '검증결과' 열의 O/X
 *  - verifiedActual: '[신규]실적' 열 숫자
 */
function applyKmac(sheets: SheetRows[], indicators: SwcuIndicatorRow[]): void {
  const sheet = sheets.find((s) => s.name.includes('KMAC'));
  if (!sheet) return;
  const rows = sheet.rows;
  const hdr = findHeaderRow(rows);
  if (hdr < 0) return;
  // KMAC 시트는 헤더 라벨이 매칭 행 위(hdr-1)에 걸쳐 있어 parseIndicators(hdr+1)와 달리
  // hdr-1 밴드를 본다. 절대 +1 로 "고치지" 말 것.
  const bands = [rows[hdr] ?? [], rows[hdr - 1] ?? []];
  const maxCol = Math.max(...bands.map((b) => b.length), 0);
  const unitCol = findCol(bands, (h) => h.includes('단위'), maxCol);
  const areaCol = findCol(bands, (h) => h.includes('영역'), maxCol);
  const verifyCol = findCol(bands, (h) => h.includes('검증결과'), maxCol);
  const verifiedCol = findCol(bands, (h) => h.includes('신규'), maxCol);
  if (unitCol < 0) return;

  let order = 0;
  for (let r = hdr + 1; r < rows.length; r++) {
    const a = areaCol >= 0 ? cell(rows, r, areaCol) : '';
    if (a && FOOTER(a)) break;
    const unit = cell(rows, r, unitCol);
    if (!unit) continue;
    const ind = indicators[order];
    order++;
    if (!ind) continue;
    if (verifyCol >= 0) {
      const v = cell(rows, r, verifyCol).toUpperCase();
      if (v === 'O' || v === 'X') ind.verifyResult = v;
    }
    if (verifiedCol >= 0) ind.verifiedActual = num(cell(rows, r, verifiedCol));
  }
  // 가드: KMAC 데이터 행 수(order)는 성과지표 수와 일치해야 한다.
  // 다르면 KMAC 양식이 바뀌어 위치 기반 매칭이 어긋난 것이므로 즉시 중단한다.
  if (order !== indicators.length) {
    throw new Error(
      `KMAC 시트 행 수(${order})가 성과지표 수(${indicators.length})와 다릅니다. ` +
        `KMAC 양식 변경으로 위치 기반 검증 매칭이 어긋났을 수 있습니다.`,
    );
  }
}

/** 총괄 시트: 3행 헤더(그룹/중간/리프) + 값행(index 3) → label=value 행 */
function parseRaw(sheet: SheetRows, scope: '공통' | 'AI'): SwcuRawRow[] {
  const rows = sheet.rows;
  const groupRow = rows[0] ?? [];
  const leafRow = rows[2] ?? [];
  const valRow = rows[3] ?? [];
  const maxCol = Math.max(groupRow.length, leafRow.length, valRow.length);
  const out: SwcuRawRow[] = [];
  let category: string | null = null;
  let order = 0;
  for (let c = 2; c < maxCol; c++) {
    const g = (groupRow[c] ?? '').trim();
    if (g) category = g;
    const label = (leafRow[c] ?? '').trim();
    if (!label) continue;
    out.push({ scope, category, label, value: num(valRow[c]), sortOrder: order++ });
  }
  return out;
}

export function parseSwcu(sheets: SheetRows[], fileName?: string): ParsedSwcu {
  const year = detectYear(sheets, fileName);
  if (year == null) throw new Error('연도를 인식하지 못했습니다. (시트 제목/파일명에 YYYY년 없음)');

  const indSheet = findIndicatorSheet(sheets);
  if (!indSheet) throw new Error('성과지표 시트를 찾지 못했습니다.');
  const indicators = parseIndicators(indSheet);
  if (indicators.length === 0) throw new Error('성과지표를 한 건도 읽지 못했습니다. (헤더/열 구조 확인)');
  applyKmac(sheets, indicators);

  const raws: SwcuRawRow[] = [];
  const common = sheets.find((s) => s.name.includes('총괄') && !s.name.includes('AI'));
  const ai = sheets.find((s) => s.name.includes('총괄') && s.name.includes('AI'));
  if (common) raws.push(...parseRaw(common, '공통'));
  if (ai) raws.push(...parseRaw(ai, 'AI'));

  const university = indSheet.rows.find((row) => (row[0] ?? '').includes('학교명'))?.[1] ?? null;
  const submittedRaw = indSheet.rows.find((row) => (row[0] ?? '').includes('제출일'))?.[0] ?? null;
  const submittedAt = submittedRaw ? submittedRaw.replace(/^제출일\s*[:：]\s*/, '').trim() || null : null;

  return { year, university: university || null, submittedAt, indicators, raws };
}
