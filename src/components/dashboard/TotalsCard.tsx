'use client';

import CountUp from '@/components/CountUp';
import type { TotalTile } from '@/lib/dashboard-shape';

/** 누적 타일 하나. delta 가 null 이면 증감 줄을 그리지 않는다 */
function Tile({ label, tile }: { label: string; tile: TotalTile }) {
  const d = tile.delta;
  return (
    <div>
      <div className="dash-metric-label">{label}</div>
      <div className="dash-metric-value"><CountUp end={tile.value} /></div>
      <div className="dash-metric-sub">
        {d == null
          ? '연간 비교 불가'
          : d === 0
            ? '연간 실적 전년과 동일'
            : (
              <>
                <span className={`dash-delta ${d > 0 ? 'up' : 'down'}`}>
                  {d > 0 ? '▲' : '▼'}{Math.abs(d)}
                </span>{' '}
                연간 실적, 전년 대비
              </>
            )}
      </div>
    </div>
  );
}

export default function TotalsCard({ totals }: {
  totals: { companies: TotalTile; projects: TotalTile; internships: TotalTile; mou: TotalTile };
}) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>누적 실적</h2>
        <p>전체 기간 누적. 증감은 선택 연도와 전년의 연간 실적 비교</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '22px 20px' }}>
        <Tile label="협력 기업" tile={totals.companies} />
        <Tile label="산학 과제" tile={totals.projects} />
        <Tile label="인턴십" tile={totals.internships} />
        <Tile label="MOU 체결" tile={totals.mou} />
      </div>
    </div>
  );
}
