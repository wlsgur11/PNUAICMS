'use client';

import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import CountBars from '@/components/CountBars';
import { gradeLabel } from '@/lib/enums';
import CountUp from '@/components/CountUp';
import FadeContent from '@/components/FadeContent';

type Stats = {
  total: number; graduated: number; internParticipants: number; projectParticipants: number; highGrade: number;
  gradeDistribution: { grade: number; count: number }[];
  departmentCounts: { label: string; count: number }[]; careerCounts: { label: string; count: number }[];
};

function Bars({ title, items, of }: { title: string; items: { label: string; count: number }[]; of?: number }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}>{title}</div>
      <CountBars items={items} of={of} />
    </div>
  );
}

export default function StudentAnalyticsPage() {
  const { data, error } = useSWR<Stats>('/api/students/stats');
  if (error && !data) return <div className="empty">불러오기 실패: {(error as Error).message}</div>;
  if (!data) return <div className="loading">불러오는 중…</div>;

  // 위 숫자 줄. 아래 '주요 참여지표' 막대와 숫자가 겹쳐서 하나로 합치고 전체 대비 비율을 붙였다
  const pct = (n: number) => (data.total > 0 ? `전체의 ${Math.round((n / data.total) * 100)}%` : '');
  const kpis = [
    { label: '전체 학생', value: data.total, sub: '' },
    { label: '인턴십 참여', value: data.internParticipants, sub: pct(data.internParticipants) },
    { label: '산학 참여', value: data.projectParticipants, sub: pct(data.projectParticipants) },
    { label: '3학년 이상', value: data.highGrade, sub: pct(data.highGrade) },
    { label: '졸업생', value: data.graduated, sub: pct(data.graduated) },
  ];

  return (
    <>
      <PageHeader title="통계분석" />
      <FadeContent>
      <div className="card kpi-strip">
        {kpis.map((c) => (
          <div key={c.label} className="kpi-cell">
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value"><CountUp end={c.value} /><span className="kpi-unit">명</span></div>
            {c.sub && <div className="kpi-sub">{c.sub}</div>}
          </div>
        ))}
      </div>
      </FadeContent>
      <FadeContent delay={120}>
      <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginTop: 14 }}>
        <Bars title="학년별 분포" items={data.gradeDistribution.map((g) => ({ label: gradeLabel(g.grade), count: g.count }))} />
        <Bars title="학과별 분포" items={data.departmentCounts} />
        <Bars title="진로희망 분포" items={data.careerCounts} />
      </div>
      </FadeContent>
    </>
  );
}
