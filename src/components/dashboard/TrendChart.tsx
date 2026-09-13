'use client';

import { useId, useState } from 'react';
import type { TrendPoint } from '@/lib/dashboard-shape';

/**
 * 연도별 산학, 인턴십 건수 추이.
 *
 * 꺾은선 대신 Catmull-Rom 곡선을 쓴다. 연도 표본이 서너 개뿐이라 직선으로 이으면
 * 각진 지그재그가 되고, 실제로는 연속된 흐름인 값이 계단처럼 읽힌다.
 *
 * 점은 평소에 감춘다. 값 세 개에 점 세 개를 상시로 찍으면 선보다 점이 먼저 보인다.
 * 마우스를 올린 연도에만 크로스헤어와 점을 띄운다.
 */
const SERIES = [
  { key: 'projects', label: '산학협력', color: 'var(--chart-1)', width: 2.25 },
  { key: 'internships', label: '인턴십', color: 'var(--chart-2)', width: 2 },
] as const;

/**
 * 점들을 지나는 부드러운 곡선. Catmull-Rom 을 3차 베지어로 바꾼다.
 * 장력 6 은 visx 의 monotone 과 비슷한 완만함이고, 더 낮추면 점 사이가 과하게 출렁인다.
 * 제어점 y 는 그리기 영역 안으로 가둔다. 값이 셋뿐일 때 곡선이 축 밖으로 튀어
 * 0 아래로 내려간 것처럼 보이는 것을 막는다.
 */
function smoothPath(pts: { x: number; y: number }[], top: number, bottom: number) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  const clamp = (v: number) => Math.min(bottom, Math.max(top, v));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** 축 눈금 라벨. 1000 을 넘으면 자릿수 때문에 축이 넓어져서 k 로 줄인다 */
const tick = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)));

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // 호출부가 값을 안 넘겼을 때도 화면이 죽지 않게 한다
  const series = [...(data ?? [])].sort((a, b) => a.year - b.year);
  const uid = useId();

  if (series.length === 0) {
    return <div className="muted" style={{ fontSize: 12, padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }

  const W = 560, H = 168, padL = 30, padR = 12, padT = 12, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const rawMax = Math.max(1, ...series.flatMap((d) => [d.projects, d.internships]));
  // 축 최대값은 중간 눈금까지 정수로 떨어지는 값으로 올린다.
  // 17 로 두면 중간 눈금이 8.5 인데 라벨은 '9' 로 반올림돼 선 위치와 어긋난다
  const unit = Math.max(2, Math.pow(10, Math.floor(Math.log10(Math.max(1, rawMax)))));
  const max = Math.ceil((rawMax * 1.1) / unit) * unit;
  const xOf = (i: number) => padL + (series.length === 1 ? plotW / 2 : (plotW * i) / (series.length - 1));
  const yOf = (v: number) => padT + plotH * (1 - v / max);
  // 연도별 마우스 판정 구간. 이웃과의 중간점까지를 자기 구간으로 삼아
  // 빈틈 없이 이어 붙인다. (점 간격과 폭이 어긋나면 사이에 죽은 영역이 생긴다)
  const bandLeft = (i: number) => (i === 0 ? 0 : (xOf(i - 1) + xOf(i)) / 2);
  const bandRight = (i: number) => (i === series.length - 1 ? W : (xOf(i) + xOf(i + 1)) / 2);

  // 마지막 연도가 올해면 아직 안 끝난 해다. 그 구간만 점선으로 끊는다.
  // 실선으로 이으면 9월까지 쌓인 실적이 전년 대비 '감소' 로 읽힌다.
  const partial = series.length > 1 && series[series.length - 1].year === new Date().getFullYear();
  const splitX = partial ? xOf(series.length - 2) : W; // 실선과 점선의 경계

  const pathOf = (key: 'projects' | 'internships') =>
    smoothPath(series.map((d, i) => ({ x: xOf(i), y: yOf(d[key]) })), padT, padT + plotH);
  // 면은 선과 같은 곡선을 쓴다. 직선으로 닫으면 선 아래로 면이 어긋나 보인다
  const areaPath = `${pathOf('projects')} L${xOf(series.length - 1)},${padT + plotH} L${xOf(0)},${padT + plotH} Z`;

  const ticks = [0, max / 2, max];
  const active = hover == null ? null : series[hover];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 4, fontSize: 11, color: 'var(--text-3)' }}>
        {SERIES.map((s) => (
          <span key={s.key}>
            <span style={{ display: 'inline-block', width: 7, height: 7, background: s.color, borderRadius: '50%', marginRight: 5 }} />
            {s.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="연도별 산학협력과 인턴십 건수 추이">
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
          {/* 같은 곡선을 실선과 점선으로 나눠 그리기 위한 가림막.
              선을 두 번 따로 계산해 이어 붙이면 경계에서 기울기가 어긋나 꺾인 자국이 남는다 */}
          <clipPath id={`${uid}-solid`}><rect x={0} y={0} width={splitX} height={H} /></clipPath>
          <clipPath id={`${uid}-dash`}><rect x={splitX} y={0} width={W - splitX} height={H} /></clipPath>
          {/* 선이 왼쪽에서 그려지며 나타난다. rect 의 width 속성은 이미 전체 폭이라
              SMIL 이 안 돌아도 차트는 그냥 다 보인다. 애니메이션이 멈춰서 그래프가
              사라지는 일은 없다. CSS clip-path 로 하면 그 사고가 난다 */}
          <clipPath id={`${uid}-reveal`}>
            <rect x={0} y={0} width={W} height={H}>
              <animate
                attributeName="width" values={`0;${W}`} dur="0.62s" fill="freeze"
                calcMode="spline" keyTimes="0;1" keySplines="0.85 0 0.15 1"
              />
            </rect>
          </clipPath>
        </defs>

        {/* 가로 눈금. 실선으로 그으면 격자가 데이터보다 진해진다 */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={yOf(t)} x2={W - padR} y2={yOf(t)} stroke="var(--chart-grid)" strokeWidth={1} strokeDasharray="3 4" />
            <text x={padL - 8} y={yOf(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-3)">{tick(t)}</text>
          </g>
        ))}

        {/* 선과 면만 나타난다. 눈금과 라벨까지 같이 쓸려 들어오면
            축이 움직이는 것처럼 보여서 값이 흔들린 것으로 읽힌다 */}
        <g clipPath={`url(#${uid}-reveal)`}>
          {series.length > 1 && <path d={areaPath} fill={`url(#${uid}-fill)`} clipPath={`url(#${uid}-solid)`} />}

          {SERIES.map((s) => (
            <g key={s.key} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round">
              <path d={pathOf(s.key)} clipPath={`url(#${uid}-solid)`} />
              {partial && <path d={pathOf(s.key)} clipPath={`url(#${uid}-dash)`} strokeDasharray="4 4" />}
            </g>
          ))}
        </g>

        {/* 마우스를 올린 연도에만 세로선과 점을 띄운다 */}
        {hover != null && (
          <g>
            <line x1={xOf(hover)} y1={padT} x2={xOf(hover)} y2={padT + plotH} stroke="var(--chart-grid)" strokeWidth={1} />
            {SERIES.map((s) => (
              <circle key={s.key} cx={xOf(hover)} cy={yOf(series[hover][s.key])} r={4}
                      fill="var(--surface)" stroke={s.color} strokeWidth={2} />
            ))}
          </g>
        )}

        {series.map((d, i) => (
          <g key={d.year}>
            <text x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={10}
                  fill={hover === i ? 'var(--text-1)' : 'var(--text-3)'}>{d.year}</text>
            {/* 마우스 판정용 투명 세로 띠 */}
            <rect
              x={bandLeft(i)} y={0}
              width={bandRight(i) - bandLeft(i)} height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {active && (
        <div
          style={{
            position: 'absolute', top: 22, left: `${(xOf(hover!) / W) * 100}%`,
            transform: `translateX(${hover === 0 ? '0' : hover === series.length - 1 ? '-100%' : '-50%'})`,
            background: 'var(--slate-900)', color: 'var(--surface)',
            borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 11, lineHeight: 1.6,
            pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            {active.year}{partial && hover === series.length - 1 ? ' (진행중)' : ''}
          </div>
          {SERIES.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, background: s.color, borderRadius: '50%', flexShrink: 0 }} />
              {s.label} {active[s.key]}건
            </div>
          ))}
        </div>
      )}

      {partial && (
        <div className="dash-note" style={{ marginTop: 4 }}>
          점선 구간({series[series.length - 1].year}년)은 아직 끝나지 않은 연도라 실적이 계속 쌓입니다.
        </div>
      )}
    </div>
  );
}
