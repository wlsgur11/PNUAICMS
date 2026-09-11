'use client';

import Link from 'next/link';
import type { SwcuArea } from '@/lib/dashboard-shape';

/**
 * 지표 17개를 영역으로 묶은 달성 현황. 미달 지표 목록(SwcuBlock)이 '무엇을' 이라면
 * 이쪽은 '어디가' 에 답한다. 미달이 한 영역에 몰려 있는지, 여러 영역에 퍼져 있는지가
 * 하반기 배분을 정한다.
 */
function seg(count: number, total: number, color: string) {
  if (count === 0) return null;
  return <div style={{ width: `${(count / total) * 100}%`, background: color }} />;
}

export default function SwcuAreaCard({ areas, year }: { areas: SwcuArea[]; year: number }) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>SW중심대학 영역별</h2>
        <p>{year}년 지표를 영역으로 묶은 달성 현황. 미달이 많은 영역이 위로 온다</p>
      </div>

      {areas.length === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>이 연도의 성과지표가 아직 없습니다.</div>
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
              <div style={{ display: 'flex', height: 6, borderRadius: 2, overflow: 'hidden', background: 'var(--slate-100)' }}>
                {seg(a.met, a.total, 'var(--green-600)')}
                {seg(a.unmet, a.total, 'var(--red-600)')}
                {seg(a.na, a.total, 'var(--slate-300)')}
              </div>
            </div>
          ))}

          <div className="dash-note">
            회색은 목표치가 없어 판정하지 않은 지표.{' '}
            <Link href="/swcu" className="text-link">지표 상세</Link>
          </div>
        </>
      )}
    </div>
  );
}
