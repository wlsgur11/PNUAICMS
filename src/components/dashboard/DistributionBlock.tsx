'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DashboardData, DistributionItem } from '@/lib/dashboard-shape';

type Distribution = NonNullable<DashboardData['distribution']>;
type Axis = 'dept' | 'division' | 'type';

const AXES: { key: Axis; label: string }[] = [
  { key: 'dept', label: '학과' },
  { key: 'division', label: '분과' },
  { key: 'type', label: '유형' },
];

// 강조색 하나의 농도 차이만 쓴다. 항목마다 다른 색을 주면 색이 뜻 없이 늘어난다.
// 05 가 가장 진하다. 순위가 곧 농도라 범례 없이도 위아래가 읽힌다
const SHADES = [
  'var(--chart-scale-05)',
  'var(--chart-scale-04)',
  'var(--chart-scale-03)',
  'var(--chart-scale-02)',
  'var(--chart-scale-01)',
];

/** 항목이 5개를 넘으면 상위 4개와 기타로 묶는다 */
function collapse(items: DistributionItem[]): DistributionItem[] {
  if (items.length <= 5) return items;
  const head = items.slice(0, 4);
  const rest = items.slice(4).reduce((a, x) => a + x.count, 0);
  return [...head, { key: '기타', count: rest }];
}

/**
 * 학과 축은 재학생 비율을 기준선으로 잡아 판단 문장을 만든다.
 * 기준선이 없는 축은 문장을 만들지 않는다. 근거 없는 해석을 지어내지 않기 위해서다.
 */
function verdict(axis: Axis, items: DistributionItem[], baseline: Distribution['baseline']): string | null {
  if (axis !== 'dept') return null;
  const { enrolledCSE, enrolledDS } = baseline;
  if (!enrolledCSE || !enrolledDS) return null;
  const total = items.reduce((a, x) => a + x.count, 0);
  if (total === 0) return null;
  const share = ((items.find((x) => x.key === '정컴')?.count ?? 0) / total) * 100;
  const base = (enrolledCSE / (enrolledCSE + enrolledDS)) * 100;
  const gap = share - base;
  if (Math.abs(gap) < 5) return `정컴 비중이 재학생 비율 ${base.toFixed(0)}%와 비슷합니다`;
  return `정컴 비중이 재학생 비율 ${base.toFixed(0)}%보다 ${Math.abs(gap).toFixed(0)}%p ${gap > 0 ? '높습니다' : '낮습니다'}`;
}

export default function DistributionBlock({ distribution }: { distribution: Distribution }) {
  const [axis, setAxis] = useState<Axis>('dept');
  // 누적 막대의 칸과 아래 목록 행을 짝지어 서로를 밝힌다. 칸이 다섯이고 색이
  // 농도 차이뿐이라, 어느 칸이 어느 항목인지 색만으로는 짚기 어렵다
  const [hot, setHot] = useState<string | null>(null);
  const items = collapse(distribution[axis]);
  const total = items.reduce((a, x) => a + x.count, 0);
  const note = verdict(axis, distribution[axis], distribution.baseline);

  // 분과는 코드(A~F)가 old5/new6 두 버전에 다른 이름으로 있어, 버전까지 넘겨야
  // 링크 결과 건수가 화면에 보이는 건수와 일치한다
  const hrefFor = (item: DistributionItem): string | null => {
    const { key, code, version } = item;
    if (key === '기타' || key === '미분류' || key === '미지정') return null;
    const q = encodeURIComponent(key);
    if (axis === 'dept') return `/projects?dept=${q}`;
    if (axis === 'type') return `/projects?type=${q}`;
    if (code) {
      const v = version ? `&divisionVersion=${encodeURIComponent(version)}` : '';
      return `/projects?division=${encodeURIComponent(code)}${v}`;
    }
    return null;
  };

  return (
    <div className="card dash-card">
      <div className="dash-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2>쏠림 진단</h2>
          <p>산학협력 과제의 학과, 분과, 유형별 분포입니다. 전체 연도 누적 기준입니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {AXES.map((a) => (
            <button key={a.key} type="button" className={`btn btn-sm${axis === a.key ? ' btn-primary' : ''}`} onClick={() => setAxis(a.key)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>이 조건에 해당하는 데이터가 없습니다.</div>
      ) : (
        <>
          <div style={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
            {items.map((x, i) => (
              <div
                key={x.key}
                title={`${x.key} ${x.count}건`}
                onMouseEnter={() => setHot(x.key)}
                onMouseLeave={() => setHot(null)}
                style={{
                  width: `${(x.count / total) * 100}%`,
                  background: SHADES[i] ?? 'var(--chart-scale-01)',
                  // 지목한 칸만 남기고 나머지를 흐린다. 칸을 진하게 만드는 쪽은
                  // 이미 가장 진한 05 칸에서 변화가 안 보인다
                  opacity: hot == null || hot === x.key ? 1 : 0.35,
                  transition: 'opacity 160ms',
                }}
              />
            ))}
          </div>

          {/* 항목이 적어도 넓게 퍼지도록 여러 열로 배치한다 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 28px' }}>
            {items.map((x, i) => {
              const href = hrefFor(x);
              const rowProps = {
                onMouseEnter: () => setHot(x.key),
                onMouseLeave: () => setHot(null),
                // 막대 칸에 마우스를 올렸을 때도 짝이 되는 행이 밝아져야 한다.
                // CSS :hover 로는 반대 방향이 안 걸린다
                style: hot === x.key ? { background: 'var(--slate-50)' } : undefined,
              };
              const body = (
                <>
                  <span className="name">
                    <span style={{ color: SHADES[i] ?? 'var(--chart-scale-01)', marginRight: 6 }}>■</span>{x.key}
                  </span>
                  <span className="num">
                    {x.count}
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}> · {((x.count / total) * 100).toFixed(0)}%</span>
                  </span>
                </>
              );
              return href
                ? <Link key={x.key} href={href} className="dash-list-row" {...rowProps}>{body}</Link>
                : <div key={x.key} className="dash-list-row" {...rowProps}>{body}</div>;
            })}
          </div>

          {note && <div className="dash-note">{note}</div>}
        </>
      )}
    </div>
  );
}
