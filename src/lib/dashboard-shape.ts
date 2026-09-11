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

export type SwcuSummary = {
  total: number;
  met: number;
  unmet: SwcuUnmet[];
  unmetCount: number;
  cells: SwcuCell[];
  areas: SwcuArea[];
  prevMet: number | null;   // 전년 달성 개수
  prevTotal: number | null; // 전년 지표 개수 (분모가 달라질 수 있어 함께 보낸다)
};

/** 누적 타일 하나. delta = 선택 연도 건수 - 전년 건수. 계산 불가면 null */
export type TotalTile = { value: number; delta: number | null };

export type TrendPoint = { year: number; projects: number; internships: number };

export type PipelineStage = { status: string; count: number };

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
