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
  { key: 'industry', label: '산학협력', color: 'var(--chart-1)' },
  { key: 'internship', label: '인턴십', color: 'var(--chart-2)' },
] as const;

const pick = (d: GoalTrendPoint, k: 'industry' | 'internship') =>
  k === 'industry'
    ? { actual: d.industryAchieved, target: d.industryTarget }
    : { actual: d.internshipAchieved, target: d.internshipTarget };

export default function GoalTrendChart({ data }: { data: GoalTrendPoint[] }) {
  const series = [...(data ?? [])].sort((a, b) => a.year - b.year);
  if (series.length === 0) {
    return <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }

  const all = series.flatMap((d) => SERIES.flatMap((s) => {
    const { actual, target } = pick(d, s.key);
    return [actual, target];
  })).filter((v): v is number => v != null);
  // 축 최대값은 5%p 단위로 올린다. 17.3% 같은 값을 축 꼭대기에 두면 눈금이 안 읽힌다
  const max = Math.max(0.05, Math.ceil((Math.max(...all) * 1.15) / 0.05) * 0.05);
  const ticks = [0, max / 2, max];
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const H = 92; // 그래프 높이. Y축 라벨과 막대가 같은 좌표계를 쓴다
  // 올해는 아직 안 끝난 해다. 막대에 사선을 얹어 확정 수치가 아님을 드러낸다.
  // 다른 해와 똑같이 칠하면 연중 실적이 전년 대비 급락한 것처럼 읽힌다
  const nowYear = new Date().getFullYear();
  const hasPartial = series.some((d) => d.year === nowYear);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Y축. 막대와 같은 높이 상자를 두고 눈금 위치에 라벨을 얹는다 */}
        <div style={{ position: 'relative', width: 34, height: H, flexShrink: 0 }}>
          {ticks.map((t) => (
            <span key={t} style={{
              position: 'absolute', right: 0, bottom: `${(t / max) * 100}%`,
              transform: 'translateY(50%)', fontSize: 'calc(10px * var(--fs, 1))', color: 'var(--text-3)', whiteSpace: 'nowrap',
            }}>{pct(t)}</span>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, height: H }}>
          {/* 가로 눈금. 실선으로 그으면 격자가 막대보다 진해진다 */}
          {ticks.map((t) => (
            <div key={t} style={{
              position: 'absolute', left: 0, right: 0, bottom: `${(t / max) * 100}%`,
              borderTop: '1px dashed var(--chart-grid)',
            }} />
          ))}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 10, height: '100%' }}>
        {series.map((d) => (
          <div key={d.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            {/* 막대 폭을 묶어 둔다. flex 로만 두면 연도가 셋일 때 한 막대가 90px 을 넘어
                납작한 덩어리로 보인다 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: '100%' }}>
              {SERIES.map((s) => {
                const { actual, target } = pick(d, s.key);
                const title = actual == null
                  ? `${d.year} ${s.label} 값 없음`
                  : `${d.year} ${s.label} ${(actual * 100).toFixed(1)}%${target != null ? ` (목표 ${(target * 100).toFixed(1)}%)` : ''}${d.year === nowYear ? ' · 진행중' : ''}`;
                return (
                  <div key={s.key} title={title} style={{ flex: 1, maxWidth: 26, position: 'relative', height: '100%' }}>
                    {actual == null ? (
                      /* 값이 없는 해. 0% 막대로 보이면 미달성으로 읽히므로 점선만 둔다 */
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, borderTop: '1px dashed var(--chart-na)' }} />
                    ) : (
                      <div
                        className={d.year === nowYear ? 'chart-gap-overlay' : undefined}
                        style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          height: `${Math.max(2, (actual / max) * 100)}%`,
                          // 목표를 넘은 해는 초록. 막대가 목표 눈금 위로 올라간 것만으로도
                          // 달성이 보이지만, 색이 같이 바뀌어야 훑을 때 걸린다.
                          // 지표 상세 화면이 이미 같은 규칙을 쓴다.
                          // 미달한 막대는 계열색을 지켜 어느 쪽이 산학이고 인턴십인지 남긴다
                          backgroundColor: target != null && actual >= target ? 'var(--chart-met)' : s.color,
                          borderRadius: '2px 2px 0 0',
                        }}
                      />
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
        </div>
      </div>
      {/* 연도 라벨은 Y축 폭(34) 과 간격(8) 만큼 밀어 막대와 세로를 맞춘다 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 6, marginLeft: 42 }}>
        {series.map((d) => (
          <div key={d.year} style={{ flex: 1, textAlign: 'center', fontSize: 'calc(10px * var(--fs, 1))', color: 'var(--text-3)' }}>{d.year}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 'calc(11px * var(--fs, 1))', color: 'var(--text-3)' }}>
        {SERIES.map((s) => (
          <span key={s.key}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: s.color, borderRadius: 1, marginRight: 4 }} />
            {s.label}
          </span>
        ))}
        <span>--- 목표</span>
        <span>
          <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--chart-met)', borderRadius: 1, marginRight: 4 }} />
          목표 달성
        </span>
      </div>
      {hasPartial && (
        <div className="dash-note" style={{ marginTop: 6 }}>
          사선 막대({nowYear}년)는 아직 끝나지 않은 연도라 실적이 계속 쌓입니다.
        </div>
      )}
    </div>
  );
}
