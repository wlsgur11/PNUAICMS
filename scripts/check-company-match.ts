/**
 * 기업명 매칭 자가검사. DB 없이 돈다.
 *   npx tsx scripts/check-company-match.ts
 *
 * 실제로 엑셀에 이렇게 적혀 들어온 이름들이다. 정규화만으로 붙는 것과, 별칭이
 * 있어야 붙는 것을 갈라 둔다. 정규화 규칙을 건드렸을 때 여기서 걸린다.
 */
import assert from 'node:assert';
import { companyKeys, normCompany } from '../src/lib/normalize';

const matches = (cms: { name: string; aliases?: string[] }, raw: string) =>
  companyKeys(cms).includes(normCompany(raw));

// ── 정규화만으로 붙어야 하는 것 ──
assert.ok(matches({ name: '(주)폭씨' }, '(주)폭씨'));
assert.ok(matches({ name: '(주)폭씨' }, '(쭈)폭씨'), '쭈는 주 오타라 흡수해야 한다');
assert.ok(matches({ name: '에이치통계컨설팅' }, '주식회사 에이치통계컨설팅'));
assert.ok(matches({ name: 'AB180' }, 'ab180'));
assert.ok(matches({ name: '베어로보틱스코리아(미국)' }, '베어로보틱스코리아(미국)'));
assert.ok(matches({ name: 'M&D(부산 기장)' }, 'M&D(부산 기장)'));

// ── 정규화로는 못 붙는 것. 글자가 실제로 다르다 ──
assert.ok(!matches({ name: 'AB180' }, '에이비일팔공'));
assert.ok(!matches({ name: '베어로보틱스코리아(미국)' }, 'Bear Robotics'));
assert.ok(!matches({ name: '에이치통계컨설팅' }, 'H통계컨설팅'));
assert.ok(!matches({ name: '에이치통계컨설팅' }, '(주)에이치통계컨설팅연구소'));
assert.ok(!matches({ name: '(주)센디' }, '(주)센디(벤디츠)'));

// ── 별칭을 달면 붙는다 ──
assert.ok(matches({ name: 'AB180', aliases: ['에이비일팔공'] }, '에이비일팔공'));
assert.ok(matches({ name: '베어로보틱스코리아(미국)', aliases: ['Bear Robotics'] }, 'bear robotics'));
assert.ok(matches({ name: '(주)센디', aliases: ['(주)센디(벤디츠)'] }, '(주)센디(벤디츠)'));
assert.ok(matches({ name: '부산대병원 의학통계실', aliases: ['의학통계실', '의학통계부'] }, '의학통계부'));
// 부산대병원 은 별개 기업이라 의학통계실 실적을 가져가면 안 된다
assert.ok(!matches({ name: '부산대병원' }, '의학통계실'));

// ── 별칭이 이름과 겹쳐도 키는 하나 ──
assert.deepStrictEqual(companyKeys({ name: '(주)센디', aliases: ['센디', '  '] }), ['센디']);

console.log('✓ 기업명 매칭 검사 통과');
