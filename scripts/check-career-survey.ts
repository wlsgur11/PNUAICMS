/**
 * 진로조사 엑셀 읽기 자체 점검. `npx tsx scripts/check-career-survey.ts [응답.xlsx ...]`
 * 파일을 주면 문항과 집계 모양을 찍어 본다(개인정보가 든 파일이라 저장소에 넣지 않는다).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { readSheets } from '../src/lib/records-xlsx';
import { parseSurvey, splitChoices, summarize, toDate, questionText, deptGroup, mask } from '../src/lib/career-survey';

assert.deepEqual(splitChoices('SW특강 (오픈소스 SW특강, PNU Mini Bootcamp 등), SW역량평가 (TOPCIT, PCC)'),
  ['SW특강 (오픈소스 SW특강, PNU Mini Bootcamp 등)', 'SW역량평가 (TOPCIT, PCC)']);
assert.deepEqual(splitChoices('연봉, 워라밸(일과 삶의 균형)'), ['연봉', '워라밸(일과 삶의 균형)']);
assert.equal(toDate('45356.5'), '2024-03-05');
assert.equal(toDate('2025. 4. 7 오후 3:01:02'), '2025-04-07');
assert.equal(questionText('6.  취업을 희망하는 직무분야'), '취업을 희망하는 직무분야');
assert.equal(deptGroup('정보컴퓨터공학부 인공지능전공'), '정보컴퓨터공학부');
assert.equal(mask('홍길동'), '홍*동');

const stats = summarize(['형태'], [[{ q: '형태', a: 'IT 대기업, 공기업' }], [{ q: '형태', a: 'IT 대기업' }]]);
assert.equal(stats[0].kind, 'choice');
assert.deepEqual(stats[0].kind === 'choice' && stats[0].items[0], { label: 'IT 대기업', count: 2 });

for (const path of process.argv.slice(2)) {
  const buf = readFileSync(path);
  const p = parseSurvey(readSheets(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer), basename(path));
  assert.ok(p.year, `${path}: 연도를 못 찾음`);
  assert.ok(p.rows.length > 0, `${path}: 응답 0건`);
  assert.ok(p.rows.every((r) => !r.answers.some((a) => /010-?\d{4}/.test(a.a))), `${path}: 연락처가 남음`);
  const depts = new Map<string, number>();
  for (const r of p.rows) depts.set(r.department ?? '(없음)', (depts.get(r.department ?? '(없음)') ?? 0) + 1);
  console.log(`${basename(path)}: ${p.year}년 ${p.rows.length}명 (건너뜀 ${p.skipped})`, Object.fromEntries(depts));
  for (const s of summarize(p.questions, p.rows.map((r) => r.answers))) {
    console.log(`  [${s.kind}] ${s.q.slice(0, 40)} 응답 ${s.respondents}`,
      s.kind === 'choice' ? s.items.slice(0, 3).map((i) => `${i.label.slice(0, 15)}:${i.count}`).join(' / ') : `${s.texts.length}건`);
  }
}
console.log('check-career-survey OK');
