/**
 * src/lib/student-shape.ts
 * ---------------------------------------------------------
 * 학생 API 응답/페이로드 공용 타입 + 마스킹·프로그램 정규화 헬퍼.
 */
import { maskName } from './list-filters';

export type ProgramMap = { program1: string; program2: string; program3: string; program4: string; program5: string };

export const EMPTY_PROGRAMS: ProgramMap = { program1: '', program2: '', program3: '', program4: '', program5: '' };

/** Json(any) → 안전한 ProgramMap */
export function toProgramMap(v: unknown): ProgramMap {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const pick = (k: keyof ProgramMap) => (typeof o[k] === 'string' ? (o[k] as string) : '');
  return { program1: pick('program1'), program2: pick('program2'), program3: pick('program3'), program4: pick('program4'), program5: pick('program5') };
}

export type CounselingItem = { id?: string; counselDate: string; counselor: string; content: string };

export type StudentInternshipItem = {
  id?: string;
  internshipType: string;
  companyName: string;
  companyId: string | null; // companyName 정확일치 매칭 시 기업 id
  durationWeeks: number | null;
  activityDate: string;
};

export type StudentListRow = {
  studentNo: string;
  nameMasked: string;
  department: string | null;
  major: string | null;
  grade: number | null;
  careerGoal: string | null;
  graduationDate: string | null;
  counselCount: number;
  updatedAt: string;
};

export type StudentLinkedProject = {
  id: string;
  year: number | null;
  title: string | null;
  period: string | null;
  professorName: string | null;
  companyId: string | null;
  companyName: string;
};

export type StudentDetail = {
  studentNo: string;
  name: string | null;
  nameMasked: string | null;
  department: string | null;
  major: string | null;
  grade: number | null;
  gpa: number | null;
  careerGoal: string | null;
  phone: string | null;
  email: string | null;
  certificates: string[];
  foreignLanguages: string[];
  graduationDate: string | null;
  employmentCompany: string | null;
  employmentCompanyId: string | null; // 취업기업명 정확일치 매칭 (연결 B)
  swPrograms: ProgramMap;
  bootcampPrograms: ProgramMap;
  updatedAt: string;
  updatedBy: string | null;
  counselings: Required<CounselingItem>[];
  projects: StudentLinkedProject[];
  internships: StudentInternshipItem[];
};

/** 실명 우선 마스킹(없으면 기존 nameMasked) */
export function displayMasked(name: string | null, nameMasked: string | null): string {
  if (name && name.trim()) return maskName(name);
  return nameMasked || '-';
}
