'use client';

import { useId, useState } from 'react';
import type { TrendPoint } from '@/lib/dashboard-shape';

/**
 * 연도별 산학, 인턴십 건수. 막대 위에 연결선을 얹은 형태다.
 *
 * 막대는 그 해 값을 읽고 이웃 해와 길이를 견주는 데 쓰고, 선은 방향을 읽는 데
 * 쓴다. 같은 축 위에 그린다. 막대와 선에 축을 따로 주면 두 축의 상대 높이가
 * 임의라서 스케일만 바꿔도 선이 막대 위아래로 움직인다. 없는 상관을 만든다.
 *
 * 선은 직선이다. 연간 집계는 이산값이라 2024 와 2025 사이에는 값이 없다.
 * 곡선으로 이으면 그 구간을 부풀려 지나가며 없는 값을 그려낸다. 직선은 관행상
 * '읽기 보조선' 으로 이해되고, 점이 실측치 위치를 표시한다.
 *
 * 면적은 깔지 않는다. 면적은 누적량을 뜻하는데 연간 건수는 누적이 아니다.
 */
const SERIES = [
  { key: 'projects', label: '산학협력', color: 'var(--chart-1)' },
  { key: 'internships', label: '인턴십', color: 'var(--chart-2)' },
] as const;

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId();
  // 호출부가 값을 안 넘겼을 때도 화면이 죽지 않게 한다
  const series = [...(data ?? [])].sort((a, b) => a.year - b.year);

  if (series.length === 0) {
    return <div className="muted" style={{ fontSize: 12, padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }

  const W = 480, H = 150, padL = 28, padR = 8, padT = 10, padB = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const rawMax = Math.max(1, ...series.flatMap((d) => [d.projects, d.internships]));
  // 축 최대값은 중간 눈금까지 정수로 떨어지는 값으로 올린다.
  // 17 로 두면 중간 눈금이 8.5 인데 라벨은 '9' 로 반올림돼 선 위치와 어긋난다
  const unit = Math.max(2, Math.pow(10, Math.floor(Math.log10(rawMax))));
  const max = Math.ceil((rawMax * 1.1) / unit) * unit;
  const ticks = [0, max / 2, max];
  const yOf = (v: number) => padT + plotH * (1 - v / max);

  // 한 해가 차지하는 폭. 그 안에 계열 수만큼 막대를 넣는다
  const slot = plotW / series.length;
  const barW = Math.min(20, (slot * 0.56) / SERIES.length);
  const gap = 3;
  // 계열 si 의 막대 중심. 연도 묶음의 가운데를 기준으로 좌우로 편다
  const centerOf = (i: number, si: number) => {
    const groupW = SERIES.length * barW + (SERIES.length - 1) * gap;
    const left = padL + slot * i + (slot - groupW) / 2;
    return left + si * (barW + gap) + barW / 2;
  };

  // 올해는 아직 안 끝난 해다. 사선을 얹어 확정 수치가 아님을 드러낸다.
  // 다른 해와 똑같이 칠하면 연중 실적이 전년 대비 급락한 것으로 읽힌다
  const nowYear = new Date().getFullYear();
  const hasPartial = series.some((d) => d.year === nowYear);
  const hoverIdx = hover == null ? -1 : series.findIndex((d) => d.year === hover);
  const active = hoverIdx < 0 ? null : series[hoverIdx];
  // 말풍선은 그 해 묶음 가운데에, 차트 위쪽에 고정으로 뜬다.
  // 막대 끝에 붙이려 했더니 값이 큰 해에서 차트 밖으로 나갔다. SVG 의 실제
  // 렌더 높이가 카드 폭에 따라 변해서 퍼센트로는 넘침을 막을 수 없다.
  // 위에 고정하면 키 큰 막대를 덮지만 값은 말풍선 안에 글로 적혀 있다
  const tipLeft = active ? ((padL + slot * (hoverIdx + 0.5)) / W) * 100 : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 6, fontSize: 11, color: 'var(--text-3)' }}>
        {SERIES.map((s) => (
          <span key={s.key}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: s.color, borderRadius: 1, marginRight: 5 }} />
            {s.label}
          </span>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}
           role="img" aria-label="연도별 산학협력과 인턴십 건수">
        <defs>
          {/* 진행중인 해의 사선. CSS .chart-gap-overlay 와 같은 모양을 SVG 로 낸다 */}
          {SERIES.map((s) => (
            <pattern key={s.key} id={`${uid}-${s.key}`} width="5" height="5"
                     patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill={s.color} />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--surface)" strokeWidth="1.6" />
            </pattern>
          ))}
        </defs>

        {/* 가로 눈금. 실선으로 그으면 격자가 데이터보다 진해진다 */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={yOf(t)} x2={W - padR} y2={yOf(t)}
                  stroke="var(--chart-grid)" strokeWidth={1} strokeDasharray="3 4" />
            <text x={padL - 6} y={yOf(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-3)">{t}</text>
          </g>
        ))}

        {SERIES.map((s, si) => {
          const pts = series.map((d, i) => ({ x: centerOf(i, si), y: yOf(d[s.key]) }));
          return (
            <g key={s.key}>
              {series.map((d, i) => {
                const h = (d[s.key] / max) * plotH;
                return (
                  <rect
                    key={d.year}
                    x={centerOf(i, si) - barW / 2} y={padT + plotH - h}
                    width={barW} height={h} rx={2}
                    fill={d.year === nowYear ? `url(#${uid}-${s.key})` : s.color}
                    opacity={hover == null || hover === d.year ? 1 : 0.35}
                    style={{ transition: 'opacity 160ms' }}
                  />
                );
              })}
              {/* 막대 끝을 잇는 직선. 방향만 읽는 보조선이라 얇게 둔다 */}
              {series.length > 1 && (
                <polyline
                  points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke={s.color} strokeWidth={1.5}
                  strokeLinecap="round" strokeLinejoin="round" opacity={0.85}
                />
              )}
              {pts.map((p, i) => (
                <circle key={series[i].year} cx={p.x} cy={p.y} r={2.6}
                        fill="var(--surface)" stroke={s.color} strokeWidth={1.5} />
              ))}
            </g>
          );
        })}

        {series.map((d, i) => (
          <g key={d.year}>
            <text x={padL + slot * (i + 0.5)} y={H - 5} textAnchor="middle" fontSize={10}
                  fill={hover === d.year ? 'var(--text-1)' : 'var(--text-3)'}>{d.year}</text>
            {/* 마우스 판정용 투명 세로 띠. 막대만 판정하면 사이가 죽은 영역이 된다 */}
            <rect x={padL + slot * i} y={0} width={slot} height={H} fill="transparent"
                  onMouseEnter={() => setHover(d.year)} onMouseLeave={() => setHover(null)} />
          </g>
        ))}
      </svg>

      {/* 값은 마우스를 올렸을 때만 띄운다. 막대마다 상시 라벨을 달면 네 해
          여덟 개 숫자가 격자보다 먼저 읽힌다 */}
      {active && (
        <div
          style={{
            // 그리기 영역 위에 얹는다. 안쪽에 두면 키 큰 막대를 가려서
            // 정작 읽으려는 해의 막대가 안 보인다
            position: 'absolute', left: `${tipLeft}%`, top: -6,
            // 양끝 해는 가운데 정렬하면 카드 밖으로 잘린다
            transform: `translate(${hoverIdx === 0 ? '-10%' : hoverIdx === series.length - 1 ? '-90%' : '-50%'}, -100%)`,
            background: 'var(--slate-900)', color: 'var(--surface)',
            borderRadius: 'var(--radius-sm)', padding: '7px 10px',
            fontSize: 11, lineHeight: 1.6, whiteSpace: 'nowrap',
            pointerEvents: 'none', boxShadow: 'var(--shadow-md)', zIndex: 1,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            {active.year}{active.year === nowYear ? ' (진행중)' : ''}
          </div>
          {SERIES.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, background: s.color, borderRadius: 1, flexShrink: 0 }} />
              {s.label} {active[s.key]}건
            </div>
          ))}
        </div>
      )}
      </div>

      {hasPartial && (
        <div className="dash-note" style={{ marginTop: 6 }}>
          사선 막대({nowYear}년)는 아직 끝나지 않은 연도라 실적이 계속 쌓입니다.
        </div>
      )}
    </div>
  );
}
