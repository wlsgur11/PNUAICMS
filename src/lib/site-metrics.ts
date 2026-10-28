/**
 * 교육원이 운영하는 사이트별 실적 숫자. 대시보드 '교육원 운영 사이트' 구역에 쓴다.
 *
 * 각 사이트 DB 에서 docs/site-metrics.md 의 SQL 로 직접 뽑아 손으로 넣는다.
 * 숫자를 바꾸면 asOf(기준일)도 같이 바꾼다. 값이 null 이면 '집계 전' 으로 보인다.
 * AICMS 는 자기 DB 에서 바로 계산하므로 여기 없다.
 * ponytail: 손으로 갱신. 자주 바꾸게 되면 관리자 입력 화면이나 사이트별 API 로 바꾼다.
 */
export type SiteMetric = { label: string; value: number | null; unit: string };

export type SiteCard = {
  name: string;
  url: string;
  summary: string;
  /** 숫자를 뽑은 날짜 (YYYY-MM-DD) */
  asOf: string | null;
  metrics: SiteMetric[];
};

export const SITE_METRICS: SiteCard[] = [
  {
    name: '코드플레이스',
    url: 'https://code.pusan.ac.kr',
    summary: '교과목 코딩 실습과 자동 채점 환경',
    asOf: null,
    metrics: [
      { label: '등록 문제', value: null, unit: '개' },
      { label: '가입자', value: null, unit: '명' },
      { label: '누적 제출', value: null, unit: '건' },
      { label: 'AI 조교 사용', value: null, unit: '회' },
      { label: '활용 교과목', value: null, unit: '개' },
    ],
  },
  {
    name: 'AI 역량지원시스템',
    url: 'https://swcss.pusan.ac.kr',
    summary: '마일스톤, 부트캠프 등 학생 AI 역량 활동 관리',
    asOf: null,
    metrics: [
      { label: '가입 학생', value: null, unit: '명' },
      { label: '마일스톤 신청', value: null, unit: '건' },
      { label: '부트캠프 공고', value: null, unit: '개' },
      { label: '부트캠프 신청', value: null, unit: '건' },
      { label: '이수 신청', value: null, unit: '건' },
    ],
  },
  {
    name: '피클',
    url: 'https://pickle.pusan.ac.kr',
    summary: '교육용 클라우드 실습 환경과 AI API 제공',
    asOf: null,
    metrics: [
      { label: '이용 기관', value: null, unit: '곳' },
      { label: '사용자', value: null, unit: '명' },
      { label: '실습 VM', value: null, unit: '대' },
      { label: 'AI API 키 발급', value: null, unit: '개' },
    ],
  },
  {
    name: 'AIPMS',
    url: 'https://aipms.pusan.ac.kr',
    summary: '프로젝트 기반 수업과 사업 결과물 관리',
    asOf: null,
    metrics: [
      { label: '운영 프로그램', value: null, unit: '개' },
      { label: '프로젝트 팀', value: null, unit: '팀' },
      { label: '참여 학생', value: null, unit: '명' },
      { label: '자문위원', value: null, unit: '명' },
      { label: '공개 결과물', value: null, unit: '건' },
    ],
  },
];
