/**
 * 입력 검증 스키마 점검: npx tsx scripts/check-validation.ts
 * zod 메이저 업그레이드처럼 검증 동작이 바뀔 수 있을 때 돌린다. 실패하면 assert 가 멈춘다.
 */
import assert from 'node:assert/strict';
import { studentCreateSchema, studentUpdateSchema, companyUpdateSchema } from '../src/lib/validation';

// 수정 요청에 안 보낸 칸은 결과에도 없어야 한다. 있으면 route 가 그 칸을 덮어쓴다
const upd = studentUpdateSchema.parse({ version: 3, name: '홍길동' });
for (const k of ['certificates', 'foreignLanguages', 'clubs', 'internships', 'swPrograms', 'phone']) {
  assert.equal(k in upd && (upd as Record<string, unknown>)[k] !== undefined, false, `수정에 없던 ${k} 가 채워짐`);
}
assert.deepEqual(studentUpdateSchema.parse({ version: 1, clubs: [' 밴드 '] }).clubs, ['밴드']);

// 버전 없는 수정은 안내 문구로 막는다
const noVer = studentUpdateSchema.safeParse({ name: 'a' });
assert.equal(noVer.success, false);
assert.match(noVer.error!.issues[0].message, /버전 정보/);

// 신규 등록은 전화번호, 이메일 필수. 없으면 우리 문구가 나온다
const noPhone = studentCreateSchema.safeParse({ studentNo: '1', name: 'a', email: 'x' });
assert.equal(noPhone.success, false);
assert.equal(noPhone.error!.issues[0].message, '전화번호는 필수입니다.');
const ok = studentCreateSchema.parse({ studentNo: '1', name: 'a', phone: '010', email: 'x' });
assert.deepEqual(ok.certificates, []); // 등록에서는 기본값이 그대로 채워진다

// 기업 수정도 안 보낸 칸은 비어 있어야 한다
const cu = companyUpdateSchema.parse({ version: 1, name: 'A' });
assert.equal(cu.aliases, undefined);
assert.equal(cu.mou, undefined);

console.log('validation OK');
