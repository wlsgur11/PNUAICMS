'use client';

import CountUp from '@/components/CountUp';
import type { TotalTile } from '@/lib/dashboard-shape';

/**
 * 실적 타일 넷.
 *
 * 예전에는 넷 다 전체 기간 누적을 머리 숫자로 두고 증감만 연간이었다. 연도 버튼을
 * 눌러도 숫자가 안 움직여 연도 선택이 고장 난 것처럼 보였고, '426 ▼60' 이
 * 누적에서 60 이 빠진 것으로 읽혔다. 426 과 60 은 서로 다른 것을 센 값이다.
 *
 * 지금은 항목마다 성질에 맞는 값을 머리에 둔다. 과제·인턴십은 선택 연도의 연간
 * 실적, 기업·MOU 는 시점 개념이 없어 현재 기준 총량이다. 기준은 타일마다 적는다.
 *
 * 타일마다 작은 추이선을 깔았다가 뺐다. 바로 옆 카드에 같은 데이터로 그린 연도별
 * 차트가 이미 있어 한 화면에서 같은 것을 두 번 그리는 꼴이었고, 연간 집계를
 * 선으로 이은 것 자체가 없는 값을 지어내는 표기였다.
 */
function Tile({ label, tile, year, unit, extra }: {
  label: string;
  tile: TotalTile;
  year: number;
  /** 큰 숫자 뒤에 붙일 단위. 기업은 곳, 과제·인턴십·MOU 는 건 */
  unit: string;
  extra?: string;
}) {
  const d = tile.delta;
  const annual = tile.basis === 'annual';
  // 현재 기준 타일은 증감을 머리 숫자 옆에 못 붙인다. 기업의 연간 증감은 신규
  // 유입이라 총량이 그만큼 변한 것으로 읽힌다. 추이선 밑에 따로 적는다
  const { newThisYear } = tile;
  return (
    <div>
      <div className="dash-metric-label">{label}</div>
      <div className="dash-metric-value">
        <CountUp end={tile.value} /><span className="unit">{unit}</span>
      </div>
      <div className="dash-metric-sub">
        {annual ? `${year}년 실적` : '현재 기준'}
        {annual && d != null && (
          d === 0
            ? ' · 전년과 동일'
            : (
              <>
                {' '}
                <span className={`dash-delta ${d > 0 ? 'up' : 'down'}`}>
                  {d > 0 ? '▲' : '▼'}{Math.abs(d)}
                </span>
              </>
            )
        )}
      </div>

      <div className="dash-metric-sub" style={{ marginTop: 8 }}>
        {annual && `전체 누적 ${tile.total}${unit}`}
        {newThisYear != null && `${year}년 신규 ${newThisYear}${unit}`}
        {extra && <>{(annual || newThisYear != null) && <br />}{extra}</>}
      </div>
    </div>
  );
}

export default function TotalsCard({ totals, partnerCompanies, year }: {
  totals: { companies: TotalTile; projects: TotalTile; internships: TotalTile; mou: TotalTile };
  /** 실적이 붙은 기업 수. 관리 대상 기업 수와 다르다 */
  partnerCompanies: number;
  year: number;
}) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>실적 요약</h2>
        <p>산학 과제와 인턴십은 선택한 연도의 연간 실적입니다. 협력 기업과 MOU는 현재 기준입니다.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '22px 20px' }}>
        <Tile label="협력 기업" tile={totals.companies} year={year} unit="곳" extra={`실적 있는 기업 ${partnerCompanies}곳`} />
        <Tile label="산학 과제" tile={totals.projects} year={year} unit="건" />
        {/* 아래 인턴십 교육 실적 카드에 '교육인원 5765명' 이 있어서, 단위를 안
            붙이면 이 숫자가 인원인지 건수인지 한 화면에서 구분되지 않는다 */}
        <Tile label="인턴십" tile={totals.internships} year={year} unit="건" />
        {/* MOU 는 체결일 칸이 없어 연도별로 가를 수 없다 */}
        <Tile label="MOU 체결" tile={totals.mou} year={year} unit="건" extra="체결일이 없어 연도별 비교 불가" />
      </div>
    </div>
  );
}
