'use client';

import Link from 'next/link';
import type { SwcuArea } from '@/lib/dashboard-shape';

/**
 * 지표 17개를 영역으로 묶은 달성 현황. 미달 지표 목록(SwcuBlock)이 '무엇을' 이라면
 * 이쪽은 '어디가' 에 답한다. 미달이 한 영역에 몰려 있는지, 여러 영역에 퍼져 있는지가
 * 하반기 배분을 정한다.
 */
/**
 * 막대 한 구간. color 가 null 이면 판정 불가(목표치 없음) 몫이다.
 * 회색으로 채우면 '달성도가 낮다' 로 읽히는데 실제로는 채점을 안 한 칸이라,
 * 색 대신 사선을 깔아 다른 종류의 값임을 드러낸다.
 */
function seg(count: number, total: number, color: string | null) {
  if (count === 0) return null;
  const width = `${(count / total) * 100}%`;
  if (color == null) return <div className="chart-gap" style={{ width }} />;
  return <div style={{ width, background: color }} />;
}

export default function SwcuAreaCard({ areas, year }: { areas: SwcuArea[]; year: number }) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>SW중심대학 영역별</h2>
        <p>{year}년 지표를 영역별로 묶은 달성 현황입니다. 미달 지표가 많은 영역을 위에 표시합니다.</p>
      </div>

      {areas.length === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>
          {year}년 성과지표가 아직 등록되지 않았습니다. 위쪽 연도 버튼에서 다른 연도를 선택하세요.
        </div>
      ) : (
        <>
          {areas.map((a) => (
            <div key={a.area} style={{ padding: '10px 0', borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{a.area}</span>
                <span className="dash-num" style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>
                  {a.met}
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> / {a.total}</span>
                  {a.unmet > 0 && <span style={{ color: 'var(--red-600)' }}> · 미달 {a.unmet}</span>}
                </span>
              </div>
              <div style={{ display: 'flex', height: 6, borderRadius: 2, overflow: 'hidden', background: 'var(--chart-track)' }}>
                {seg(a.met, a.total, 'var(--chart-met)')}
                {seg(a.unmet, a.total, 'var(--chart-unmet)')}
                {seg(a.na, a.total, null)}
              </div>
            </div>
          ))}

          <div className="dash-note">
            사선은 목표치가 없어 달성 여부를 판정하지 않은 지표입니다.{' '}
            <Link href="/swcu" className="text-link">지표 상세</Link>
          </div>
        </>
      )}
    </div>
  );
}
