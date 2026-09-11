'use client';

import Link from 'next/link';
import type { DashboardData } from '@/lib/dashboard-shape';

type Pipeline = NonNullable<DashboardData['pipeline']>;

export default function PipelineBlock({ pipeline }: { pipeline: Pipeline }) {
  const max = Math.max(1, ...pipeline.byStatus.map((s) => s.count));
  const last = pipeline.byStatus.length - 1;

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>기업 파이프라인</h2>
        <p>협력 기업을 더 늘려야 하는지 판단한다. 미접촉만 쌓여 있으면 접촉이 안 되고 있는 것이고, 협의중 대비 협약완료가 적으면 전환이 안 되는 것이다</p>
      </div>

      {pipeline.byStatus.map((s, i) => (
        <Link key={s.status} href={`/companies?status=${encodeURIComponent(s.status)}`} className="dash-list-row">
          <span className="name">{s.status}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
            {/* 막대는 비율을 눈으로 가늠하는 보조 장치다 */}
            <span style={{ flex: '0 1 120px', height: 4, background: 'var(--slate-100)', borderRadius: 2 }}>
              <span style={{
                display: 'block', width: `${(s.count / max) * 100}%`, height: '100%', borderRadius: 2,
                background: i === last ? 'var(--green-600)' : 'var(--accent)',
              }} />
            </span>
            <span className="num" style={{ minWidth: 28, textAlign: 'right' }}>{s.count}</span>
          </span>
        </Link>
      ))}

      <div className="dash-note">
        올해 신규 유입 <span className="dash-num" style={{ color: 'var(--text-1)', fontWeight: 500 }}>{pipeline.newThisYear}개</span>
        <span style={{ margin: '0 6px', color: 'var(--slate-300)' }}>|</span>
        보류 {pipeline.onHold}, 종료 {pipeline.closed}
      </div>
    </div>
  );
}
