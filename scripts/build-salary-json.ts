/**
 * scripts/build-salary-json.ts
 * ---------------------------------------------------------
 * 공개 임금데이터(지방공기업 평균임금/신입평균임금 CSV, EUC-KR) →
 * 앱에 번들할 src/data/salary.json 으로 변환한다.
 *
 *  - 평균임금   → avgSalary (평균연봉)
 *  - 신입평균임금 → newcomerSalary (신입사원연봉)
 *  값은 "천원" 단위 → "만원"으로 환산해 사람이 읽는 라벨로 저장.
 *
 * 공개데이터이므로 결과 JSON 은 커밋·Vercel 배포 OK (개인정보 아님).
 *
 * 실행:
 *   npx tsx scripts/build-salary-json.ts "..\엑셀파일들"
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function normName(s: string): string {
  return (s || '').replace(/[\s㈜()（）　]/g, '').replace(/주식회사/g, '').toLowerCase();
}

// 1인당 연간 평균임금의 상식 범위(만원). 이 밖의 값은 공개데이터 이상치로 보고 버린다.
//  - 신규채용이 0~소수인 기관은 1인당 평균이 수억으로 튀거나 0이 됨 → 거름.
const SANE_MIN_MAN = 1000;  // 1,000만원 (= 천원 10,000)
const SANE_MAX_MAN = 15000; // 1.5억 (= 천원 150,000)

/** "51,384" (천원) → 5138 (만원). 범위 밖이면 null. */
function toMan(thousandWon: string): number | null {
  const n = Number((thousandWon || '').replace(/[^0-9.-]/g, ''));
  if (!n || n <= 0) return null;
  const man = Math.round(n / 10); // 천원 → 만원
  if (man < SANE_MIN_MAN || man > SANE_MAX_MAN) return null; // 이상치 제거
  return man;
}

/** 표 1개를 읽어 { normName: {name, label, year} } 로 (최신 '상식범위' 연도값 사용) */
function readWageTable(file: string): Record<string, { name: string; label: string; year: string }> {
  const text = new TextDecoder('euc-kr').decode(readFileSync(file));
  const rows = parseCsv(text);
  // 헤더: '기관명' 과 연도(2020~) 가 있는 행 탐색
  let h = -1;
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    if (rows[r].some((c) => c.includes('기관명'))) { h = r; break; }
  }
  if (h < 0) throw new Error(`헤더(기관명)를 못 찾음: ${file}`);
  const header = rows[h];
  const nameIdx = header.findIndex((c) => c.includes('기관명'));
  const yearCols = header.map((c, i) => ({ year: c.trim(), i })).filter((x) => /^\d{4}$/.test(x.year));

  const out: Record<string, { name: string; label: string; year: string }> = {};
  for (const r of rows.slice(h + 1)) {
    const name = (r[nameIdx] || '').trim();
    if (!name) continue;
    // 가장 최신 연도부터 '상식 범위' 값을 찾는다 (이상치/0 은 건너뜀)
    for (let y = yearCols.length - 1; y >= 0; y--) {
      const man = toMan(r[yearCols[y].i] || '');
      if (man != null) { out[normName(name)] = { name, label: `약 ${man.toLocaleString()}만원`, year: yearCols[y].year }; break; }
    }
  }
  return out;
}

function main() {
  const dir = process.argv[2] || join('..', '엑셀파일들');
  const avg = readWageTable(join(dir, '지방공기업평균임금.csv'));
  const newcomer = readWageTable(join(dir, '지방공기업신임평균임금.csv'));

  // 합치기
  const merged: Record<string, { name: string; avgSalary?: string; newcomerSalary?: string; year?: string }> = {};
  for (const [k, v] of Object.entries(avg)) merged[k] = { name: v.name, avgSalary: v.label, year: v.year };
  for (const [k, v] of Object.entries(newcomer)) {
    merged[k] = { ...(merged[k] ?? { name: v.name }), name: merged[k]?.name ?? v.name, newcomerSalary: v.label };
  }

  const outDir = join('src', 'data');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'salary.json');
  writeFileSync(outFile, JSON.stringify(merged, null, 0), 'utf-8');
  console.log(`✅ ${outFile} 생성 — ${Object.keys(merged).length}개 기관 (공개 임금데이터)`);
}

main();
