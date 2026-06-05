/**
 * src/lib/records-parse.ts
 * ---------------------------------------------------------
 * 시트 행 배열 → Project/Internship 레코드 (순수 함수, DB 없음).
 * 시트명으로 분류하고, 헤더 행을 찾아 컬럼맵을 만든 뒤 값을 뽑는다.
 */
import type { SheetRows } from './records-xlsx';

export type ParsedProject = {
  year: number; dept: string | null; category: string | null;
  type: string | null; title: string | null; period: string | null;
  track: string | null; professorName: string | null; labName: string | null;
  cntPhd: number | null; cntMaster: number | null; cntUndergrad: number | null;
  companyNameRaw: string | null;
  students: { studentNo: string; name: string }[]; studentNamesRaw: string | null;
};
export type ParsedInternship = {
  year: number; programName: string | null; companyNameRaw: string | null;
  hostType: string | null; method: string | null; domestic: string | null; country: string | null;
  startDate: string | null; endDate: string | null; weeks: number | null;
  hoursPerWeek: number | null; credits: number | null;
  cntCSE: number | null; cntDS: number | null; cntNonSW: number | null;
  empSW: number | null; empNonSW: number | null;
};
export type ParsedYearStat = {
  year: number;
  enrolledCSE: number | null; enrolledDS: number | null;
  industryTargetCSE: number | null; industryTargetDS: number | null;
  internTargetCSE: number | null; internTargetDS: number | null;
  industryTargetRatio: number | null; industryAchievedRatio: number | null; industryStudents: number | null;
  internshipTargetRatio: number | null; internshipAchievedRatio: number | null; internshipStudents: number | null;
};
export type ParseResult = { projects: ParsedProject[]; internships: ParsedInternship[]; yearStats: ParsedYearStat[] };

const num = (s: string): number | null => {
  const t = (s || '').trim();
  if (!t) return null;
  const n = Number(t.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const blank = (s: string): string | null => {
  const t = (s || '').trim();
  return t ? t : null;
};
/** 기업명 정리: 숫자·비율만 있는 값(잘못 잡힌 집계 셀)은 기업명이 아니므로 제외 */
const cleanCompany = (s: string): string | null => {
  const t = (s || '').trim();
  if (!t) return null;
  if (/^[\d.,%\s]+$/.test(t)) return null; // 숫자·비율
  if (/^(인턴기업명?|참여기업명?|학교명|기업명)$/.test(t.replace(/\s/g, ''))) return null; // 헤더 누수
  return t;
};
// 동의어 통합 (엑셀 표기 불일치 정리)
const TYPE_SYNONYM: Record<string, string> = { 'R/D': 'R&D', '용역과제': '용역' };
const DOMESTIC_SYNONYM: Record<string, string> = { '해외': '국외' };
const normType = (s: string | null): string | null => (s ? (TYPE_SYNONYM[s] ?? s) : s);
const normDomestic = (s: string | null): string | null => (s ? (DOMESTIC_SYNONYM[s] ?? s) : s);

const yearFromSheet = (name: string): number | null => {
  const m = name.match(/(\d{2})\s*년/);
  return m ? 2000 + Number(m[1]) : null;
};

/** 헤더 행 탐지: 키워드가 '짧은 셀'에 각각(서로 다른 셀에) minMatch 개 이상 나오는 첫 행.
 *  짧은 셀 조건으로 위쪽 작성요령 안내문(긴 한 셀)을 헤더로 오인하지 않는다. */
function findHeader(rows: string[][], keywords: string[], minMatch: number): number {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    let count = 0;
    for (const k of keywords) {
      const hit = rows[i].some((c) => {
        const t = (c || '').replace(/\s/g, '');
        return t.length <= 24 && t.includes(k);
      });
      if (hit) count++;
    }
    if (count >= minMatch) return i;
  }
  return -1;
}
/** 헤더 텍스트(공백 제거 후 부분일치) → 컬럼 인덱스 */
function colFinder(header: string[]) {
  const norm = header.map((h) => (h || '').replace(/\s/g, ''));
  return (...keys: string[]): number => {
    for (const k of keys) {
      const i = norm.findIndex((h) => h.includes(k));
      if (i >= 0) return i;
    }
    return -1;
  };
}

export function parseSheets(sheets: SheetRows[]): ParseResult {
  const projects: ParsedProject[] = [];
  const internships: ParsedInternship[] = [];
  const yearStats: ParsedYearStat[] = [];
  for (const sh of sheets) {
    const name = sh.name;
    const year = yearFromSheet(name);
    if (/전체\s*현황/.test(name)) {
      if (year) { const ys = parseYearStat(sh.rows, year); if (ys) yearStats.push(ys); }
      continue;
    }
    if (/분과구분|전기|연구실별/.test(name)) continue;
    if (!year) continue;
    if (/인턴십현황/.test(name)) parseInternshipSheet(sh.rows, year, internships);
    else if (/CSE/.test(name)) parseProjectSheet(sh.rows, year, '정컴', '학과졸업과제', projects);
    else if (/DS/.test(name)) parseProjectSheet(sh.rows, year, 'DS', '학과졸업과제', projects);
    else if (/SW중심대학/.test(name)) parseProjectSheet(sh.rows, year, null, '교육원연계', projects);
  }
  // 내용 없는 템플릿 행(연번만 있고 실제 데이터 없음) 제거
  const valid = projects.filter(
    (p) => p.title || p.professorName || p.companyNameRaw || p.students.length || p.studentNamesRaw,
  );
  // 학부생 수 보정: 비어 있으면 (개별 학생 + raw 이름) 수로
  for (const p of valid) {
    if (p.cntUndergrad == null) {
      const rawCount = p.studentNamesRaw ? p.studentNamesRaw.split(',').filter(Boolean).length : 0;
      const c = p.students.length + rawCount;
      p.cntUndergrad = c || null;
    }
  }
  return { projects: valid, internships, yearStats };
}

/** '전체현황' 시트에서 재학생 수·목표/달성 비율·참여수 추출.
 *  라벨이 깔끔히 안 읽혀 위치 기준으로 뽑는다(3개 연도 동일 구조 확인).
 *  - 재학생: 'DS' 셀이 있는 첫 행에서 정컴=DS앞칸, DS=DS뒷칸.
 *  - 참여율: '인턴십' 텍스트가 있는 행에서 산학[4,6,7] / 인턴[10,12,13]. */
function parseYearStat(rows: string[][], year: number): ParsedYearStat | null {
  // 'DS' 셀이 있는 행들 = 재학생(0) / 산학목표인원(1) / 인턴목표인원(2). 정컴=DS앞칸, DS=DS뒷칸.
  const dsRows: { cse: number | null; ds: number | null }[] = [];
  for (let i = 0; i < Math.min(rows.length, 14) && dsRows.length < 3; i++) {
    const dsIdx = rows[i].findIndex((c) => (c || '').trim() === 'DS');
    if (dsIdx > 0) dsRows.push({ cse: num(rows[i][dsIdx - 1] || ''), ds: num(rows[i][dsIdx + 1] || '') });
  }
  const enrolledCSE = dsRows[0]?.cse ?? null, enrolledDS = dsRows[0]?.ds ?? null;
  const industryTargetCSE = dsRows[1]?.cse ?? null, industryTargetDS = dsRows[1]?.ds ?? null;
  const internTargetCSE = dsRows[2]?.cse ?? null, internTargetDS = dsRows[2]?.ds ?? null;

  let row: string[] | null = null;
  for (let i = 0; i < Math.min(rows.length, 18); i++) {
    if (rows[i].some((c) => (c || '').includes('인턴십'))) { row = rows[i]; break; }
  }
  const at = (r: string[] | null, i: number) => (r ? num(r[i] || '') : null);
  return {
    year, enrolledCSE, enrolledDS,
    industryTargetCSE, industryTargetDS, internTargetCSE, internTargetDS,
    industryTargetRatio: at(row, 4), industryAchievedRatio: at(row, 6), industryStudents: at(row, 7),
    internshipTargetRatio: at(row, 10), internshipAchievedRatio: at(row, 12), internshipStudents: at(row, 13),
  };
}

function parseProjectSheet(
  rows: string[][], year: number, dept: string | null, category: string,
  out: ParsedProject[],
) {
  const h = findHeader(rows, ['연번', '지도교수', '연구주제', '참여기업'], 2);
  if (h < 0) return;
  const col = colFinder(rows[h]);
  const ci = {
    seq: col('연번'), prof: col('지도교수'), lab: col('연구실명'),
    track: col('특성화트랙', '분류'), type: col('유형'),
    title: col('연구주제'), period: col('연구기간'),
    phd: col('박사생수'), master: col('석사생수'),
    sno: col('학번'), sname: col('학부생이름', '이름'),
    company: col('참여기업'),
  };
  let cur: ParsedProject | null = null;
  for (let r = h + 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (i: number) => (i >= 0 ? (row[i] || '').trim() : '');
    const seqRaw = get(ci.seq);
    // 새 프로젝트는 '연번'이 짧은 순번일 때만. 6자리+ 숫자는 학번(연속 학생 행)이라 새 프로젝트 아님.
    const isNew = !!seqRaw && !/\d{6,}/.test(seqRaw);
    if (isNew) {
      cur = {
        year, dept, category,
        type: normType(blank(get(ci.type))), title: blank(get(ci.title)), period: blank(get(ci.period)),
        track: blank(get(ci.track)), professorName: blank(get(ci.prof)), labName: blank(get(ci.lab)),
        cntPhd: num(get(ci.phd)), cntMaster: num(get(ci.master)), cntUndergrad: null,
        companyNameRaw: cleanCompany(get(ci.company)),
        students: [], studentNamesRaw: null,
      };
      out.push(cur);
    }
    if (!cur) continue;
    // 학번: '학번' 칸 우선, 없으면 '연번' 칸에 들어온 학번(연속 행) 사용
    let sno = get(ci.sno);
    if (!/\d{6,}/.test(sno) && /\d{6,}/.test(seqRaw)) sno = seqRaw;
    const sname = get(ci.sname);
    if (/\d{6,}/.test(sno)) {
      cur.students.push({ studentNo: sno.match(/\d{6,}/)![0], name: sname });
    } else if (sname) {
      const names = sname.split(/[,\s]+/).filter(Boolean);
      const prev = cur.studentNamesRaw ? cur.studentNamesRaw.split(',') : [];
      cur.studentNamesRaw = [...prev, ...names].join(',') || null;
    }
  }
}

function parseInternshipSheet(rows: string[][], year: number, out: ParsedInternship[]) {
  const h = findHeader(rows, ['인턴기업', '프로그램명', '인턴시작일', '교육방식'], 2);
  if (h < 0) return;
  const col = colFinder(rows[h]);
  const ci = {
    program: col('프로그램명'), company: col('인턴기업'),
    method: col('교육방식'), host: col('주관'), dom: col('국내외'), country: col('국가'),
    start: col('인턴시작일'), end: col('인턴종료일'), weeks: col('인턴기간'),
    hours: col('실습시간'), credits: col('인정학점'),
    cse: col('교육인원(정컴'), ds: col('교육인원(DS'), nonsw: col('교육인원(비SW'),
    empsw: col('연계취업자(SW'), empnonsw: col('연계취업자(비SW'),
  };
  for (let r = h + 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (i: number) => (i >= 0 ? (row[i] || '').trim() : '');
    const company = cleanCompany(get(ci.company));
    if (!company) continue;
    out.push({
      year, programName: blank(get(ci.program)), companyNameRaw: company,
      hostType: blank(get(ci.host)), method: blank(get(ci.method)),
      domestic: normDomestic(blank(get(ci.dom))), country: blank(get(ci.country)),
      startDate: blank(get(ci.start)), endDate: blank(get(ci.end)),
      weeks: num(get(ci.weeks)), hoursPerWeek: num(get(ci.hours)), credits: num(get(ci.credits)),
      cntCSE: num(get(ci.cse)), cntDS: num(get(ci.ds)), cntNonSW: num(get(ci.nonsw)),
      empSW: num(get(ci.empsw)), empNonSW: num(get(ci.empnonsw)),
    });
  }
}
