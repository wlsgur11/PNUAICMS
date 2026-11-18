'use client';

import { useState } from 'react';
import Link from 'next/link';
import TrendChart from './TrendChart';
import GoalTrendChart from './GoalTrendChart';
import type { GoalMetric, GoalTrendPoint, HeadcountBaseline, SwcuSummary, TrendPoint } from '@/lib/dashboard-shape';

const pct = (n: number | null) => (n == null ? '-' : `${(n * 100).toFixed(1)}%`);

/**
 * 목표 대비 세 지표를 한 카드에 가로로 나란히 두고, 그 아래 추이 곡선을 붙인다.
 * 지표마다 카드를 쪼개지 않는 것이 관리자 템플릿의 일반적인 방식이다.
 * 색은 달성 여부에만 쓴다. 미달은 기본 글자색으로 두고 빨강을 남용하지 않는다.
 */
function Metric({ label, m }: { label: string; m: GoalMetric }) {
  const met = m.target != null && m.achieved != null && m.achieved >= m.target;
  // 막대 끝은 목표의 1.25배(또는 실적이 더 크면 실적)까지. 목표 눈금이 막대 안쪽에 오게 한다
  const scale = Math.max((m.target ?? 0) * 1.25, (m.achieved ?? 0) * 1.05, 0.01);
  const diff = m.achieved != null && m.prevAchieved != null ? (m.achieved - m.prevAchieved) * 100 : null;
  const gap = m.target != null && m.achieved != null ? (m.achieved - m.target) * 100 : null;

  return (
    <div>
      <div className="dash-metric-label">{label}</div>
      <div className={`dash-metric-value${met ? ' met' : ''}`}>{pct(m.achieved)}</div>
      {/* 막대는 실적, 검은 세로선은 목표. 선을 넘으면 초록 */}
      <div className="goal-bar">
        <div className="dash-track"><div className={`dash-fill${met ? ' met' : ''}`} style={{ width: `${((m.achieved ?? 0) / scale) * 100}%` }} /></div>
        {m.target != null && (
          <span className="goal-tick" style={{ left: `${(m.target / scale) * 100}%` }}>
            <i aria-hidden="true" /><em>목표 {pct(m.target)}</em>
          </span>
        )}
      </div>
      <div className="dash-metric-sub">
        {gap == null
          ? '목표 또는 실적 값 없음'
          : <b className={met ? 'goal-ok' : 'goal-short'}>{met ? `목표 달성 (+${gap.toFixed(1)}%p)` : `목표까지 ${(-gap).toFixed(1)}%p`}</b>}
        {m.students != null && <><br />참여 학부생 {m.students}명</>}
        {diff != null && (
          <>
            <br />
            전년 {pct(m.prevAchieved)} 대비{' '}
            <span className={`dash-delta ${diff >= 0 ? 'up' : 'down'}`}>
              {diff >= 0 ? '+' : '-'}{Math.abs(diff).toFixed(1)}%p
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 참여율의 기준이 되는 인원. 비율만 있으면 분모를 알 수 없어 숫자 크기를 가늠하지 못한다.
 * 값이 다 비어 있으면 줄 자체를 그리지 않는다.
 */
function BaselineStrip({ h }: { h: HeadcountBaseline }) {
  const rows = [
    { label: 'SW학과 재학생', cse: h.enrolledCSE, ds: h.enrolledDS },
    { label: '산학 목표인원', cse: h.industryTargetCSE, ds: h.industryTargetDS },
    { label: '인턴십 목표인원', cse: h.internTargetCSE, ds: h.internTargetDS },
  ].filter((r) => r.cse != null || r.ds != null);
  if (rows.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '8px 28px', flexWrap: 'wrap', marginTop: 20 }}>
      {rows.map((r) => (
        <span key={r.label} style={{ fontSize: 'calc(12px * var(--fs, 1))', color: 'var(--text-3)' }}>
          {r.label}{' '}
          <span className="dash-num" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
            정컴 {r.cse ?? '-'}
          </span>
          <span style={{ color: 'var(--text-3)' }}>, </span>
          <span className="dash-num" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
            DS {r.ds ?? '-'}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function GoalCard({ industry, internship, swcu, year, trend, goalTrend, headcount }: {
  industry: GoalMetric; internship: GoalMetric; swcu: SwcuSummary; year: number;
  trend: TrendPoint[]; goalTrend: GoalTrendPoint[]; headcount: HeadcountBaseline;
}) {
  const swcuDiff = swcu.prevMet != null ? swcu.met - swcu.prevMet : null;
  // 건수 추이와 달성률 추이는 다른 이야기다. 건수가 늘어도 재학생이 더 늘면
  // 달성률은 떨어진다. 둘 다 봐야 해서 한 자리에서 전환한다
  const [mode, setMode] = useState<'count' | 'ratio'>('count');

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>{year}년 목표 대비</h2>
        <p>산학협력과 인턴십 참여율, SW중심대학 성과지표의 달성 현황입니다.</p>
      </div>

      <div className="dash-metrics">
        <Metric label="산학협력 참여율" m={industry} />
        <Metric label="인턴십 참여율" m={internship} />
        <div>
          <div className="dash-metric-label">SW중심대학 지표</div>
          <div className="dash-metric-value">
            {swcu.met}<span className="unit">/ {swcu.total}</span>
          </div>
          {/* 지표 칸 14개를 일일이 그리지 않고 달성, 미달, 판정 없음 세 덩어리로 묶는다. 칸 수를 세지 않아도 비율이 읽힌다 */}
          {swcu.total > 0 && (() => {
            const na = swcu.cells.filter((c) => c === 'na').length;
            const unmet = swcu.cells.filter((c) => c === 'unmet').length;
            return (
              <>
                <div className="split-bar">
                  {swcu.met > 0 && <span className="met" style={{ flex: swcu.met }} />}
                  {unmet > 0 && <span className="unmet" style={{ flex: unmet }} />}
                  {na > 0 && <span className="na" style={{ flex: na }} />}
                </div>
                <div className="split-legend">
                  <span><i className="met" />달성 {swcu.met}</span>
                  {unmet > 0 && <span><i className="unmet" />미달 {unmet}</span>}
                  {na > 0 && <span><i className="na" />판정 없음 {na}</span>}
                </div>
              </>
            );
          })()}
          <div className="dash-metric-sub">
            {swcu.total === 0 ? '해당 연도 지표 없음' : null}
            {/* 그 해 지표가 아직 등록되지 않았으면 증감을 내지 않는다. 0 과 12 를
                견주면 '12개 떨어졌다' 가 되는데, 지표가 없는 것과 못 채운 것은 다르다 */}
            {swcu.total > 0 && swcuDiff != null && swcu.prevTotal != null && (
              <>
                전년 {swcu.prevMet}/{swcu.prevTotal} 대비{' '}
                <span className={`dash-delta ${swcuDiff >= 0 ? 'up' : 'down'}`}>
                  {swcuDiff >= 0 ? '+' : '-'}{Math.abs(swcuDiff)}개
                </span>
              </>
            )}
            {swcu.total > 0 && <><br /><Link href="/swcu" className="text-link">지표 상세</Link></>}
          </div>
        </div>
      </div>

      <BaselineStrip h={headcount} />

      <div style={{ borderTop: '1px solid var(--slate-100)', marginTop: 22, paddingTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <div className="dash-metric-label" style={{ marginBottom: 0 }}>
            {mode === 'count' ? '연도별 산학협력, 인턴십 건수' : '연도별 목표 대비 달성률'}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className={`btn btn-sm${mode === 'count' ? ' btn-on' : ''}`} onClick={() => setMode('count')}>건수</button>
            <button type="button" className={`btn btn-sm${mode === 'ratio' ? ' btn-on' : ''}`} onClick={() => setMode('ratio')}>달성률</button>
          </div>
        </div>
        {mode === 'count' ? <TrendChart data={trend} /> : <GoalTrendChart data={goalTrend} />}
      </div>

      {/* 원래 대시보드에 있던 주의 문구. 없으면 값이 빈 연도의 0% 를 미달성으로 읽는다 */}
      <div className="dash-note">
        참여율은 CMS 가 자체 추적하는 산학, 인턴십 정량실적입니다. SW중심대학 성과 탭의
        공식 평가지표와는 별개 자료입니다. '값 없음' 으로 나오는 해는
        원본(4차연도 현황) 엑셀에 그 연도 값이 비어 있는 것이며 실제 미달성이 아닙니다.
      </div>
    </div>
  );
}
