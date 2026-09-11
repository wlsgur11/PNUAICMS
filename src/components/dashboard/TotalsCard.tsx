'use client';

import CountUp from '@/components/CountUp';
import type { TotalTile } from '@/lib/dashboard-shape';

/** 누적 타일 하나. delta 가 null 이면 증감 줄을 그리지 않는다 */
function Tile({ label, tile, extra }: { label: string; tile: TotalTile; extra?: string }) {
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
        {extra && <><br />{extra}</>}
      </div>
    </div>
  );
}

export default function TotalsCard({ totals, partnerCompanies }: {
  totals: { companies: TotalTile; projects: TotalTile; internships: TotalTile; mou: TotalTile };
  /** 실적이 붙은 기업 수. 관리 대상 기업 수와 다르다 */
  partnerCompanies: number;
}) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>누적 실적</h2>
        <p>전체 기간 누적입니다. 증감은 선택한 연도와 전년의 연간 실적을 비교한 값입니다.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '22px 20px' }}>
        <Tile label="협력 기업" tile={totals.companies} extra={`실적 있는 기업 ${partnerCompanies}개`} />
        <Tile label="산학 과제" tile={totals.projects} />
        <Tile label="인턴십" tile={totals.internships} />
        <Tile label="MOU 체결" tile={totals.mou} />
      </div>
    </div>
  );
}
