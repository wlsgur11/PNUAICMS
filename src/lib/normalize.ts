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
    // '쭈' 는 '주' 오타다(엑셀에 '(쭈)폭씨' 로 들어온다). 같은 자리의 한 글자라 흡수한다
    .replace(/[(（]\s*(주식회사|유한회사|주|쭈|유|재|사)\s*[)）]/g, '') // (주) (유) (재) (사) ...
    .replace(/㈜|주식회사|유한회사|재단법인|사단법인/g, '')
    .replace(/[\s()（）　]/g, '')
    .toLowerCase();
}

/**
 * 기업 하나가 가진 매칭 키(이름 + 별칭).
 *
 * 정규화로는 못 넘는 표기가 있다. 'Bear Robotics' 와 '베어로보틱스코리아', 'AB180' 과
 * '에이비일팔공' 은 글자가 실제로 다르다. 엑셀을 고칠 수 없으니 기업 쪽에 "이렇게도
 * 적혀 온다" 를 적어 두고 매칭 때 같이 본다.
 */
export function companyKeys(c: { name: string; aliases?: string[] | null }): string[] {
  const keys = [c.name, ...(c.aliases ?? [])].map(normCompany).filter(Boolean);
  return [...new Set(keys)];
}
