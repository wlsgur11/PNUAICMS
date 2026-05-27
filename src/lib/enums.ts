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
} as const;

// 협업정보 boolean 8종 — 화면 라벨 매핑 (Prisma 필드명 ↔ 한글 라벨)
export const COLLAB_FIELDS: { key: string; label: string }[] = [
  { key: 'internship', label: '인턴십' },
  { key: 'industryProject', label: '산학프로젝트' },
  { key: 'curriculumCommittee', label: '교과과정혁신위원회' },
  { key: 'guestLecture', label: '특강연계' },
  { key: 'employment', label: '채용연계' },
  { key: 'fieldTrainingOrg', label: '표준현장실습기관 등록' },
  { key: 'overseasEducation', label: '해외교육' },
  { key: 'valueSpread', label: '가치확산' },
];
