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
  phone: optStr,
  email: optStr,
  certificates: z.array(z.string().trim()).optional().default([]),
  foreignLanguages: z.array(z.string().trim()).optional().default([]),
  graduationDate: optStr,
  employmentCompany: optStr,
  swPrograms: programMapSchema,
  bootcampPrograms: programMapSchema,
  counselings: z.array(counselingItemSchema).max(5, '진로지도 상담은 최대 5건입니다.').optional().default([]),
  internships: z.array(studentInternshipItemSchema).optional().default([]),
});

// 수정은 학번 변경 불가 → studentNo 제외
export const studentUpdateSchema = studentCreateSchema.omit({ studentNo: true }).partial().extend({
  name: z.string().trim().min(1, '이름은 필수입니다.').optional(),
  counselings: z.array(counselingItemSchema).max(5, '진로지도 상담은 최대 5건입니다.').optional(),
  internships: z.array(studentInternshipItemSchema).optional(),
});
