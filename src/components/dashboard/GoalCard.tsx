'use client';

import Link from 'next/link';
import type { GoalMetric, SwcuSummary } from '@/lib/dashboard-shape';

const pct = (n: number | null) => (n == null ? '-' : `${(n * 100).toFixed(1)}%`);

/** 목표 대비 한 행. 달성하면 초록, 아니면 흰색. */
function Row({ label, m }: { label: string; m: GoalMetric }) {
  const met = m.target != null && m.achieved != null && m.achieved >= m.target;
  const ratio = m.target && m.target > 0 && m.achieved != null
    ? Math.min(100, (m.achieved / m.target) * 100) : 0;
  const color = met ? '#7ee2a8' : '#ffffff';
  const goalPart = m.target == null || m.achieved == null
    ? '목표 또는 실적 값이 없습니다'
    : met
      ? `목표 ${pct(m.target)} 초과`
      : `목표 ${pct(m.target)}, ${((m.target - m.achieved) * 100).toFixed(1)}%p 부족`;
  // 전년 값이 없으면 비교 문구만 빠지고 목표 문구는 그대로 남는다
  const diff = m.achieved != null && m.prevAchieved != null ? (m.achieved - m.prevAchieved) * 100 : null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span className="goal-label">{label}</span>
        <span className="goal-value" style={{ color }}>{pct(m.achieved)}</span>
      </div>
      <div className="goal-track"><div className="goal-fill" style={{ width: `${ratio}%`, background: met ? '#7ee2a8' : 'var(--indigo-500)' }} /></div>
      <div className="goal-note">
        {goalPart}
        {diff != null && (
          <>
            , 전년 {pct(m.prevAchieved)}에서{' '}
            <span style={{ color: diff >= 0 ? '#7ee2a8' : '#f08a8a', fontWeight: 700 }}>
              {diff >= 0 ? '▲' : '▼'}{Math.abs(diff).toFixed(1)}%p
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoalCard({ industry, internship, swcu, year }: {
  industry: GoalMetric; internship: GoalMetric; swcu: SwcuSummary; year: number;
}) {
  return (
    <div className="goal-card">
      <div className="dash-eyebrow" style={{ color: '#9fbdf0', marginBottom: 14 }}>{year} 목표 대비</div>
      <Row label="산학협력 참여율" m={industry} />
      <Row label="인턴십 참여율" m={internship} />
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span className="goal-label">SW중심대학 지표</span>
          <span className="goal-value">
            {swcu.met}<span style={{ fontSize: 14, color: '#9fbdf0' }}>/{swcu.total}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {swcu.cells.map((c, i) => (
            <div key={i} style={{
              flex: 1, height: 6,
              background: c === 'met' ? '#7ee2a8' : c === 'unmet' ? '#f08a8a' : 'rgba(255,255,255,.22)',
            }} />
          ))}
        </div>
        <div className="goal-note">
          {swcu.total === 0
            ? '해당 연도 지표가 없습니다'
            : (
              <>
                미달 {swcu.unmetCount}개
                {swcu.prevMet != null && swcu.prevTotal != null && (
                  <>
                    , 전년 {swcu.prevMet}/{swcu.prevTotal}에서{' '}
                    <span style={{ color: swcu.met >= swcu.prevMet ? '#7ee2a8' : '#f08a8a', fontWeight: 700 }}>
                      {swcu.met >= swcu.prevMet ? '▲' : '▼'}{Math.abs(swcu.met - swcu.prevMet)}개
                    </span>
                  </>
                )}
                {' '}
                <Link href="/swcu" style={{ color: '#c7d7f2', textDecoration: 'underline' }}>자세히</Link>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
