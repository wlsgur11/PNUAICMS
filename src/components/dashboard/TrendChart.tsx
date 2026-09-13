'use client';

import { useId, useState } from 'react';
import type { TrendPoint } from '@/lib/dashboard-shape';

/**
 * 연도별 산학, 인턴십 건수 추이. 산학은 면 그라디언트가 있는 파란 실선,
 * 인턴십은 회색 실선. 마우스를 올린 연도의 수치를 툴팁으로 띄운다.
 * 툴팁이 있으므로 점마다 상시 숫자 라벨은 두지 않는다.
 */
export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // 호출부가 값을 안 넘겼을 때도 화면이 죽지 않게 한다
  const series = [...(data ?? [])].sort((a, b) => a.year - b.year);
  const gradientId = useId();

  if (series.length === 0) {
    return <div className="muted" style={{ fontSize: 12, padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }

  const W = 420, H = 92, padL = 22, padR = 22, padT = 10, padB = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...series.flatMap((d) => [d.projects, d.internships])) * 1.15;
  const xOf = (i: number) => padL + (series.length === 1 ? plotW / 2 : (plotW * i) / (series.length - 1));
  const yOf = (v: number) => padT + plotH * (1 - v / max);
  // 연도별 마우스 판정 구간. 이웃과의 중간점까지를 자기 구간으로 삼아
  // 빈틈 없이 이어 붙인다. (점 간격과 폭이 어긋나면 사이에 죽은 영역이 생긴다)
  const bandLeft = (i: number) => (i === 0 ? 0 : (xOf(i - 1) + xOf(i)) / 2);
  const bandRight = (i: number) => (i === series.length - 1 ? W : (xOf(i) + xOf(i + 1)) / 2);

  // 마지막 연도가 올해면 아직 안 끝난 해다. 그 구간만 점선으로 끊는다.
  // 실선으로 이으면 9월까지 쌓인 실적이 전년 대비 '감소' 로 읽힌다.
  const partial = series.length > 1 && series[series.length - 1].year === new Date().getFullYear();
  const solidEnd = partial ? series.length - 1 : series.length; // 실선이 덮는 점 개수
  const pts = (key: 'projects' | 'internships', from: number, to: number) =>
    series.slice(from, to).map((d, i) => `${xOf(from + i)},${yOf(d[key])}`).join(' ');
  const area = `M${series.map((d, i) => `${xOf(i)},${yOf(d.projects)}`).join(' L')} L${xOf(series.length - 1)},${padT + plotH} L${xOf(0)},${padT + plotH} Z`;

  const active = hover == null ? null : series[hover];

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="연도별 산학협력과 인턴십 건수 추이">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {series.length > 1 && <path d={area} fill={`url(#${gradientId})`} />}
        {([
          { key: 'projects', color: 'var(--chart-1)', w: 2.5 },
          { key: 'internships', color: 'var(--chart-2)', w: 2 },
        ] as const).map((s) => (
          <g key={s.key}>
            <polyline points={pts(s.key, 0, solidEnd)} fill="none" stroke={s.color} strokeWidth={s.w} strokeLinecap="round" />
            {partial && (
              <polyline
                points={pts(s.key, solidEnd - 1, series.length)}
                fill="none" stroke={s.color} strokeWidth={s.w} strokeLinecap="round"
                strokeDasharray="4 3"
              />
            )}
          </g>
        ))}
        {series.map((d, i) => (
          <g key={d.year}>
            {/* 미완결 연도의 점은 속을 비운다. 꽉 찬 점은 확정된 값이라는 뜻으로 쓴다 */}
            <circle
              cx={xOf(i)} cy={yOf(d.projects)} r={hover === i ? 5 : 3.5}
              fill={partial && i === series.length - 1 ? 'var(--surface)' : 'var(--chart-1)'}
              stroke="var(--chart-1)" strokeWidth={partial && i === series.length - 1 ? 2 : 0}
            />
            <text x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--text-3)">{d.year}</text>
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
            position: 'absolute', top: 0, left: `${(xOf(hover!) / W) * 100}%`,
            transform: 'translateX(-50%)', background: 'var(--slate-900)', color: 'var(--surface)',
            borderRadius: 'var(--radius-sm)', padding: '6px 9px', fontSize: 11, lineHeight: 1.5,
            pointerEvents: 'none', whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700 }}>{active.year}</div>
          <div>산학 {active.projects}건</div>
          <div>인턴십 {active.internships}건</div>
        </div>
      )}
      {partial && (
        <div className="dash-note" style={{ marginTop: 6 }}>
          점선 구간({series[series.length - 1].year}년)은 아직 끝나지 않은 연도라 실적이 계속 쌓입니다.
        </div>
      )}
    </div>
  );
}
