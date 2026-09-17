/**
 * src/lib/validation.ts
 * ---------------------------------------------------------
 * 입력 검증 스키마(zod). 서버에서 신뢰할 수 있는 입력만 통과시킨다.
 * 낙관적 락을 쓰는 update 계열은 version 을 필수로 받는다.
 */
import { z } from 'zod';
import { ENUMS } from './enums';

const optStr = z.string().trim().optional().nullable();

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1, '기관명은 필수입니다.'),
  // 실적 엑셀에 다르게 적혀 오는 이름들(매칭 전용). 공백·빈 줄·중복은 여기서 턴다
  aliases: z.array(z.string()).optional()
    .transform((a) => (a ? [...new Set(a.map((s) => s.trim()).filter(Boolean))] : undefined)),
  joinYear: z.coerce.number().int().optional().nullable(),
  region: z.enum(ENUMS.REGION as unknown as [string, ...string[]]).optional().nullable(),
  addressDetail: optStr,
  orgType: z.enum(ENUMS.ORG_TYPE as unknown as [string, ...string[]]).optional().nullable(),
  employeeCount: optStr,
  revenueScale: optStr,
  avgSalary: optStr,
  newcomerSalary: optStr,
  homepage: optStr,
  mainIndustry: optStr,
  aiField: optStr,
  professor1: optStr,
  professor2: optStr,
  mou: z.boolean().optional(),
  priority: z.enum(ENUMS.PRIORITY as unknown as [string, ...string[]]).optional().nullable(),
  status: z.enum(ENUMS.STATUS as unknown as [string, ...string[]]).optional(),
  summary: optStr,
  note: optStr,
  // 자동조회를 등록 시점에 함께 돌릴지 여부 (이름 입력→자동 채움 흐름)
  autoLookup: z.boolean().optional(),
});

export const companyUpdateSchema = companyCreateSchema.partial().extend({
  version: z.coerce.number().int(), // 낙관적 락 필수
  isActive: z.boolean().optional(),
});

export const collaborationSchema = z.object({
  internship: z.boolean().optional(),
  industryProject: z.boolean().optional(),
  curriculumCommittee: z.boolean().optional(),
  guestLecture: z.boolean().optional(),
  employment: z.boolean().optional(),
  fieldTrainingOrg: z.boolean().optional(),
  overseasEducation: z.boolean().optional(),
  valueSpread: z.boolean().optional(),
  startup: z.boolean().optional(),
  etc: z.boolean().optional(),
  requiredSkills: optStr,
  preferredMajor: optStr,
  capacity: z.coerce.number().int().optional().nullable(),
  memo: optStr,
  // MOU 는 Company 필드지만 표시·수정을 협업정보 카드에서 하므로 여기서 함께 받는다.
  mou: z.boolean().optional(),
  version: z.coerce.number().int().optional(),
});

export const personCreateSchema = z.object({
  name: z.string().trim().min(1, '실무자 이름은 필수입니다.'),
  dept: optStr,
  position: optStr,
  email: optStr,
  phone: optStr,
  contactPref: z.enum(ENUMS.CONTACT_PREF as unknown as [string, ...string[]]).optional().nullable(),
  lastContactAt: optStr,
  memo: optStr,
  note: optStr,
});
export const personUpdateSchema = personCreateSchema.partial().extend({
  version: z.coerce.number().int(),
});

export const historyCreateSchema = z.object({
  personId: optStr,
  professor: optStr,
  business: z.enum(ENUMS.BUSINESS as unknown as [string, ...string[]]).optional().nullable(),
  contactDate: z.string().trim().min(1, '컨택일자는 필수입니다.'),
  method: z.enum(ENUMS.CONTACT_METHOD as unknown as [string, ...string[]]).optional().nullable(),
  content: optStr,
  histStatus: z.enum(ENUMS.HISTORY_STATUS as unknown as [string, ...string[]]).optional(),
});

export const historyUpdateSchema = z.object({
  personId: optStr,
  professor: optStr,
  business: z.enum(ENUMS.BUSINESS as unknown as [string, ...string[]]).optional().nullable(),
  contactDate: z.string().trim().min(1).optional(),
  method: z.enum(ENUMS.CONTACT_METHOD as unknown as [string, ...string[]]).optional().nullable(),
  content: optStr,
  histStatus: z.enum(ENUMS.HISTORY_STATUS as unknown as [string, ...string[]]).optional(),
  version: z.coerce.number().int(),
});

// ── 학생 이력 ────────────────────────────────────────────
const programMapSchema = z
  .object({
    program1: z.string().optional(),
    program2: z.string().optional(),
    program3: z.string().optional(),
    program4: z.string().optional(),
    program5: z.string().optional(),
  })
  .partial()
  .optional()
  .nullable();

export const counselingItemSchema = z.object({
  id: z.string().optional(),
  counselDate: z.string().trim().optional().default(''),
  counselor: z.string().trim().optional().default(''),
  content: z.string().trim().optional().default(''),
});

/**
 * 상담 한 건. 학생 상세에서 바로 넣고 고친다.
 * 건수 상한은 두지 않는다. 상담이 이 시스템의 주 업무라 만날 때마다 쌓인다.
 */
export const counselingSchema = z.object({
  counselDate: z.string().trim().min(1, '상담일자는 필수입니다.'),
  counselor: optStr,
  content: optStr,
});

export const studentInternshipItemSchema = z.object({
  id: z.string().optional(),
  internshipType: z.string().trim().optional().default(''),
  companyName: z.string().trim().optional().default(''),
  durationWeeks: z.coerce.number().int().optional().nullable(),
  activityDate: z.string().trim().optional().default(''),
});

export const studentCreateSchema = z.object({
  studentNo: z.string().trim().min(1, '학번은 필수입니다.'),
  name: z.string().trim().min(1, '이름은 필수입니다.'),
  department: optStr,
  major: optStr,
  grade: z.coerce.number().int().min(1).max(4).optional().nullable(),
  gpa: z.coerce.number().min(0).max(4.5).optional().nullable(),
  careerGoal: z.enum(ENUMS.CAREER_GOAL as unknown as [string, ...string[]]).optional().nullable(),
  // 신규 등록은 연락처를 받는다. 상담하면서 적어 두시려고 필수로 둔 칸이다.
  // 수정에는 안 걸린다(studentUpdateSchema 가 partial). 실적 엑셀에서 들어온 학생은
  // 연락처가 비어 있는데, 거기까지 막으면 학과·학년조차 못 고친다
  phone: z.string({ required_error: '전화번호는 필수입니다.' }).trim().min(1, '전화번호는 필수입니다.'),
  email: z.string({ required_error: '이메일은 필수입니다.' }).trim().min(1, '이메일은 필수입니다.'),
  certificates: z.array(z.string().trim()).optional().default([]),
  foreignLanguages: z.array(z.string().trim()).optional().default([]),
  clubs: z.array(z.string().trim()).optional().default([]),
  graduationDate: optStr,
  employmentCompany: optStr,
  swPrograms: programMapSchema,
  bootcampPrograms: programMapSchema,
  // 상담 건수 상한 없음. 예전엔 5건까지였는데 상담이 주 업무라 금방 막혔다
  counselings: z.array(counselingItemSchema).optional().default([]),
  internships: z.array(studentInternshipItemSchema).optional().default([]),
});

// 수정은 학번 변경 불가 → studentNo 제외. version 은 낙관적 락이라 필수.
export const studentUpdateSchema = studentCreateSchema.omit({ studentNo: true, counselings: true }).partial().extend({
  version: z.coerce
    .number({ invalid_type_error: '수정 요청에 버전 정보가 없습니다. 새로고침 후 다시 시도하세요.' })
    .int(),
  name: z.string().trim().min(1, '이름은 필수입니다.').optional(),
  // 학번을 고칠 수 있게 한다. 교수님이 진짜 학번을 모르실 때 임의로 넣어 두시는데,
  // 기본키라 한번 넣으면 못 고쳐서 지우고 다시 만드는 수밖에 없었다(상담도 함께 날아갔다)
  studentNo: z.string().trim().min(1, '학번은 비울 수 없습니다.').optional(),
  // 상담은 학생 상세에서 따로 다룬다(/api/students/:no/counselings). 여기서 받으면
  // 수정 폼을 저장할 때마다 그동안 따로 넣은 상담이 통째로 덮인다
  internships: z.array(studentInternshipItemSchema).optional(),
});
