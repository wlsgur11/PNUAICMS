/**
 * TOPCIT 엑셀 읽기 자체 점검. `npx tsx scripts/check-topcit.ts [회차.xls ...]`
 * 파일을 주면 회차별 요약을 찍는다(개인정보가 든 파일이라 저장소에 넣지 않는다).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseTopcit, readXlsRows, dateFromName, matchStudents } from '../src/lib/topcit';

assert.equal(dateFromName('25회 (26.05.16).xls'), '2026-05-16');
const head = ['순번', '평가명', '수험 번호', '성명', '연락처', '출결', '수준', '총점', '데이터'];
const p = parseTopcit([
  head,
  ['1', '19회 정기평가', 'TP1', '홍길동', '010-1234-5678', '출석', '3', '624', '118'],
  head, // 중간에 다시 나오는 머리글
  ['2', '19회 정기평가', 'TP2', '김철수', '01011112222', '', '', '', ''],
]);
assert.equal(p.round, 19);
assert.equal(p.rows.length, 2);
assert.deepEqual(p.rows[0].scores, [{ area: '데이터', score: 118 }]);
assert.equal(p.rows[1].attended, false);
assert.deepEqual(matchStudents(p.rows, [
  { studentNo: 'A', name: '홍길동', nameMasked: null, phone: '010 1234 5678' },
  { studentNo: 'B', name: '김영희', nameMasked: null, phone: '010-1111-2222' }, // 번호는 같지만 이름이 다르다
]), ['A', null]);

for (const path of process.argv.slice(2)) {
  const buf = readFileSync(path);
  const t = parseTopcit(readXlsRows(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer), basename(path));
  assert.ok(t.round && t.examDate, `${path}: 회차나 시험일을 못 찾음`);
  const att = t.rows.filter((r) => r.attended);
  const avg = att.reduce((s, r) => s + (r.total ?? 0), 0) / (att.length || 1);
  console.log(`${t.round}회 ${t.examDate}: 접수 ${t.rows.length} 응시 ${att.length} 평균 ${avg.toFixed(0)} 영역 ${att[0]?.scores.map((s) => s.area).join('/') || '-'}`);
}
console.log('check-topcit OK');
