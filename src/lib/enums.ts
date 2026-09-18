/**
 * src/lib/enums.ts
 * ---------------------------------------------------------
 * 드롭다운/검증용 enum 마스터. (v1 Constants.gs 의 ENUMS 이식)
 * 서버 검증과 클라이언트 select 가 같은 출처를 쓰도록 한 곳에 둔다.
 */
export const ENUMS = {
  REGION: ['부산', '울산', '경남', '수도권', '기타'],
  ORG_TYPE: ['기업', '공공기관', '연구소', '대학'],
  PRIORITY: ['A', 'B', 'C'],
  STATUS: ['미접촉', '연락완료', '미팅예정', '협의중', '협약완료', '보류', '종료'],
  CONTACT_METHOD: ['미팅', '전화', '이메일', '기타'],
  CONTACT_PREF: ['미팅', '전화', '이메일'],
  HISTORY_STATUS: ['논의중', '진행완료'],
  BUSINESS: ['중심대학', '부트캠프'], // 사업단(관심사업분야)
  CAREER_GOAL: ['취업(대기업)', '취업(공사)', '취업(공무원)', '취업(중소중견기업)', '창업', '대학원진학'],
  COUNSEL_TYPE: ['진로상담', '창업상담'],
  INTERNSHIP_TYPE: ['기업체험형', '기업문제해결형', '도약수업', '표준현장실습학기제', 'ICT(국내)', 'ICT(글로벌)'],
} as const;

/**
 * 학년. 숫자로 저장하고 라벨만 따로 붙인다.
 * 1~4 만 고를 수 있어서 초과학기나 대학원생을 아예 등록하지 못했다.
 * 진로 상담은 오히려 졸업을 앞둔 학생이 많다.
 * 숫자를 유지하는 이유는 학년별 분포와 '3학년 이상' 집계가 크기 비교를 쓰기 때문이다.
 */
export const GRADES: { value: number; label: string }[] = [
  { value: 1, label: '1학년' },
  { value: 2, label: '2학년' },
  { value: 3, label: '3학년' },
  { value: 4, label: '4학년' },
  { value: 5, label: '초과학기' },
  { value: 6, label: '대학원' },
];

/** 학년 표시. 저장된 숫자에 라벨이 없으면 'N학년' 으로 둔다 */
export function gradeLabel(g: number | null | undefined): string {
  if (g == null) return '-';
  return GRADES.find((x) => x.value === g)?.label ?? `${g}학년`;
}

// 협업정보 boolean — 화면 라벨 매핑 (Prisma 필드명 ↔ 한글 라벨)
export const COLLAB_FIELDS: { key: string; label: string }[] = [
  { key: 'internship', label: '인턴십' },
  { key: 'industryProject', label: '산학프로젝트' },
  { key: 'curriculumCommittee', label: '교과과정혁신위원회' },
  { key: 'guestLecture', label: '특강연계' },
  { key: 'employment', label: '채용연계' },
  { key: 'fieldTrainingOrg', label: '표준현장실습기관 등록' },
  { key: 'overseasEducation', label: '해외교육' },
  { key: 'valueSpread', label: '가치확산' },
  { key: 'startup', label: '창업' },
  { key: 'etc', label: '기타' },
];
