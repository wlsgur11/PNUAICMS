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
        <p>협력 기업의 진행 단계별 분포입니다. 미접촉 단계에 남아 있는 기업 수와 협의중 대비 협약완료 비중을 확인하실 수 있습니다.</p>
      </div>

      {pipeline.byStatus.map((s, i) => (
        <Link key={s.status} href={`/companies?status=${encodeURIComponent(s.status)}`} className="dash-list-row">
          <span className="name">{s.status}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
            {/* 막대는 비율을 눈으로 가늠하는 보조 장치다 */}
            <span className="dash-bar" style={{ '--bar-w': '120px' } as React.CSSProperties}>
              <span style={{
                width: `${(s.count / max) * 100}%`,
                // 마지막 단계(협약완료)만 초록. 여기까지 온 것이 목표다
                ...(i === last ? { '--bar-color': 'var(--chart-met)' } : {}),
              } as React.CSSProperties} />
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
