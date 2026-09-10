'use client';

import Link from 'next/link';
import type { DashboardData } from '@/lib/dashboard-shape';

type Pipeline = NonNullable<DashboardData['pipeline']>;

// 미접촉에서 협약완료로 갈수록 진해진다. 마지막은 초록(성사)
const STAGE_COLOR = ['var(--slate-300)', '#9dbdea', '#6f9fe3', 'var(--accent)', 'var(--green-600)'];

export default function PipelineBlock({ pipeline }: { pipeline: Pipeline }) {
  const max = Math.max(1, ...pipeline.byStatus.map((s) => s.count));
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="dash-eyebrow">기업 파이프라인</div>
      <div className="dash-question">협력 기업을 더 늘려야 하나?</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {pipeline.byStatus.map((s, i) => (
          <Link key={s.status} href={`/companies?status=${encodeURIComponent(s.status)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>
              <span>{s.status}</span>
              <span className="dash-num" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{s.count}</span>
            </div>
            <div style={{ height: 14, background: 'var(--slate-100)', borderRadius: 2 }}>
              <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: STAGE_COLOR[i] ?? 'var(--accent)', borderRadius: 2 }} />
            </div>
          </Link>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--slate-100)', marginTop: 12, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span className="muted">올해 신규 유입</span>
        <span className="dash-num" style={{ fontWeight: 800, color: pipeline.newThisYear > 0 ? 'var(--green-600)' : 'var(--text-2)' }}>
          +{pipeline.newThisYear}개
        </span>
      </div>
      <div className="muted" style={{ fontSize: 10, marginTop: 6 }}>
        보류 {pipeline.onHold} / 종료 {pipeline.closed}
      </div>
    </div>
  );
}
