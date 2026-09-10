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
};

/** SW중심대학 지표 한 칸의 상태. na = 목표치가 없어 판정 불가 */
export type SwcuCell = 'met' | 'unmet' | 'na';

export type SwcuUnmet = {
  name: string;
  target: number;
  actual: number;
  unit: string | null;
};

export type SwcuSummary = {
  total: number;
  met: number;
  unmet: SwcuUnmet[];
  unmetCount: number;
  cells: SwcuCell[];
};

/** 누적 타일 하나. delta = 선택 연도 건수 - 전년 건수. 계산 불가면 null */
export type TotalTile = { value: number; delta: number | null };

export type TrendPoint = { year: number; projects: number; internships: number };

export type PipelineStage = { status: string; count: number };

export type DistributionItem = { key: string; count: number };

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
