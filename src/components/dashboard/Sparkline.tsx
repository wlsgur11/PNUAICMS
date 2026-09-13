'use client';

import { useId } from 'react';

/**
 * 타일 밑에 깔리는 작은 추이선. 숫자를 읽는 것이 아니라 방향만 보는 그래프라
 * 축도 눈금도 두지 않는다.
 *
 * 강조할 연도(선택 연도)만 점을 찍는다. 모든 점을 찍으면 선보다 점이 먼저 보이고,
 * 하나도 안 찍으면 지금 보고 있는 연도가 어디인지 알 수 없다.
 */
export default function Sparkline({ data, activeYear, color = 'var(--chart-1)' }: {
  data: { year: number; count: number }[];
  activeYear?: number;
  color?: string;
}) {
  const uid = useId();
  const series = [...data].sort((a, b) => a.year - b.year);
  if (series.length < 2) return null;

  const W = 120, H = 26, pad = 3;
  // 최대가 0 이면(전 연도 실적 없음) 나눗셈이 깨진다. 바닥에 붙은 평평한 선이 답이다
  const max = Math.max(1, ...series.map((d) => d.count));
  const xOf = (i: number) => pad + ((W - pad * 2) * i) / (series.length - 1);
  const yOf = (v: number) => pad + (H - pad * 2) * (1 - v / max);

  // 큰 차트와 같은 Catmull-Rom. 한 화면에서 선 모양이 두 가지면 서로 다른 것으로 읽힌다
  let d = `M${xOf(0)},${yOf(series[0].count)}`;
  for (let i = 0; i < series.length - 1; i++) {
    const p1 = { x: xOf(i), y: yOf(series[i].count) };
    const p2 = { x: xOf(i + 1), y: yOf(series[i + 1].count) };
    const p0 = i === 0 ? p1 : { x: xOf(i - 1), y: yOf(series[i - 1].count) };
    const p3 = i + 2 >= series.length ? p2 : { x: xOf(i + 2), y: yOf(series[i + 2].count) };
    const clamp = (v: number) => Math.min(H - pad, Math.max(pad, v));
    d += ` C${p1.x + (p2.x - p0.x) / 6},${clamp(p1.y + (p2.y - p0.y) / 6)}`
      + ` ${p2.x - (p3.x - p1.x) / 6},${clamp(p2.y - (p3.y - p1.y) / 6)}`
      + ` ${p2.x},${p2.y}`;
  }
  const activeIdx = activeYear == null ? -1 : series.findIndex((s) => s.year === activeYear);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
         style={{ display: 'block', marginTop: 8, overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${xOf(series.length - 1)},${H - pad} L${xOf(0)},${H - pad} Z`} fill={`url(#${uid}-f)`} />
      {/* preserveAspectRatio=none 으로 가로를 늘리면 선 굵기도 같이 늘어난다.
          vector-effect 가 있어야 어느 폭에서나 같은 두께로 보인다 */}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"
            vectorEffect="non-scaling-stroke" />
      {activeIdx >= 0 && (
        <circle cx={xOf(activeIdx)} cy={yOf(series[activeIdx].count)} r={2.5}
                fill="var(--surface)" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}
