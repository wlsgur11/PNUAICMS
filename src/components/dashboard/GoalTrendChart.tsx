'use client';

import type { GoalTrendPoint } from '@/lib/dashboard-shape';

/**
 * 연도별 목표 대비 달성률. 한 해가 한 줄이다(최근 해가 위).
 *
 * 막대는 달성률, 막대 위 세로 눈금은 목표. 막대가 눈금을 넘으면 달성이라 초록으로 칠한다.
 * 막대 끝에는 달성률과 '목표 대비' 를 늘 글로 적는다(2026-11-18 "숫자가 직관적으로").
 * 원본 엑셀에 값이 빈 해가 있다. 0% 막대로 그리면 미달성으로 읽혀서 '값 없음' 으로 적는다.
 */
const SERIES = [
  { key: 'industry', label: '산학협력' },
  { key: 'internship', label: '인턴십' },
] as const;

const pick = (d: GoalTrendPoint, k: 'industry' | 'internship') =>
  k === 'industry'
    ? { actual: d.industryAchieved, target: d.industryTarget }
    : { actual: d.internshipAchieved, target: d.internshipTarget };

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function GoalTrendChart({ data }: { data: GoalTrendPoint[] }) {
  const rows = [...(data ?? [])].sort((a, b) => b.year - a.year);
  if (rows.length === 0) {
    return <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }
  // 막대 끝은 달성률과 목표 중 큰 값에 여유를 둔다. 목표 눈금이 막대 끝에 붙지 않게
  const max = Math.max(0.01, ...rows.flatMap((d) => SERIES.flatMap((s) => {
    const { actual, target } = pick(d, s.key);
    return [actual ?? 0, target ?? 0];
  }))) * 1.1;
  const nowYear = new Date().getFullYear();

  return (
    <div className="yr-chart" role="table" aria-label="연도별 목표 대비 달성률">
      <div className="yr-legend" aria-hidden="true">
        {SERIES.map((s) => <span key={s.key}><i className={`yr-key ${s.key}`} />{s.label}</span>)}
        <span><i className="yr-key met" />목표 달성</span>
        <span><i className="yr-key target" />목표</span>
      </div>
      {rows.map((d) => {
        const partial = d.year === nowYear;
        return (
          <div key={d.year} className="yr-row" role="row">
            <div className="yr-year" role="rowheader">
              {d.year}
              {partial && <span className="yr-partial">진행 중</span>}
            </div>
            <div className="yr-lines">
              {SERIES.map((s) => {
                const { actual, target } = pick(d, s.key);
                const met = actual != null && target != null && actual >= target;
                return (
                  <div key={s.key} className={`yr-line ${s.key}${met ? ' met' : ''}`} role="cell">
                    <div className="yr-bar">
                      {actual != null && (
                        <span className={partial ? 'partial' : undefined} style={{ width: `${(actual / max) * 100}%` }} />
                      )}
                      {target != null && <i className="yr-target" style={{ left: `${(target / max) * 100}%` }} aria-hidden="true" />}
                    </div>
                    <div className="yr-val">
                      <span className="sr-only">{s.label} </span>
                      {actual == null ? <span className="muted">값 없음</span> : <b>{pct(actual)}</b>}
                      {actual != null && target != null && (
                        <em className={met ? 'up' : undefined}>
                          {met ? '달성' : `목표까지 ${((target - actual) * 100).toFixed(1)}%p`}
                        </em>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
