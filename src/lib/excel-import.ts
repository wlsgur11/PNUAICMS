/**
 * src/lib/excel-import.ts
 * ---------------------------------------------------------
 * 엑셀(.xlsx) 헤더 컬럼명을 우리 데이터 모델(Company/Collaboration/ContactPerson) 필드로 매핑.
 * 원본 업체정보 엑셀(연번/기관명/소재지/인턴십/담당자명/대표자명 …)과 우리가 export 하는
 * 양식(코드/기관명/지역/유형 …) 둘 다 인식하도록 매핑을 풍부하게 두었다.
 */

export type HeaderCat =
  | { kind: 'company'; field: string }
  | { kind: 'collabBool'; field: string }
  | { kind: 'collabStr'; field: string }
  | { kind: 'collabNum'; field: string }
  | { kind: 'contact'; field: 'name' | 'position' | 'phone' | 'email' | 'dept' }
  | { kind: 'ceo'; field: 'name' | 'phone' | 'email' }
  | { kind: 'memo'; field: 'startup' | 'etc' }
  | { kind: 'companyNote'; field: '국내외' | '국가' }; // 기업 비고로 흡수

// 헤더 정규화: 공백/줄바꿈/괄호 안 한정자 제거 후 소문자
function norm(h: string): string {
  return String(h || '')
    .replace(/[\s\r\n]/g, '')
    .replace(/\([^)]*\)/g, '') // 괄호와 내용 제거
    .toLowerCase();
}

// 정확 일치 우선 매핑(정규화 키)
const EXACT: Record<string, HeaderCat> = {
  // 기업
  '기관명': { kind: 'company', field: 'name' },
  '기업명': { kind: 'company', field: 'name' },
  '사업참여연도': { kind: 'company', field: 'joinYear' },
  '연도': { kind: 'company', field: 'joinYear' },
  '지역': { kind: 'company', field: 'region' },
  '지역구분': { kind: 'company', field: 'region' },
  '소재지': { kind: 'company', field: 'addressDetail' },
  '소재지상세': { kind: 'company', field: 'addressDetail' },
  '주소': { kind: 'company', field: 'addressDetail' },
  '유형': { kind: 'company', field: 'orgType' },
  '직원수': { kind: 'company', field: 'employeeCount' },
  '매출규모': { kind: 'company', field: 'revenueScale' },
  '평균연봉': { kind: 'company', field: 'avgSalary' },
  '신입사원연봉': { kind: 'company', field: 'newcomerSalary' },
  '신입연봉': { kind: 'company', field: 'newcomerSalary' },
  '신입초임': { kind: 'company', field: 'newcomerSalary' },
  '홈페이지': { kind: 'company', field: 'homepage' },
  '주요산업': { kind: 'company', field: 'mainIndustry' },
  '주요산업분야': { kind: 'company', field: 'mainIndustry' },
  'ai기술분야': { kind: 'company', field: 'aiField' },
  'ai분야': { kind: 'company', field: 'aiField' },
  '담당교수1': { kind: 'company', field: 'professor1' },
  '교육원담당교수명1': { kind: 'company', field: 'professor1' },
  '담당교수': { kind: 'company', field: 'professor1' },
  '담당교수2': { kind: 'company', field: 'professor2' },
  '교육원담당교수명2': { kind: 'company', field: 'professor2' },
  'mou체결': { kind: 'company', field: 'mou' },
  'mou체결여부': { kind: 'company', field: 'mou' },
  'mou': { kind: 'company', field: 'mou' },
  '협력우선순위': { kind: 'company', field: 'priority' },
  '우선순위': { kind: 'company', field: 'priority' },
  '진행상태': { kind: 'company', field: 'status' },
  '비고': { kind: 'company', field: 'note' },

  // 협업 boolean
  '인턴십': { kind: 'collabBool', field: 'internship' },
  '인턴십여부': { kind: 'collabBool', field: 'internship' },
  '해외교육': { kind: 'collabBool', field: 'overseasEducation' },
  '해외교육여부': { kind: 'collabBool', field: 'overseasEducation' },
  '산학프로젝트': { kind: 'collabBool', field: 'industryProject' },
  '산학협력프로젝트': { kind: 'collabBool', field: 'industryProject' },
  '산학프로젝트여부': { kind: 'collabBool', field: 'industryProject' },
  '교과혁신위': { kind: 'collabBool', field: 'curriculumCommittee' },
  '교과과정혁신위원회': { kind: 'collabBool', field: 'curriculumCommittee' },
  '교과과정혁신위원회여부': { kind: 'collabBool', field: 'curriculumCommittee' },
  '특강': { kind: 'collabBool', field: 'guestLecture' },
  '특강연계': { kind: 'collabBool', field: 'guestLecture' },
  '특강연계여부': { kind: 'collabBool', field: 'guestLecture' },
  '채용연계': { kind: 'collabBool', field: 'employment' },
  '채용연계여부': { kind: 'collabBool', field: 'employment' },
  '현장실습': { kind: 'collabBool', field: 'fieldTrainingOrg' },
  '표준현장실습기관': { kind: 'collabBool', field: 'fieldTrainingOrg' },
  '표준현장실습기관등록': { kind: 'collabBool', field: 'fieldTrainingOrg' },
  '가치확산': { kind: 'collabBool', field: 'valueSpread' },
  '가치확산여부': { kind: 'collabBool', field: 'valueSpread' },

  // 협업 텍스트/숫자
  '요구역량': { kind: 'collabStr', field: 'requiredSkills' },
  '우대전공': { kind: 'collabStr', field: 'preferredMajor' },
  '협력메모': { kind: 'collabStr', field: 'memo' },
  '수용가능인원': { kind: 'collabNum', field: 'capacity' },

  // 창업/기타도 boolean(체크) 항목. 자유 텍스트가 들어있으면 import 시 memo로 보존.
  '창업': { kind: 'collabBool', field: 'startup' },
  '기타': { kind: 'collabBool', field: 'etc' },

  // 기업 비고로 흡수
  '국내외': { kind: 'companyNote', field: '국내외' },
  '국가': { kind: 'companyNote', field: '국가' },

  // 담당자
  '담당자명': { kind: 'contact', field: 'name' },
  '담당자': { kind: 'contact', field: 'name' },
  '실무자이름': { kind: 'contact', field: 'name' },
  '직위': { kind: 'contact', field: 'position' },
  '직책': { kind: 'contact', field: 'position' },
  '부서': { kind: 'contact', field: 'dept' },
  '연락처m': { kind: 'contact', field: 'phone' },
  '연락처': { kind: 'contact', field: 'phone' },
  '담당자연락처': { kind: 'contact', field: 'phone' },
  '연락처e': { kind: 'contact', field: 'email' },
  '이메일': { kind: 'contact', field: 'email' },
  '담당자이메일': { kind: 'contact', field: 'email' },

  // 대표자
  '대표자명': { kind: 'ceo', field: 'name' },
  '대표자': { kind: 'ceo', field: 'name' },
  '대표자연락처m': { kind: 'ceo', field: 'phone' },
  '대표자연락처': { kind: 'ceo', field: 'phone' },
  '대표자연락처e': { kind: 'ceo', field: 'email' },
  '대표자이메일': { kind: 'ceo', field: 'email' },
};

/** 헤더 셀 문자열 → 카테고리/필드. 미인식이면 null.
 *  정확 일치 우선, 실패 시 부분 매칭으로 변형된 헤더(예: "기관명*", "회사명")도 인식. */
export function classifyHeader(rawHeader: string): HeaderCat | null {
  const k = norm(rawHeader);
  if (!k) return null;
  if (EXACT[k]) return EXACT[k];

  // 부분 매칭 fallback — 헤더 변형 흡수
  if (/(기관|기업|회사|업체)명/.test(k)) return { kind: 'company', field: 'name' };
  if (k.includes('대표자')) {
    if (k.includes('이메일') || k.endsWith('e')) return { kind: 'ceo', field: 'email' };
    if (k.includes('연락') || k.endsWith('m')) return { kind: 'ceo', field: 'phone' };
    return { kind: 'ceo', field: 'name' };
  }
  if (k.includes('담당자')) {
    if (k.includes('이메일') || k.endsWith('e')) return { kind: 'contact', field: 'email' };
    if (k.includes('연락') || k.endsWith('m')) return { kind: 'contact', field: 'phone' };
    return { kind: 'contact', field: 'name' };
  }
  if (k.includes('연도')) return { kind: 'company', field: 'joinYear' };
  if (k.includes('소재지') || k.includes('주소')) return { kind: 'company', field: 'addressDetail' };
  if (k.includes('홈페이지')) return { kind: 'company', field: 'homepage' };
  if (k.includes('이메일')) return { kind: 'contact', field: 'email' };
  if (k.includes('연락처') || k.includes('전화')) return { kind: 'contact', field: 'phone' };
  if (k.includes('직위') || k.includes('직책')) return { kind: 'contact', field: 'position' };
  if (k.includes('인턴십')) return { kind: 'collabBool', field: 'internship' };
  if (k.includes('해외교육')) return { kind: 'collabBool', field: 'overseasEducation' };
  if (k.includes('산학')) return { kind: 'collabBool', field: 'industryProject' };
  if (k.includes('교과')) return { kind: 'collabBool', field: 'curriculumCommittee' };
  if (k.includes('특강')) return { kind: 'collabBool', field: 'guestLecture' };
  if (k.includes('채용')) return { kind: 'collabBool', field: 'employment' };
  if (k.includes('가치확산')) return { kind: 'collabBool', field: 'valueSpread' };
  if (k.includes('현장실습')) return { kind: 'collabBool', field: 'fieldTrainingOrg' };
  return null;
}

/** 셀 값이 boolean(O/체크/Y/V/1/true/한글ㅇ 등) 인지 판단 */
export function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  const raw = String(v ?? '').trim();
  if (!raw) return false;
  const s = raw.toLowerCase();
  // 흔한 표기 모두 인식 (영문 O/o, 한글 ㅇ, 동그라미 ○ ● ◯, 체크 ✓ ✔, V, Y, 1, true, 체결, 예, 가능, 있음)
  return [
    'o', '○', '◯', '●', '⚫', '✓', '✔', '✅',
    'v', 'y', '1', 'true', '체결', '예', 'ㅇ', 'ㅇㅇ', '가능', '있음', '해당',
  ].includes(s);
}

/** 셀 값 정규화: hyperlink/richtext 객체 처리 */
export function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const obj = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (typeof obj.text === 'string') return obj.text.trim();
    if (Array.isArray(obj.richText)) return obj.richText.map((p) => p.text).join('').trim();
    if (obj.result != null) return String(obj.result).trim();
    if (obj.hyperlink) return String(obj.hyperlink).trim();
  }
  return '';
}
