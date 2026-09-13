/**
 * src/lib/dashboard-shape.ts
 * ---------------------------------------------------------
 * 대시보드 API 응답 타입. 라우트와 화면 컴포넌트가 같은 정의를 본다.
 * 컴포넌트는 이 타입의 자기 몫만 props 로 받고 직접 fetch 하지 않는다.
 */

/** 목표 대비 한 항목 (산학협력 / 인턴십). target·achieved 는 0~1 소수 비율, students 는 참여 학부생 명수. */
export type GoalMetric = {
  target: number | null;
  achieved: number | null;
  students: number | null;
  prevAchieved: number | null; // 전년 달성치. 없으면 비교 문구를 생략한다
};

/** SW중심대학 지표 한 칸의 상태. na = 목표치가 없어 판정 불가 */
export type SwcuCell = 'met' | 'unmet' | 'na';

export type SwcuUnmet = {
  name: string;
  target: number;
  actual: number;
  unit: string | null;
};

/**
 * 영역별 달성 집계. 지표를 하나씩 보면 17줄이지만 영역으로 묶으면
 * 어느 영역이 약한지 한 줄로 읽힌다. area 는 전 지표에 채워져 있다.
 */
export type SwcuArea = { area: string; met: number; unmet: number; na: number; total: number };

/**
 * 연도별 달성 개수. 17개 중 몇 개를 달성했는지가 좋아지는 추세인지 나빠지는
 * 추세인지가 사업 평가의 핵심이라, 전년 한 해만 비교해서는 답이 안 나온다.
 * 분모(total)가 해마다 달라지므로 비율이 아니라 개수 두 개를 그대로 보낸다.
 */
export type SwcuTrendPoint = { year: number; met: number; total: number };

export type SwcuSummary = {
  total: number;
  met: number;
  unmet: SwcuUnmet[];
  unmetCount: number;
  cells: SwcuCell[];
  areas: SwcuArea[];
  trend: SwcuTrendPoint[];
  prevMet: number | null;   // 전년 달성 개수
  prevTotal: number | null; // 전년 지표 개수 (분모가 달라질 수 있어 함께 보낸다)
};

/**
 * 실적 타일 하나.
 *
 * value 가 무엇을 센 값인지는 항목마다 다르다. 산학 과제와 인턴십은 선택한
 * 연도의 연간 실적이고, 협력 기업과 MOU 는 시점 개념이 없어 현재 기준 총량이다.
 * basis 가 그것을 말한다. 큰 숫자 하나만 보고 기준을 짐작하게 두면 '426 에서
 * 60 이 줄었다' 처럼 서로 다른 것을 센 두 숫자가 한 문장으로 읽힌다.
 */
export type TotalTile = {
  value: number;
  /** 선택 연도 - 전년. 계산 불가면 null */
  delta: number | null;
  /** 전체 기간 누적. basis 가 'current' 면 value 와 같다 */
  total: number;
  /** value 가 연간 실적인지(annual) 현재 총량인지(current) */
  basis: 'annual' | 'current';
  /**
   * current 타일에서 선택 연도에 새로 들어온 수. annual 타일은 value 가 이미
   * 그 값이라 null 이다. 총량 타일은 delta 를 못 쓴다. 기업의 연간 증감은 신규
   * 유입이라 '현재 104곳' 옆에 붙으면 총량이 그만큼 변한 것으로 읽힌다.
   */
  newThisYear: number | null;
};

export type TrendPoint = { year: number; projects: number; internships: number };

/**
 * 연도별 목표 대비 달성률. 원본(4차연도 현황) 엑셀에 값이 빈 해가 있어
 * 0 으로 눌러 보내지 않고 null 을 그대로 내려보낸다. 0% 와 '값 없음' 은 다르다.
 */
export type GoalTrendPoint = {
  year: number;
  industryAchieved: number | null;
  industryTarget: number | null;
  internshipAchieved: number | null;
  internshipTarget: number | null;
};

/** 정량실적 기준 인원. 엑셀 전체현황 시트의 정컴/DS 인원 */
export type HeadcountBaseline = {
  enrolledCSE: number | null; enrolledDS: number | null;
  industryTargetCSE: number | null; industryTargetDS: number | null;
  internTargetCSE: number | null; internTargetDS: number | null;
};

export type PipelineStage = { status: string; count: number };

/**
 * 다음에 연락할 기업 한 곳.
 *
 * 대시보드의 다른 카드가 전부 집계 숫자라 '지금 어떤 상태인가' 에만 답한다.
 * '그래서 내일 뭘 하나' 에 답하려면 숫자가 아니라 이름이 나와야 한다.
 */
export type FollowUpCompany = {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  /** 마지막 컨택일(yyyy-MM-dd). 기록이 없으면 null */
  lastContact: string | null;
};

export type FollowUp = {
  rows: FollowUpCompany[];
  /** 아직 한 번도 접촉하지 않은 기업 수 */
  untouched: number;
  /** 접촉은 했는데 반년 넘게 기록이 없는 기업 수 */
  stale: number;
  /** 협약완료·보류·종료가 아닌, 후속 조치가 남은 기업 수 */
  total: number;
  /** 우선순위가 한 곳도 기재돼 있지 않으면 true. 정렬 근거가 약하다는 뜻 */
  noPriority: boolean;
};

/**
 * 분포 한 항목. key 는 화면에 보이는 라벨.
 * code/version 은 분과 축에서만 채운다. 분과는 코드(A~F)가 old5/new6 두 버전에
 * 서로 다른 이름으로 존재해서, 드릴다운 링크가 코드만 넘기면 두 분과가 섞인다.
 */
export type DistributionItem = { key: string; count: number; code?: string; version?: string };

/** 학생 관리 현황. 대시보드에 학생 지표가 하나도 없던 공백을 채운다 */
export type StudentSummary = {
  total: number;
  graduated: number;
  projectParticipants: number;
  internParticipants: number;
  gradeDistribution: { grade: number; count: number }[];
  /** 3~4학년인데 상담 기록이 2회 미만인 학생 수. 지금 챙겨야 할 대상 */
  needsAttention: number;
};

/**
 * 산학 과제 참여 인원. 박사·석사는 기재되지 않은 과제가 절반이라
 * 합계만 내면 실제보다 적게 읽힌다. 그래서 기재 건수를 같이 보낸다.
 */
export type DegreeCount = { sum: number; filled: number };
export type ProjectHeadcount = {
  projects: number;
  phd: DegreeCount;
  master: DegreeCount;
  undergrad: DegreeCount;
};

/** 인턴십 구성 세 축. 국내외·주관·교육방식은 전 건에 채워져 있다 */
export type InternshipComposition = {
  domestic: { key: string; count: number }[];
  hostType: { key: string; count: number }[];
  method: { key: string; count: number }[];
};

/** 연구실별 산학 과제 수 */
export type LabRank = { professor: string; lab: string | null; count: number };

/** 인턴십 교육인원과 연계취업자. 실적 보고에 그대로 쓰이는 숫자다 */
export type InternshipHeadcount = {
  cse: number; ds: number; nonSw: number;
  empSw: number; empNonSw: number;
};

export type DashboardData = {
  years: number[];
  year: number;
  goals: {
    industry: GoalMetric;
    internship: GoalMetric;
    swcu: SwcuSummary;
  };
  totals: {
    companies: TotalTile;
    projects: TotalTile;
    internships: TotalTile;
    mou: TotalTile;
  };
  trend: TrendPoint[];
  goalTrend: GoalTrendPoint[];
  headcount: HeadcountBaseline;
  /** 산학 과제나 인턴십 실적이 한 건이라도 있는 기업 수. 관리 대상 기업 수와 다르다 */
  partnerCompanies: number;
  pipeline: {
    byStatus: PipelineStage[];
    onHold: number;
    closed: number;
    newThisYear: number;
  } | null;
  distribution: {
    dept: DistributionItem[];
    division: DistributionItem[];
    region: DistributionItem[];
    type: DistributionItem[];
    baseline: { enrolledCSE: number | null; enrolledDS: number | null };
  } | null;
  /** 협력 항목 10종별 기업 수. 파이프라인이 진행 단계 축이라면 이쪽은 협력 내용 축이다 */
  collaboration: { key: string; count: number }[] | null;
  followUp: FollowUp | null;
  students: StudentSummary | null;
  internshipHeadcount: { year: InternshipHeadcount; total: InternshipHeadcount } | null;
  internshipComposition: { year: InternshipComposition; total: InternshipComposition } | null;
  projectHeadcount: { year: ProjectHeadcount; total: ProjectHeadcount } | null;
  /** unlinked = 연구실이 연결되지 않은 과제 수. 상위 목록이 전체를 못 덮는 몫 */
  labs: { top: LabRank[]; labCount: number; unlinked: number } | null;
  recentHistories: {
    id: string;
    companyId: string;
    companyName: string;
    professor: string;
    contactDate: string;
    method: string;
    content: string;
    histStatus: string;
  }[];
};

/** 파이프라인 진행 단계 순서. 값이 0 이어도 이 순서대로 다 보여준다. */
export const PIPELINE_STAGES = ['미접촉', '연락완료', '미팅예정', '협의중', '협약완료'] as const;
