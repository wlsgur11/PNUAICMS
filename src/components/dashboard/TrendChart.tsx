'use client';

import { useState } from 'react';
import type { TrendPoint } from '@/lib/dashboard-shape';

/**
 * 연도별 산학, 인턴십 건수.
 *
 * 선이 아니라 막대로 그린다. 연간 집계는 이산값이라 2024 와 2025 사이에는 값이
 * 존재하지 않는다. 선으로 이으면, 특히 곡선으로 이으면 그 사이를 연속적으로
 * 변한 것처럼 보여 준다. 없는 값을 지어내는 셈이다.
 *
 * 면적도 깔지 않는다. 면적은 누적량을 뜻하는데 연간 건수는 누적이 아니다.
 *
 * 목표 대비 달성률 차트와 같은 모양이라야 토글로 오갈 때 값만 바뀐 것으로 읽힌다.
 */
const SERIES = [
  { key: 'projects', label: '산학협력', color: 'var(--chart-1)' },
  { key: 'internships', label: '인턴십', color: 'var(--chart-2)' },
] as const;

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // 호출부가 값을 안 넘겼을 때도 화면이 죽지 않게 한다
  const series = [...(data ?? [])].sort((a, b) => a.year - b.year);

  if (series.length === 0) {
    return <div className="muted" style={{ fontSize: 12, padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }

  const rawMax = Math.max(1, ...series.flatMap((d) => [d.projects, d.internships]));
  // 축 최대값은 중간 눈금까지 정수로 떨어지는 값으로 올린다.
  // 17 로 두면 중간 눈금이 8.5 인데 라벨은 '9' 로 반올림돼 선 위치와 어긋난다
  const unit = Math.max(2, Math.pow(10, Math.floor(Math.log10(rawMax))));
  const max = Math.ceil((rawMax * 1.1) / unit) * unit;
  const ticks = [0, max / 2, max];

  // 올해는 아직 안 끝난 해다. 사선을 얹어 확정 수치가 아님을 드러낸다.
  // 다른 해와 똑같이 칠하면 연중 실적이 전년 대비 급락한 것으로 읽힌다
  const nowYear = new Date().getFullYear();
  const hasPartial = series.some((d) => d.year === nowYear);
  const H = 120;

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 11, color: 'var(--text-3)' }}>
        {SERIES.map((s) => (
          <span key={s.key}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: s.color, borderRadius: 1, marginRight: 5 }} />
            {s.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {/* Y축. 막대와 같은 높이 상자를 두고 눈금 위치에 라벨을 얹는다 */}
        <div style={{ position: 'relative', width: 26, height: H, flexShrink: 0 }}>
          {ticks.map((t) => (
            <span key={t} style={{
              position: 'absolute', right: 0, bottom: `${(t / max) * 100}%`,
              transform: 'translateY(50%)', fontSize: 10, color: 'var(--text-3)',
            }}>{t}</span>
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
              <div
                key={d.year}
                onMouseEnter={() => setHover(d.year)}
                onMouseLeave={() => setHover(null)}
                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}
              >
                {SERIES.map((s) => (
                  <div key={s.key} style={{ flex: 1, maxWidth: 26, height: '100%', position: 'relative' }}>
                    <div
                      className={d.year === nowYear ? 'chart-gap-overlay' : undefined}
                      title={`${d.year} ${s.label} ${d[s.key]}건${d.year === nowYear ? ' · 진행중' : ''}`}
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        // 0 건인 해는 높이를 주지 않는다. 최소 높이를 주면 실적이
                        // 조금 있는 것으로 읽힌다
                        height: `${(d[s.key] / max) * 100}%`,
                        backgroundColor: s.color, borderRadius: '2px 2px 0 0',
                        opacity: hover == null || hover === d.year ? 1 : 0.4,
                        transition: 'opacity 160ms',
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 연도 라벨은 Y축 폭(26) 과 간격(8) 만큼 밀어 막대와 세로를 맞춘다 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 6, marginLeft: 34 }}>
        {series.map((d) => (
          <div key={d.year} style={{
            flex: 1, textAlign: 'center', fontSize: 10,
            color: hover === d.year ? 'var(--text-1)' : 'var(--text-3)',
          }}>
            {d.year}
          </div>
        ))}
      </div>

      {/* 마우스를 올린 해의 값은 글로 적는다. 막대 위 라벨을 상시로 띄우면
          네 해 여덟 개 숫자가 격자보다 먼저 읽힌다 */}
      <div className="dash-note" style={{ marginTop: 8, minHeight: 18 }}>
        {hover != null
          ? (() => {
            const d = series.find((x) => x.year === hover)!;
            return `${d.year}년 산학협력 ${d.projects}건, 인턴십 ${d.internships}건${d.year === nowYear ? ' (진행중)' : ''}`;
          })()
          : hasPartial
            ? `사선 막대(${nowYear}년)는 아직 끝나지 않은 연도라 실적이 계속 쌓입니다.`
            : ''}
      </div>
    </div>
  );
}
