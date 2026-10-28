/**
 * 교육원이 운영하는 사이트별 실적. 대시보드 맨 위 '교육원 운영 서비스' 구역에 쓴다.
 *
 * 숫자는 각 사이트 DB 에서 docs/site-metrics.md 의 SQL 로 직접 뽑아 손으로 넣는다.
 * 숫자를 바꾸면 asOf(기준일)도 같이 바꾼다. 값이 null 이면 '-' 로, 문구가 null 이면 안 보인다.
 * AICMS 는 자기 DB 에서 바로 계산하므로 여기 없다 (SiteMetricsBlock 참고).
 * ponytail: 손으로 갱신. 자주 바꾸게 되면 관리자 입력 화면이나 사이트별 API 로 바꾼다.
 */
export type SiteMetric = {
  label: string;
  value: number | null;
  unit: string;
  /** 맨 위 '서비스 이용자 합계' 에 더할 값인지 */
  users?: boolean;
};

export type SiteCard = {
  name: string;
  url: string;
  summary: string;
  /** 운영 시작 시기. 예: '2024년 3월' */
  since: string | null;
  /** 카드에서 제일 크게 보일 숫자 */
  headline: SiteMetric;
  metrics: SiteMetric[];
  /** 활용 교과목, 사업 */
  usedIn: string[];
  features: string[];
  /** 숫자를 뽑은 날짜 (YYYY-MM-DD) */
  asOf: string | null;
};

export const SITE_METRICS: SiteCard[] = [
  {
    name: '코드플레이스',
    url: 'https://code.pusan.ac.kr',
    summary: '교과목 코딩 실습과 자동 채점 환경',
    since: null,
    headline: { label: '누적 제출', value: 53195, unit: '건' },
    metrics: [
      { label: '가입자', value: 938, unit: '명', users: true },
      { label: '등록 문제', value: 473, unit: '개' },
      { label: 'AI 조교 사용', value: 327, unit: '회' },
      { label: '대회 운영', value: 29, unit: '회' },
      { label: '활용 교과목', value: null, unit: '개' },
    ],
    usedIn: ['기초컴퓨터프로그래밍 (교양필수)', 'TECHWEEK 프로그래밍 대회'],
    features: ['자동 채점', 'AI 조교 힌트', '대회 운영'],
    asOf: '2026-10-28',
  },
  {
    name: 'AI 역량지원시스템',
    url: 'https://swcss.pusan.ac.kr',
    summary: '학생 AI 역량 활동과 부트캠프 이수 관리',
    since: null,
    headline: { label: '가입 학생', value: 412, unit: '명', users: true },
    metrics: [
      { label: '마일스톤 신청', value: 8363, unit: '건' },
      { label: '부트캠프 공고', value: 6, unit: '개' },
      { label: '부트캠프 신청', value: 212, unit: '건' },
      { label: '이수 신청', value: 64, unit: '건' },
      { label: '이수 승인', value: 43, unit: '건' },
    ],
    usedIn: ['AI 부트캠프', '마일스톤 장학', 'AI 해커톤', '생성형 AI PBL', '온디바이스 AI PBL'],
    features: ['마일스톤 실적 관리', '부트캠프 신청과 이수', '이수증 발급', 'AI 진로 설계'],
    asOf: '2026-10-28',
  },
  {
    name: '피클',
    url: 'https://pickle.pusan.ac.kr',
    summary: '교육용 클라우드 실습 환경과 AI API 제공',
    since: null,
    headline: { label: '사용자', value: null, unit: '명', users: true },
    metrics: [
      { label: '이용 기관', value: null, unit: '곳' },
      { label: '워크스페이스', value: null, unit: '개' },
      { label: '실습 VM 누적', value: null, unit: '대' },
      { label: 'AI API 키 발급', value: null, unit: '개' },
    ],
    usedIn: [],
    features: ['실습 VM 제공', 'AI API 키 발급', '기관별 워크스페이스', '교내 IP 신청'],
    asOf: null,
  },
  {
    name: 'AIPMS',
    url: 'https://aipms.pusan.ac.kr',
    summary: '프로젝트 기반 수업과 사업 결과물 관리',
    since: null,
    headline: { label: '프로젝트 팀', value: 221, unit: '팀' },
    metrics: [
      { label: '참여 학생', value: 468, unit: '명', users: true },
      { label: '운영 프로그램', value: 12, unit: '개' },
      { label: '자문위원', value: 30, unit: '명' },
      { label: '공개 결과물', value: null, unit: '건' },
    ],
    usedIn: ['AI 해커톤', '졸업과제', '카카오테크캠퍼스', 'PNU AI Booster'],
    features: ['프로젝트 팀 관리', '보고서 제출과 피드백', '자문위원 평가', '사업별 결과물 공개'],
    asOf: '2026-10-28',
  },
];
