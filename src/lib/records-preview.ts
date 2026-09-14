/**
 * src/lib/records-preview.ts
 * ---------------------------------------------------------
 * 실적 엑셀을 적재하면 무엇이 어떻게 바뀌는지 계산한다. 쓰기는 하지 않는다.
 *
 * 실적 적재는 project 와 internship 을 조건 없이 전부 지우고 엑셀 내용으로 다시
 * 만든다. 엑셀이 일부 연도만 담고 있으면 나머지 연도가 통째로 사라진다.
 * 그래서 적재 전에 '어느 연도가 사라지는가' 를 먼저 답할 수 있어야 한다.
 *
 * 순수 함수로 둔다. 업로드 화면(dryRun)과 명령줄 점검 스크립트가 같은 계산을
 * 쓰게 해서, 미리보기에 나온 숫자와 실제 적재 결과가 어긋나지 않게 한다.
 */
import type { ParseResult } from './records-parse';

/** 연도 하나의 변화. year 는 '2026' 또는 '미기재' */
export type YearDelta = { year: string; before: number; after: number };

export type RecordsPreview = {
  projects: YearDelta[];
  internships: YearDelta[];
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

const sum = (rows: YearDelta[], k: 'before' | 'after') => rows.reduce((s, r) => s + r[k], 0);

export function buildRecordsPreview(
  parsed: ParseResult,
  curProjects: YearRow[],
  curInternships: YearRow[],
): RecordsPreview {
  const projects = deltas(curProjects, parsed.projects);
  const internships = deltas(curInternships, parsed.internships);
  // 있던 연도가 통째로 비는 것이 이 미리보기의 핵심 판정이다.
  // 건수가 줄기만 하는 것은 자료가 정리됐을 수도 있어 경고로만 둔다
  const lost = (rows: YearDelta[]) => rows.filter((r) => r.before > 0 && r.after === 0).map((r) => r.year);
  return {
    projects,
    internships,
    yearStats: [...new Set(parsed.yearStats.map((y) => y.year))].sort(),
    lostYears: [...new Set([...lost(projects), ...lost(internships)])].sort(),
    totals: {
      projectsBefore: sum(projects, 'before'), projectsAfter: sum(projects, 'after'),
      internshipsBefore: sum(internships, 'before'), internshipsAfter: sum(internships, 'after'),
    },
  };
}
