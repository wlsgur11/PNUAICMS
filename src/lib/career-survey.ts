/**
 * 진로현황 조사(구글폼 응답 엑셀) 읽기와 문항별 집계.
 * 해마다 질문이 조금씩 달라 문항을 고정하지 않고 머리글 그대로 담는다.
 * 앞 번호("6. ")만 떼서, 번호가 바뀌어도 같은 질문은 같은 글이 되게 한다.
 */
import type { SheetRows } from './records-xlsx';

export type Answer = { q: string; a: string };
export type SurveyRow = {
  studentNo: string;
  nameMasked: string | null;
  department: string | null;
  grade: string | null;
  submittedAt: string | null;
  answers: Answer[];
};
export type ParsedSurvey = { year: number | null; rows: SurveyRow[]; questions: string[]; skipped: number };

// 저장하지 않는 열. 연락처와 증빙 링크는 개인정보라 버리고, 성명과 학번은 따로 칸에 담는다
const DROP = /타임스탬프|성명|학번|연락처|증빙|응답해주셔서/;

export function mask(name: string): string {
  const n = name.trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + '*';
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
export const questionText = (h: string) => clean(h).replace(/^\d+\s*[.)]\s*/, '');

/** 학과 원문을 두 학부로 묶는다. 전공(컴공, 인공지능)까지 나누면 해마다 선택지가 달라 비교가 안 된다 */
export function deptGroup(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.includes('정보컴퓨터')) return '정보컴퓨터공학부';
  if (raw.includes('의생명')) return '의생명융합공학부';
  return clean(raw);
}

/** 구글폼 타임스탬프: 엑셀 날짜 일련번호 또는 "2024. 3. 5 오후 1:23:45" 같은 글 */
export function toDate(v: string): string | null {
  const s = v.trim();
  if (/^\d+(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}

/** 복수 응답을 나눈다. 괄호 안 쉼표("SW특강 (오픈소스 SW특강, PNU Mini Bootcamp 등)")는 나누지 않는다 */
export function splitChoices(a: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of a) {
    if (ch === '(' || ch === '（') depth++;
    if ((ch === ')' || ch === '）') && depth > 0) depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(clean).filter(Boolean);
}

export function parseSurvey(sheets: SheetRows[], fileName?: string): ParsedSurvey {
  const rows = (sheets[0]?.rows ?? []).filter((r) => r.some((c) => c && c.trim()));
  if (rows.length === 0) return { year: null, rows: [], questions: [], skipped: 0 };
  const head = rows[0].map((h) => clean(h ?? ''));
  // 질문 글 맨 앞으로만 찾는다. '학과, 교육원에서 지원해 주었으면' 같은 문항이 학과 열로 잡히면 안 된다
  const find = (re: RegExp) => head.findIndex((h) => re.test(questionText(h)));
  const iTime = find(/^타임스탬프/);
  const iName = find(/^성명/);
  const iNo = find(/^학번/);
  const iDept = find(/^(전공|학과|소속)/);
  const iGrade = find(/^(학년|졸업)/);
  if (iNo < 0) throw new Error('학번 열을 찾지 못했습니다. 구글폼 응답 엑셀인지 확인해 주세요.');

  const keep = head.map((h, i) => (h && !DROP.test(h) ? i : -1)).filter((i) => i >= 0);
  // 학과 열이 없는 해(2026 정보컴퓨터공학부 졸업예정자 조사)는 파일 이름에서 학과를 가져온다
  const fileDept = fileName && /정보컴퓨터/.test(fileName) && !/정보의생명/.test(fileName) ? '정보컴퓨터공학부' : null;

  const byNo = new Map<string, SurveyRow>();
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const cell = (i: number) => (i >= 0 ? clean(r[i] ?? '') : '');
    const studentNo = cell(iNo).replace(/\D/g, '');
    if (!studentNo) { skipped++; continue; }
    // 같은 학생이 두 번 냈으면 나중 응답을 쓴다(엑셀은 제출 순서)
    byNo.set(studentNo, {
      studentNo,
      nameMasked: cell(iName) ? mask(cell(iName)) : null,
      department: deptGroup(cell(iDept) || null) ?? fileDept,
      grade: cell(iGrade) || null,
      submittedAt: iTime >= 0 ? toDate(cell(iTime)) : null,
      answers: keep.map((i) => ({ q: questionText(head[i]), a: cell(i) })).filter((x) => x.a),
    });
  }

  const yearOf = fileName?.match(/20\d{2}/)?.[0];
  const firstTime = [...byNo.values()].find((x) => x.submittedAt)?.submittedAt;
  const year = yearOf ? Number(yearOf) : firstTime ? Number(firstTime.slice(0, 4)) : null;
  return { year, rows: [...byNo.values()], questions: keep.map((i) => questionText(head[i])), skipped };
}

export type QuestionStat =
  | { q: string; kind: 'choice'; respondents: number; items: { label: string; count: number }[] }
  | { q: string; kind: 'text'; respondents: number; texts: string[] };

const TOP = 10;

/**
 * 선택지 이름에 쉼표가 든 경우("창업, 취업 지원 프로그램 확대")를 다시 붙인다.
 * 앞 조각이 늘 뒤 조각 바로 앞에만 나오고, 뒤 조각도 늘 그 뒤에만 나오면 한 선택지로 본다.
 * ponytail: 우연히 3번 넘게 늘 붙어서 고른 두 선택지는 하나로 합쳐진다. 문제가 되면 선택지 목록을 받아 맞춘다
 */
function mergeSplitOptions(lists: string[][]): string[][] {
  for (;;) {
    const count = new Map<string, number>();
    const pair = new Map<string, number>();
    for (const l of lists) {
      l.forEach((x, i) => {
        count.set(x, (count.get(x) ?? 0) + 1);
        if (i + 1 < l.length) pair.set(x + '\u0000' + l[i + 1], (pair.get(x + '\u0000' + l[i + 1]) ?? 0) + 1);
      });
    }
    const hit = [...pair.entries()].find(([k, n]) => {
      const [a, b] = k.split('\u0000');
      return n >= 3 && count.get(a) === n && count.get(b) === n;
    });
    if (!hit) return lists;
    const [a, b] = hit[0].split('\u0000');
    lists = lists.map((l) => {
      const out: string[] = [];
      for (let i = 0; i < l.length; i++) {
        if (l[i] === a && l[i + 1] === b) { out.push(`${a}, ${b}`); i++; } else out.push(l[i]);
      }
      return out;
    });
  }
}

/**
 * 문항별 집계. 상위 10개 선택지가 언급의 60% 넘게 차지하면 막대, 아니면 자유 응답으로 본다.
 * 막대는 상위 10개와 기타로 묶는다. 비율의 분모는 응답자 수다(복수 응답이라 항목 합이 아니다).
 */
export function summarize(questions: string[], answers: Answer[][]): QuestionStat[] {
  return questions.map((q) => {
    const given = answers.map((as) => as.find((x) => x.q === q)?.a).filter((a): a is string => !!a);
    const lists = mergeSplitOptions(given.map((a) => [...new Set(splitChoices(a))]));
    const counts = new Map<string, number>();
    for (const l of lists) for (const c of l) counts.set(c, (counts.get(c) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((x, y) => y[1] - x[1]);
    const total = sorted.reduce((s, [, n]) => s + n, 0);
    const top = sorted.slice(0, TOP);
    if (total === 0 || top.reduce((s, [, n]) => s + n, 0) / total < 0.6) {
      return { q, kind: 'text', respondents: given.length, texts: given };
    }
    const items = top.map(([label, count]) => ({ label, count }));
    // 기타는 그 밖의 선택지를 하나라도 고른 사람 수
    const topSet = new Set(top.map(([l]) => l));
    const rest = lists.filter((l) => l.some((c) => !topSet.has(c))).length;
    if (rest > 0) items.push({ label: '기타', count: rest });
    return { q, kind: 'choice', respondents: given.length, items };
  });
}
