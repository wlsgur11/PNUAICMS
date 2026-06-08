/**
 * src/lib/normalize.ts
 * ---------------------------------------------------------
 * 회사명 정규화(매칭용). 공백·괄호·법인표기 제거 + 소문자.
 * DART 매칭(lookup.ts)과 실적 기업 매칭(records-import.ts)이 공유.
 */
export function normName(s: string): string {
  return (s || '')
    .replace(/[\s㈜()（）　]/g, '')
    .replace(/주식회사|유한회사|재단법인|사단법인/g, '')
    .toLowerCase();
}

/**
 * 실적 기업 매칭용 강한 정규화.
 * normName 과 달리 '(주)' '(유)' '(재)' '(사)' 같은 괄호 법인표기를 통째로 제거해
 * '(주)비멕스' / '㈜비멕스' / '비멕스(주)' 가 모두 같은 키가 되게 한다.
 * (DART 캐시는 기존 normName 으로 저장돼 있어 그쪽은 건드리지 않는다.)
 */
export function normCompany(s: string): string {
  return (s || '')
    .replace(/[(（]\s*(주식회사|유한회사|주|유|재|사)\s*[)）]/g, '') // (주) (유) (재) (사) ...
    .replace(/㈜|주식회사|유한회사|재단법인|사단법인/g, '')
    .replace(/[\s()（）　]/g, '')
    .toLowerCase();
}
