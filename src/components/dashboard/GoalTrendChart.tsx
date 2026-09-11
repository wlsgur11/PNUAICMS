'use client';

import type { GoalTrendPoint } from '@/lib/dashboard-shape';

/**
 * 연도별 목표 대비 달성률. 원래 대시보드의 '정량실적 현황판 → 전체' 뷰에 있던 그래프다.
 *
 * 선이 아니라 막대로 그린다. 원본 엑셀에 값이 빈 연도가 있어서 선으로 이으면
 * 그 해를 0 으로 눌러야 하고, 0% 와 '값 없음' 이 구분되지 않는다.
 * 막대는 그 해를 그냥 비워 두면 된다.
 *
 * 목표치는 막대 위에 가로 눈금으로 얹는다. 막대가 눈금을 넘으면 달성이다.
 */
const SERIES = [
  { key: 'industry', label: '산학협력', color: 'var(--accent)' },
  { key: 'internship', label: '인턴십', color: 'var(--slate-400)' },
] as const;

const pick = (d: GoalTrendPoint, k: 'industry' | 'internship') =>
  k === 'industry'
    ? { actual: d.industryAchieved, target: d.industryTarget }
    : { actual: d.internshipAchieved, target: d.internshipTarget };

export default function GoalTrendChart({ data }: { data: GoalTrendPoint[] }) {
  const series = [...(data ?? [])].sort((a, b) => a.year - b.year);
  if (series.length === 0) {
    return <div className="muted" style={{ fontSize: 12, padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }

  const all = series.flatMap((d) => SERIES.flatMap((s) => {
    const { actual, target } = pick(d, s.key);
    return [actual, target];
  })).filter((v): v is number => v != null);
  const max = Math.max(0.01, ...all) * 1.2;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 78 }}>
        {series.map((d) => (
          <div key={d.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            {/* 막대 폭을 묶어 둔다. flex 로만 두면 연도가 셋일 때 한 막대가 90px 을 넘어
                납작한 덩어리로 보인다 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: '100%' }}>
              {SERIES.map((s) => {
                const { actual, target } = pick(d, s.key);
                const title = actual == null
                  ? `${d.year} ${s.label} 값 없음`
                  : `${d.year} ${s.label} ${(actual * 100).toFixed(1)}%${target != null ? ` (목표 ${(target * 100).toFixed(1)}%)` : ''}`;
                return (
                  <div key={s.key} title={title} style={{ flex: 1, maxWidth: 26, position: 'relative', height: '100%' }}>
                    {actual == null ? (
                      /* 값이 없는 해. 0% 막대로 보이면 미달성으로 읽히므로 점선만 둔다 */
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, borderTop: '1px dashed var(--slate-300)' }} />
                    ) : (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: `${Math.max(2, (actual / max) * 100)}%`,
                        background: s.color, borderRadius: '2px 2px 0 0',
                      }} />
                    )}
                    {target != null && (
                      <div style={{
                        position: 'absolute', bottom: `${(target / max) * 100}%`, left: -1, right: -1,
                        height: 0, borderTop: '1px dashed var(--text-3)',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        {series.map((d) => (
          <div key={d.year} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-3)' }}>{d.year}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
        {SERIES.map((s) => (
          <span key={s.key}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: s.color, borderRadius: 1, marginRight: 4 }} />
            {s.label}
          </span>
        ))}
        <span>--- 목표</span>
      </div>
    </div>
  );
}
