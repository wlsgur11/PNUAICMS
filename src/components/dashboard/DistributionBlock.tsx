'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardData, DistributionItem } from '@/lib/dashboard-shape';

type Distribution = NonNullable<DashboardData['distribution']>;
type Axis = 'dept' | 'division' | 'region' | 'type';

const AXES: { key: Axis; label: string }[] = [
  { key: 'dept', label: '학과' },
  { key: 'division', label: '분과' },
  { key: 'region', label: '지역' },
  { key: 'type', label: '유형' },
];

const COLORS = ['var(--accent)', '#8ab0e8', '#b9cdf0', 'var(--slate-300)', 'var(--slate-200)'];

/** 항목이 5개를 넘으면 상위 4개와 기타로 묶는다. */
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
  const cse = items.find((x) => x.key === '정컴')?.count ?? 0;
  if (total === 0) return null;
  const share = (cse / total) * 100;
  const base = (enrolledCSE / (enrolledCSE + enrolledDS)) * 100;
  const gap = share - base;
  if (Math.abs(gap) < 5) return `정컴 비중이 재학생 비율(${base.toFixed(0)}%)과 비슷합니다`;
  return `정컴 비중이 재학생 비율(${base.toFixed(0)}%)보다 ${Math.abs(gap).toFixed(0)}%p ${gap > 0 ? '높음' : '낮음'}`;
}

export default function DistributionBlock({ distribution, year }: { distribution: Distribution; year: number }) {
  const router = useRouter();
  const [axis, setAxis] = useState<Axis>('dept');
  const items = collapse(distribution[axis]);
  const total = items.reduce((a, x) => a + x.count, 0);
  const note = verdict(axis, distribution[axis], distribution.baseline);

  // 분과는 코드(A~F)가 old5/new6 두 버전에 다른 이름으로 있어, 버전까지 넘겨야
  // 링크 결과 건수가 화면에 보이는 건수와 일치한다.
  const go = (item: DistributionItem) => {
    const { key, code, version } = item;
    if (key === '기타' || key === '미분류' || key === '미지정') return;
    const q = encodeURIComponent(key);
    if (axis === 'region') router.push(`/companies?region=${q}`);
    else if (axis === 'dept') router.push(`/projects?year=${year}&dept=${q}`);
    else if (axis === 'type') router.push(`/projects?year=${year}&type=${q}`);
    else if (code) {
      const v = version ? `&divisionVersion=${encodeURIComponent(version)}` : '';
      router.push(`/projects?year=${year}&division=${encodeURIComponent(code)}${v}`);
    }
  };

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="dash-eyebrow">쏠림 진단</div>
      <div className="dash-question">어디에 편중돼 있나?</div>

      <div style={{ display: 'flex', gap: 3, marginBottom: 12, flexWrap: 'wrap' }}>
        {AXES.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`btn btn-sm${axis === a.key ? ' btn-primary' : ''}`}
            onClick={() => setAxis(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="empty" style={{ fontSize: 12 }}>이 조건에 해당하는 데이터가 없습니다.</div>
      ) : (
        <>
          <div style={{ display: 'flex', height: 26, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
            {items.map((x, i) => (
              <div
                key={x.key}
                title={`${x.key} ${x.count}건`}
                onClick={() => go(x)}
                style={{ width: `${(x.count / total) * 100}%`, background: COLORS[i] ?? 'var(--slate-200)', cursor: 'pointer' }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 11 }}>
            {items.map((x, i) => (
              <div key={x.key} onClick={() => go(x)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, cursor: 'pointer' }}>
                <span style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: COLORS[i] ?? 'var(--slate-200)' }}>■</span> {x.key}
                </span>
                <span className="dash-num" style={{ fontWeight: 700 }}>
                  {x.count}건 · {((x.count / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {note && (
            <div style={{ background: 'var(--amber-soft-bg)', color: 'var(--amber-soft-text)', borderRadius: 3, padding: '8px 10px', fontSize: 11, lineHeight: 1.5 }}>
              {note}
            </div>
          )}
        </>
      )}
    </div>
  );
}
