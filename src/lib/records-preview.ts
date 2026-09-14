/**
 * src/lib/records-preview.ts
 * ---------------------------------------------------------
 * 실적 엑셀을 적재하면 무엇이 어떻게 바뀌는지 계산한다. 쓰기는 하지 않는다.
 *
 * 실적 적재는 project 와 internship 을 조건 없이 전부 지우고 엑셀 내용으로 다시
 * 만든다. 엑셀이 일부 연도만 담고 있으면 나머지 연도가 통째로 사라진다.
 *
 * 연도별 건수만으로는 부족하다. 58건에서 58건이 되어도 그 안에서 10건이 빠지고
 * 다른 10건이 들어왔을 수 있다. 건수만 세면 '변화 없음' 으로 보인다. 그래서
 * 건별로도 맞춰 본다.
 *
 * 순수 함수로 둔다. 업로드 화면(dryRun)과 명령줄 점검 스크립트가 같은 계산을
 * 쓰게 해서, 미리보기에 나온 숫자와 실제 적재 결과가 어긋나지 않게 한다.
 */
import type { ParseResult } from './records-parse';

/** 연도 하나의 변화. year 는 '2026' 또는 '미기재' */
export type YearDelta = { year: string; before: number; after: number };

/**
 * 연도 한 덩이의 대조 결과. git diff 가 파일 단위로 묶이듯 연도 단위로 묶는다.
 * 같은 해에서 빠진 건과 들어온 건이 붙어 있어야 무엇이 갈렸는지 읽힌다.
 */
export type YearDiff = {
  year: string;
  /** 양쪽에 다 있는 건. git diff 의 접힌 문맥 줄에 해당한다 */
  kept: number;
  /** 지금 있는데 엑셀에 없는 건. 적재하면 사라진다 (잘라서 보낸다) */
  removed: string[];
  /** 엑셀에만 있는 건. 새로 들어온다 (잘라서 보낸다) */
  added: string[];
  removedTotal: number;
  addedTotal: number;
};

export type SideDiff = {
  years: YearDiff[];
  kept: number;
  removedTotal: number;
  addedTotal: number;
};

export type RecordsPreview = {
  projects: YearDelta[];
  internships: YearDelta[];
  projectDiff: SideDiff;
  internshipDiff: SideDiff;
  /** 엑셀 전체현황 시트에 든 연도. 이 값은 연도별 덮어쓰기라 없는 연도는 남는다 */
  yearStats: number[];
  /** 지금 있는데 적재 후 0 이 되는 연도. 비어 있지 않으면 적재하면 안 된다 */
  lostYears: string[];
  totals: {
    projectsBefore: number; projectsAfter: number;
    internshipsBefore: number; internshipsAfter: number;
  };
};

type YearRow = { year: number | null };

/** 연도마다 한쪽에 보여 줄 최대 건수. 이보다 많으면 개수만 알린다 */
const LIST_CAP = 20;

/** 연도별 건수. 연도가 빈 행은 '미기재' 로 모은다 */
function countByYear(rows: YearRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = r.year == null ? '미기재' : String(r.year);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function deltas(before: YearRow[], after: YearRow[]): YearDelta[] {
  const b = countByYear(before);
  const a = countByYear(after);
  return [...new Set([...b.keys(), ...a.keys()])]
    .sort()
    .map((year) => ({ year, before: b.get(year) ?? 0, after: a.get(year) ?? 0 }));
}

/**
 * 대조용 키. 적재할 때마다 id 가 새로 생기므로 id 로는 맞출 수 없다.
 * 사람이 '같은 건' 이라고 부르는 기준인 연도, 기업, 제목을 쓴다.
 *
 * 제목이 한 글자라도 다르면 다른 건으로 잡힌다. 엑셀에서 띄어쓰기만 고쳐도
 * 사라진 건 하나와 새 건 하나로 나온다. 그래서 공백은 하나로 줄여 비교하고,
 * 그래도 남는 오차는 화면에 적어 둔다.
 */
const norm = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();
const keyOf = (year: number | null, company: string | null, title: string | null) =>
  `${year ?? ''}|${norm(company)}|${norm(title)}`;
/** 연도는 덩이 머리글에 있으므로 줄에는 기업명과 제목만 남긴다 */
const labelOf = (company: string | null, title: string | null) =>
  `${norm(company) || '기업미기재'} · ${norm(title) || '제목없음'}`;

type Keyed = { key: string; label: string; year: string };

function diffSides(before: Keyed[], after: Keyed[]): SideDiff {
  // 같은 키가 여럿일 수 있다(같은 기업이 같은 해에 같은 제목으로 두 건).
  // 개수까지 맞춰야 한 건만 빠진 경우를 잡는다
  const count = (rows: Keyed[]) => {
    const m = new Map<string, { n: number; row: Keyed }>();
    for (const r of rows) {
      const cur = m.get(r.key);
      if (cur) cur.n++;
      else m.set(r.key, { n: 1, row: r });
    }
    return m;
  };
  const b = count(before), a = count(after);

  const acc = new Map<string, { removed: string[]; added: string[]; kept: number }>();
  const slot = (year: string) => {
    let v = acc.get(year);
    if (!v) { v = { removed: [], added: [], kept: 0 }; acc.set(year, v); }
    return v;
  };

  for (const [k, { n, row }] of b) {
    const an = a.get(k)?.n ?? 0;
    const v = slot(row.year);
    v.kept += Math.min(n, an);
    for (let i = 0; i < n - an; i++) v.removed.push(row.label);
  }
  for (const [k, { n, row }] of a) {
    const bn = b.get(k)?.n ?? 0;
    if (n > bn) {
      const v = slot(row.year);
      for (let i = 0; i < n - bn; i++) v.added.push(row.label);
    }
  }

  const ko = (x: string, y: string) => x.localeCompare(y, 'ko');
  const years: YearDiff[] = [...acc.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([year, v]) => ({
      year,
      kept: v.kept,
      removed: [...v.removed].sort(ko).slice(0, LIST_CAP),
      added: [...v.added].sort(ko).slice(0, LIST_CAP),
      removedTotal: v.removed.length,
      addedTotal: v.added.length,
    }));

  return {
    years,
    kept: years.reduce((s, y) => s + y.kept, 0),
    removedTotal: years.reduce((s, y) => s + y.removedTotal, 0),
    addedTotal: years.reduce((s, y) => s + y.addedTotal, 0),
  };
}

const sum = (rows: YearDelta[], k: 'before' | 'after') => rows.reduce((s, r) => s + r[k], 0);

/** DB 에서 읽어 오는 최소 필드. 대조에 쓰는 것만 받는다 */
export type CurrentProject = { year: number | null; title: string | null; companyNameRaw: string | null; company: { name: string } | null };
export type CurrentInternship = { year: number | null; programName: string | null; companyNameRaw: string | null; company: { name: string } | null };

/** 엑셀은 기업명을 원본 문자열로만 갖는다. DB 쪽도 같은 기준으로 맞춘다 */
const companyOf = (r: { companyNameRaw: string | null; company: { name: string } | null }) =>
  r.company?.name ?? r.companyNameRaw;

export function buildRecordsPreview(
  parsed: ParseResult,
  curProjects: CurrentProject[],
  curInternships: CurrentInternship[],
): RecordsPreview {
  const projects = deltas(curProjects, parsed.projects);
  const internships = deltas(curInternships, parsed.internships);

  const yr = (y: number | null) => (y == null ? '미기재' : String(y));
  const projectDiff = diffSides(
    curProjects.map((r) => ({ key: keyOf(r.year, companyOf(r), r.title), label: labelOf(companyOf(r), r.title), year: yr(r.year) })),
    parsed.projects.map((r) => ({ key: keyOf(r.year, r.companyNameRaw, r.title), label: labelOf(r.companyNameRaw, r.title), year: yr(r.year) })),
  );
  const internshipDiff = diffSides(
    curInternships.map((r) => ({ key: keyOf(r.year, companyOf(r), r.programName), label: labelOf(companyOf(r), r.programName), year: yr(r.year) })),
    parsed.internships.map((r) => ({ key: keyOf(r.year, r.companyNameRaw, r.programName), label: labelOf(r.companyNameRaw, r.programName), year: yr(r.year) })),
  );

  // 있던 연도가 통째로 비는 것이 가장 큰 사고다. 건수가 줄기만 하는 것은
  // 자료가 정리됐을 수도 있어 경고로만 둔다
  const lost = (rows: YearDelta[]) => rows.filter((r) => r.before > 0 && r.after === 0).map((r) => r.year);
  return {
    projects,
    internships,
    projectDiff,
    internshipDiff,
    yearStats: [...new Set(parsed.yearStats.map((y) => y.year))].sort(),
    lostYears: [...new Set([...lost(projects), ...lost(internships)])].sort(),
    totals: {
      projectsBefore: sum(projects, 'before'), projectsAfter: sum(projects, 'after'),
      internshipsBefore: sum(internships, 'before'), internshipsAfter: sum(internships, 'after'),
    },
  };
}
