'use client';

import CountUp from '@/components/CountUp';
import TrendChart from './TrendChart';
import type { TotalTile, TrendPoint } from '@/lib/dashboard-shape';

/** 누적 타일 하나. delta 가 null 이면 증감 줄을 아예 그리지 않는다. */
function Tile({ label, tile }: { label: string; tile: TotalTile }) {
  const d = tile.delta;
  return (
    <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', padding: '11px 10px' }}>
      <div className="dash-num" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
        <CountUp end={tile.value} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 5 }}>{label}</div>
      {d != null && d !== 0 && (
        <div
          className="dash-num"
          title="누적 수치가 아니라, 선택한 연도의 실적을 전년과 비교한 값입니다"
          style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: d > 0 ? 'var(--green-600)' : 'var(--red-600)' }}
        >
          {d > 0 ? '▲' : '▼'} {Math.abs(d)} <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>연간 실적, 전년 대비</span>
        </div>
      )}
      {d === 0 && (
        <div title="누적 수치가 아니라, 선택한 연도의 실적을 전년과 비교한 값입니다" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
          연간 실적 전년과 동일
        </div>
      )}
    </div>
  );
}

export default function TotalsCard({ totals, trend }: {
  totals: { companies: TotalTile; projects: TotalTile; internships: TotalTile; mou: TotalTile };
  trend: TrendPoint[];
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="dash-eyebrow" style={{ marginBottom: 14 }}>누적 실적</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <Tile label="협력 기업" tile={totals.companies} />
        <Tile label="산학 과제" tile={totals.projects} />
        <Tile label="인턴십" tile={totals.internships} />
        <Tile label="MOU 체결" tile={totals.mou} />
      </div>
      <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 12 }}>
        <TrendChart data={trend} />
      </div>
    </div>
  );
}
