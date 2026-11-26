/**
 * TOPCIT 정기평가 등록접수자 엑셀(.xls) 읽기.
 * 평가 기관이 내려주는 파일이라 옛 엑셀 형식이어서 SheetJS 로 읽는다.
 * 영역 점수는 회차마다 영역이 바뀌어(25회부터 4개 영역) '총점' 뒤 열을 그대로 담는다.
 */
import * as XLSX from 'xlsx';
import { mask } from './career-survey';

export type AreaScore = { area: string; score: number };
export type TopcitRow = {
  examNo: string;
  name: string; // 학생 찾기용. 저장하지 않는다
  phone: string; // 학생 찾기용 숫자만. 저장하지 않는다
  nameMasked: string | null;
  affiliation: string | null;
  occupation: string | null;
  attended: boolean;
  level: number | null;
  total: number | null;
  scores: AreaScore[];
};
export type ParsedTopcit = { round: number | null; examDate: string | null; rows: TopcitRow[] };

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const num = (v: unknown) => {
  const s = clean(v);
  return s && Number.isFinite(Number(s)) ? Number(s) : null;
};
export const digits = (v: unknown) => clean(v).replace(/\D/g, '');

export function readXlsRows(buf: ArrayBuffer): string[][] {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '', raw: false });
}

/** 파일 이름의 "(23.05.20)" 을 2023-05-20 으로 */
export function dateFromName(fileName?: string): string | null {
  const m = fileName?.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  return m ? `20${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseTopcit(rows: string[][], fileName?: string): ParsedTopcit {
  const head = (rows[0] ?? []).map(clean);
  const col = (name: string) => head.indexOf(name);
  const need = ['수험 번호', '성명', '출결', '수준', '총점'];
  const missing = need.filter((n) => col(n) < 0);
  if (missing.length) throw new Error(`TOPCIT 등록접수자 엑셀이 아닌 것 같습니다. 없는 열: ${missing.join(', ')}`);

  const iTotal = col('총점');
  const areas = head.map((h, i) => (i > iTotal && h ? i : -1)).filter((i) => i >= 0);
  const out: TopcitRow[] = [];
  let roundName = '';
  for (const r of rows.slice(1)) {
    // 표 중간에 머리글이 한 번 더 나오는 파일이 있다. 순번이 숫자인 줄만 응시자다
    if (!/^\d+$/.test(clean(r[0]))) continue;
    roundName ||= clean(r[col('평가명')]);
    const total = num(r[iTotal]);
    const name = clean(r[col('성명')]);
    out.push({
      examNo: clean(r[col('수험 번호')]),
      name,
      phone: digits(r[col('연락처')]),
      nameMasked: name ? mask(name) : null,
      affiliation: clean(r[col('기관명')]) || clean(r[col('단체접수 기관명')]) || null,
      occupation: clean(r[col('직업 상세')]) || null,
      // 25회 파일은 미응시를 빈 칸으로 둔다. 점수가 있어야 응시로 본다
      attended: clean(r[col('출결')]) === '출석' && total != null,
      level: num(r[col('수준')]),
      total,
      scores: areas.map((i) => ({ area: head[i], score: num(r[i]) })).filter((x): x is AreaScore => x.score != null),
    });
  }
  const round = Number(roundName.match(/(\d+)\s*회/)?.[1] ?? fileName?.match(/(\d+)\s*회/)?.[1]) || null;
  return { round, examDate: dateFromName(fileName), rows: out.filter((x) => x.examNo) };
}

type StudentRef = { studentNo: string; name: string | null; nameMasked: string | null; phone: string | null };

/**
 * 이름과 연락처가 둘 다 맞는 CMS 학생 한 명을 찾는다. 같은 번호의 학생이 여럿이거나
 * 이름이 다르면 연결하지 않는다(엉뚱한 학생에 붙는 것보다 비워 두는 편이 낫다).
 */
export function matchStudents(rows: TopcitRow[], students: StudentRef[]): (string | null)[] {
  const byPhone = new Map<string, StudentRef[]>();
  for (const s of students) {
    const p = digits(s.phone);
    if (p.length >= 10) byPhone.set(p, [...(byPhone.get(p) ?? []), s]);
  }
  return rows.map((r) => {
    const hits = (byPhone.get(r.phone) ?? []).filter((s) => (s.name ? s.name === r.name : s.nameMasked === r.nameMasked));
    return hits.length === 1 ? hits[0].studentNo : null;
  });
}
