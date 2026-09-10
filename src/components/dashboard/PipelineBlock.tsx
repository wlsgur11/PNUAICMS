'use client';

import Link from 'next/link';
import type { DashboardData } from '@/lib/dashboard-shape';

type Pipeline = NonNullable<DashboardData['pipeline']>;

// 색은 의미가 있는 곳에만. 마지막 단계(성사)만 초록, 나머지는 같은 강조색이다.
// 단계마다 다른 색을 쓰면 그 색들이 뜻하는 바가 없어 화면만 시끄러워진다.
const stageColor = (i: number, last: number) => (i === last ? 'var(--green-600)' : 'var(--accent)');

export default function PipelineBlock({ pipeline }: { pipeline: Pipeline }) {
  const max = Math.max(1, ...pipeline.byStatus.map((s) => s.count));
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="dash-eyebrow">기업 파이프라인</div>
      <div className="dash-question">협력 기업을 더 늘려야 하나?</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {pipeline.byStatus.map((s, i) => (
          <Link key={s.status} href={`/companies?status=${encodeURIComponent(s.status)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                className="dash-num"
                style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, minWidth: 30, textAlign: 'right' }}
              >
                {s.count}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.status}</span>
            </div>
            {/* 막대는 비율을 눈으로 가늠하는 보조 장치다. 얇게 두어 숫자를 가리지 않는다. */}
            <div style={{ height: 4, background: 'var(--slate-100)', borderRadius: 2, marginTop: 4 }}>
              <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: stageColor(i, pipeline.byStatus.length - 1), borderRadius: 2 }} />
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
