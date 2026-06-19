'use client';

import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import CountUp from '@/components/CountUp';
import FadeContent from '@/components/FadeContent';

type Stats = {
  total: number; graduated: number; internParticipants: number; projectParticipants: number; highGrade: number;
  gradeDistribution: { grade: number; count: number }[];
  departmentCounts: { label: string; count: number }[]; careerCounts: { label: string; count: number }[];
};

function Bars({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}><span className="accent-bar" />{title}</div>
      {items.length === 0 ? <div className="empty">데이터 없음</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((it) => (
            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 130, fontSize: 13 }} className="muted">{it.label}</div>
              <div style={{ flex: 1, background: 'var(--slate-100)', borderRadius: 6, height: 18 }}>
                <div style={{ width: `${(it.count / max) * 100}%`, background: 'var(--indigo-500)', height: '100%', borderRadius: 6 }} />
              </div>
              <div style={{ width: 32, textAlign: 'right', fontWeight: 600 }}>{it.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentAnalyticsPage() {
  const { data } = useSWR<Stats>('/api/students/stats');
  if (!data) return <div className="loading">불러오는 중…</div>;

  const engagement = [
    { label: '인턴십 참여', count: data.internParticipants },
    { label: '산학 참여', count: data.projectParticipants },
    { label: '졸업생', count: data.graduated },
    { label: '3학년 이상', count: data.highGrade },
  ];

  return (
    <>
      <PageHeader title="통계분석" />
      <FadeContent>
      <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {[
          { label: '전체 학생', value: data.total },
          { label: '인턴십 참여', value: data.internParticipants },
          { label: '산학 참여', value: data.projectParticipants },
          { label: '졸업생', value: data.graduated },
        ].map((c) => (
          <div key={c.label} className="card">
            <div className="muted" style={{ fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}><CountUp end={c.value} /><span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>명</span></div>
          </div>
        ))}
      </div>
      </FadeContent>
      <FadeContent delay={120}>
      <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginTop: 14 }}>
        <Bars title="학년별 분포" items={data.gradeDistribution.map((g) => ({ label: `${g.grade}학년`, count: g.count }))} />
        <Bars title="학과별 분포" items={data.departmentCounts} />
        <Bars title="진로희망 분포" items={data.careerCounts} />
        <Bars title="주요 참여지표" items={engagement} />
      </div>
      </FadeContent>
    </>
  );
}
