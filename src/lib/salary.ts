/**
 * src/lib/salary.ts
 * ---------------------------------------------------------
 * 공개 임금데이터(번들된 salary.json) 기반 급여 조회.
 *  기관명 → 평균연봉/신입사원연봉 라벨.
 * 주로 지방공기업/공공기관이 매칭됨 (DART 상장사 보완).
 * 개인정보 아님 → Vercel 데모에서도 동작.
 *
 * salary.json 갱신: npx tsx scripts/build-salary-json.ts "..\엑셀파일들"
 */
import salaryData from '@/data/salary.json';

type Entry = { name: string; avgSalary?: string; newcomerSalary?: string; year?: string };
const DATA = salaryData as Record<string, Entry>;

function norm(s: string): string {
  return (s || '').replace(/[\s㈜()（）　]/g, '').replace(/주식회사/g, '').toLowerCase();
}

export function salaryLookup(name: string): (Entry & { matchedName: string }) | null {
  const key = norm(name);
  if (!key) return null;
  if (DATA[key]) return { ...DATA[key], matchedName: DATA[key].name };
  // 부분 일치 (양방향) — 너무 짧은 키는 오매칭 방지
  if (key.length >= 4) {
    for (const [k, v] of Object.entries(DATA)) {
      if (k.includes(key) || key.includes(k)) return { ...v, matchedName: v.name };
    }
  }
  return null;
}
