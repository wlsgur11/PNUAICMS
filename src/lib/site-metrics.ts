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

/** 이 서비스로 운영한 교육원 사업 하나. 상세 창 '사업별 운영 실적' 에 한 줄씩 나온다 */
export type SiteProgram = {
  name: string;
  period: string;
  result: string;
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
  /** 카드를 눌렀을 때 상세 창에만 보일 설명과 숫자 */
  description?: string;
  details?: SiteMetric[];
  programs?: SiteProgram[];
  /** 숫자를 뽑은 날짜 (YYYY-MM-DD) */
  asOf: string | null;
};

export const SITE_METRICS: SiteCard[] = [
  {
    name: '코드플레이스',
    url: 'https://code.pusan.ac.kr',
    summary: '교과목 코딩 실습과 자동 채점 환경',
    since: '2024년',
    headline: { label: '누적 제출', value: 53195, unit: '건' },
    metrics: [
      { label: '가입자', value: 938, unit: '명', users: true },
      { label: '등록 문제', value: 473, unit: '개' },
      { label: '대회와 수업 실습 운영', value: 14, unit: '회' },
      { label: 'AI 조교 사용 학생', value: 30, unit: '명' },
      { label: '활용 교과목', value: null, unit: '개' },
    ],
    usedIn: ['기초컴퓨터프로그래밍 (교양필수)', '알고리즘', 'TECHWEEK 프로그래밍 경진대회', '여름 부트캠프 코딩 테스트'],
    features: ['자동 채점', 'AI 조교 힌트', '대회 운영'],
    description: '교과목 실습 문제를 올리면 학생 코드를 바로 채점합니다. 막힌 학생에게 AI 조교가 정답 대신 힌트를 주고, 교내 프로그래밍 대회도 같은 환경에서 운영합니다. AI 조교는 외부 API 없이 교내 GPU 서버에서 돌아갑니다.',
    // 아래 값은 2026-10-27 코드플레이스 성장지표 집계(시험용 대회 제외)에서 가져왔다
    details: [
      { label: '누적 해결 문제', value: 3609, unit: '개' },
      { label: '대회 참가 연인원', value: 746, unit: '명' },
      { label: 'AI 조교 사용 (2026)', value: 148, unit: '회' },
    ],
    programs: [
      { name: '기초컴퓨터프로그래밍 (교양필수) 실습', period: '2024-2학기 ~ 2025-2학기, 3학기', result: 'C, Python 문제 약 100개씩 운영. 참가 연인원 425명, 제출 29,484건' },
      { name: '알고리즘 수업 문제 풀이와 중간고사', period: '2025-1학기 ~ 2026-1학기', result: '4회 운영. 참가 연인원 140명, 제출 8,007건' },
      { name: 'CSE TECHWEEK 프로그래밍 경진대회', period: '2024 ~ 2026, 매년', result: '3회 운영. 참가 연인원 138명, 제출 1,627건. 2026년 대회 응답 p95 0.13초' },
      { name: '여름계절학기 부트캠프 참가자 코딩 테스트', period: '2026년 5월', result: 'AI스프린트, NVIDIA 딥러닝 PBL 선발. 43명 응시, 제출 192건' },
    ],
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
    usedIn: ['마일스톤 장학', '여름계절학기 AI PBL 부트캠프', 'AI 트랙 이수 인정', 'AWS AI 마에스트로 해커톤', '겨울계절학기 생성형 AI PBL'],
    features: ['마일스톤 실적 관리', '부트캠프 신청과 이수', '이수증 발급', 'AI 진로 설계'],
    description: '학생이 AI 관련 활동을 마일스톤으로 쌓고 장학 실적으로 신청합니다. 부트캠프 공고, 신청, 이수 승인, 이수증 발급까지 한곳에서 처리합니다.',
    details: [
      { label: '마일스톤 승인', value: 8099, unit: '건' },
      { label: '부트캠프 선발', value: 83, unit: '명' },
      { label: '학생 수상 기록', value: 100, unit: '건' },
      { label: '학생 창업 기록', value: 50, unit: '건' },
    ],
    // 학생 성과 기록은 마일스톤 승인 건을 분류별로 더한 값이다
    programs: [
      { name: '마일스톤 장학', period: '누적', result: '신청 8,363건 중 8,099건 승인. 실전적 5,949건, 글로벌 2,105건, 커뮤니티 309건' },
      { name: '여름계절학기 AI PBL 부트캠프', period: '2026년 6~7월, 3개 과정', result: 'NVIDIA 딥러닝, AI 스프린트, 클라우드 AI 총 350시간. 정원 135명에 171명 신청, 83명 선발' },
      { name: 'AI 트랙 이수 인정', period: '2026년 8월', result: '부트캠프 수료생 트랙 이수 신청 50건 중 43건 승인' },
      { name: '학생 성과 기록', period: '누적, 승인 기준', result: '경진대회 수상 100건, 창업 50건, 특허와 논문 10건, 현장실습 45건, TOPCIT와 PCCP 101건' },
      { name: '하반기 행사와 과정 모집', period: '2026년 10~12월', result: '첨단산업 인재양성 부트캠프 사업설명회 40명 신청. AWS AI 마에스트로 해커톤, 겨울계절학기 생성형 AI PBL 모집' },
    ],
    asOf: '2026-10-28',
  },
  {
    name: '피클',
    url: 'https://pickle.pusan.ac.kr',
    summary: '교육용 클라우드 실습 환경과 AI API 제공',
    since: null,
    // 피클 관리자 화면(AI융합교육원 기관 범위)에서 읽은 값. DB 직접 조회가 어려워 화면 기준
    headline: { label: 'AI API 호출 (최근 90일)', value: 10838, unit: '건' },
    metrics: [
      { label: '사용자', value: null, unit: '명', users: true },
      { label: 'AI API 키 발급', value: 63, unit: '개' },
      { label: '최근 30일 AI API 호출', value: 9534, unit: '건' },
      { label: '최근 14일 신청 승인', value: 44, unit: '건' },
      { label: '실습 VM 최대 할당', value: 14, unit: 'vCPU' },
    ],
    usedIn: [],
    features: ['실습 VM 제공', 'AI API 키 발급', '기관별 워크스페이스', '교내 IP 신청'],
    description: '수업과 프로젝트에 필요한 실습 VM 과 AI API 키를 신청만 하면 바로 받습니다. 기관별 워크스페이스로 사용량과 승인을 나눠 관리합니다.',
    // 관리자 대시보드 '가상머신 할당 현황' 의 전체 용량 (10/28 화면)
    details: [
      { label: '제공 가능 vCPU', value: 56, unit: '개' },
      { label: '제공 가능 메모리', value: 193, unit: 'GiB' },
      { label: '제공 가능 디스크', value: 1632, unit: 'GiB' },
    ],
    asOf: '2026-10-28',
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
      { label: '공개 결과물', value: 443, unit: '건' },
    ],
    usedIn: ['PNU 창의융합AI해커톤', '정보컴퓨터공학부 졸업과제', '카카오테크 캠퍼스', 'PNU AI 부스터', 'PNU AI학습공동체', '기업문제해결형 단기인턴십', '에이전틱 AI 프로젝트'],
    features: ['프로젝트 팀 관리', '보고서 제출과 피드백', '자문위원 평가', '사업별 결과물 공개'],
    description: '해커톤, 졸업과제 같은 프로젝트 사업의 팀 구성부터 보고서 제출, 자문위원 평가, 결과물 공개까지 관리합니다. 2023년 이후 사업 결과물도 옮겨 와 사업별로 공개합니다.',
    details: [
      { label: '수상 팀', value: 36, unit: '팀' },
    ],
    programs: [
      { name: 'PNU 창의융합AI해커톤', period: '제5회 2024 ~ 제7회 2026', result: '53팀, 결과물 204건, 수상 33팀. 2026년 대회 81명 참가' },
      { name: '정보컴퓨터공학부 졸업과제', period: '2023, 2025, 2026', result: '144팀, 결과물 191건 공개' },
      { name: '카카오테크 캠퍼스', period: '2기 2024, 3기 2025', result: '11팀, 결과물 11건, 수상 1팀' },
      { name: 'PNU AI 부스터 1기', period: '2025년 3~8월', result: '8팀, 결과물 32건' },
      { name: 'PNU AI학습공동체', period: '2026년 7~9월', result: '5팀, 결과물 5건' },
      { name: '기업문제해결형 단기인턴십, 에이전틱 AI 프로젝트', period: '2026년 2학기 진행 중', result: '팀 구성과 과제 진행 중' },
    ],
    asOf: '2026-10-28',
  },
];
