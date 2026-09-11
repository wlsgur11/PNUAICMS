'use client';

import Link from 'next/link';
import TrendChart from './TrendChart';
import type { GoalMetric, SwcuSummary, TrendPoint } from '@/lib/dashboard-shape';

const pct = (n: number | null) => (n == null ? '-' : `${(n * 100).toFixed(1)}%`);

/**
 * 목표 대비 세 지표를 한 카드에 가로로 나란히 두고, 그 아래 추이 곡선을 붙인다.
 * 지표마다 카드를 쪼개지 않는 것이 관리자 템플릿의 일반적인 방식이다.
 * 색은 달성 여부에만 쓴다. 미달은 기본 글자색으로 두고 빨강을 남용하지 않는다.
 */
function Metric({ label, m }: { label: string; m: GoalMetric }) {
  const met = m.target != null && m.achieved != null && m.achieved >= m.target;
  const ratio = m.target && m.target > 0 && m.achieved != null
    ? Math.min(100, (m.achieved / m.target) * 100) : 0;
  const diff = m.achieved != null && m.prevAchieved != null ? (m.achieved - m.prevAchieved) * 100 : null;

  return (
    <div>
      <div className="dash-metric-label">{label}</div>
      <div className={`dash-metric-value${met ? ' met' : ''}`}>{pct(m.achieved)}</div>
      <div className="dash-track"><div className={`dash-fill${met ? ' met' : ''}`} style={{ width: `${ratio}%` }} /></div>
      <div className="dash-metric-sub">
        {m.target == null || m.achieved == null
          ? '목표 또는 실적 값 없음'
          : met
            ? `목표 ${pct(m.target)} 초과`
            : `목표 ${pct(m.target)}, ${((m.target - m.achieved) * 100).toFixed(1)}%p 부족`}
        {diff != null && (
          <>
            <br />
            전년 {pct(m.prevAchieved)}에서{' '}
            <span className={`dash-delta ${diff >= 0 ? 'up' : 'down'}`}>
              {diff >= 0 ? '▲' : '▼'}{Math.abs(diff).toFixed(1)}%p
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoalCard({ industry, internship, swcu, year, trend }: {
  industry: GoalMetric; internship: GoalMetric; swcu: SwcuSummary; year: number; trend: TrendPoint[];
}) {
  const swcuDiff = swcu.prevMet != null ? swcu.met - swcu.prevMet : null;

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>{year}년 목표 대비</h2>
        <p>산학협력과 인턴십 참여율, SW중심대학 성과지표 달성 현황</p>
      </div>

      <div className="dash-metrics">
        <Metric label="산학협력 참여율" m={industry} />
        <Metric label="인턴십 참여율" m={internship} />
        <div>
          <div className="dash-metric-label">SW중심대학 지표</div>
          <div className="dash-metric-value">
            {swcu.met}<span style={{ fontSize: 15, color: 'var(--text-3)' }}> / {swcu.total}</span>
          </div>
          {/* 지표 하나당 눈금 하나. 개수와 달성 여부만 읽히면 되므로 얇게 둔다 */}
          <div style={{ display: 'flex', gap: 2, marginTop: 10, height: 4 }}>
            {swcu.cells.map((c, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: 1,
                background: c === 'met' ? 'var(--green-600)' : c === 'unmet' ? 'var(--red-600)' : 'var(--slate-200)',
              }} />
            ))}
          </div>
          <div className="dash-metric-sub">
            {swcu.total === 0 ? '해당 연도 지표 없음' : <>미달 {swcu.unmetCount}개</>}
            {swcuDiff != null && swcu.prevTotal != null && (
              <>
                <br />
                전년 {swcu.prevMet}/{swcu.prevTotal}에서{' '}
                <span className={`dash-delta ${swcuDiff >= 0 ? 'up' : 'down'}`}>
                  {swcuDiff >= 0 ? '▲' : '▼'}{Math.abs(swcuDiff)}개
                </span>
              </>
            )}
            {swcu.total > 0 && <><br /><Link href="/swcu" className="text-link">지표 상세</Link></>}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--slate-100)', marginTop: 22, paddingTop: 18 }}>
        <div className="dash-metric-label" style={{ marginBottom: 4 }}>연도별 산학협력, 인턴십 건수</div>
        <TrendChart data={trend} />
      </div>
    </div>
  );
}
