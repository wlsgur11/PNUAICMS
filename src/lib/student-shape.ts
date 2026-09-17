/**
 * src/lib/student-shape.ts
 * ---------------------------------------------------------
 * 학생 API 응답/페이로드 공용 타입 + 프로그램 정규화 헬퍼.
 *
 * 이름은 마스킹하지 않는다. 이 화면들은 모두 관리자 이상만 열 수 있어서
 * (requireRole('ADMIN')) 마스킹이 막아 주는 것이 없었고, 상담 상대를 이름으로
 * 찾지 못해 오히려 업무를 방해했다.
 */

/**
 * 사업 참여 목록. 전에는 program1~5 고정 다섯 칸이라 여섯 번째를 못 넣었고
 * '사업1' 이라는 라벨도 아무 뜻이 없었다. 이제 갯수 제한 없는 목록이다.
 *
 * DB 컬럼은 Json 그대로 둔다(배열도 Json 이다). 컬럼 타입을 바꾸면 이미 들어 있는
 * 값을 옮겨야 하는데, 배열로 저장하면 그럴 일이 없다.
 * 옛 {program1:'A',program2:'B'} 형태도 여기서 목록으로 읽어 준다.
 */
export function toProgramList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim());
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return ['program1', 'program2', 'program3', 'program4', 'program5']
      .map((k) => (typeof o[k] === 'string' ? (o[k] as string).trim() : ''))
      .filter(Boolean);
  }
  return [];
}

export type CounselingItem = { id?: string; type: string; counselDate: string; counselor: string; content: string };

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
  studentName: string;
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
  version: number; // 낙관적 락. 수정 요청에 그대로 실어 보낸다.
  name: string | null;
  department: string | null;
  major: string | null;
  grade: number | null;
  gpa: number | null;
  careerGoal: string | null;
  phone: string | null;
  email: string | null;
  certificates: string[];
  foreignLanguages: string[];
  clubs: string[];
  graduationDate: string | null;
  employmentCompany: string | null;
  employmentCompanyId: string | null; // 취업기업명 정확일치 매칭 (연결 B)
  swPrograms: string[];
  bootcampPrograms: string[];
  updatedAt: string;
  updatedBy: string | null;
  counselings: Required<CounselingItem>[];
  projects: StudentLinkedProject[];
  internships: StudentInternshipItem[];
};

