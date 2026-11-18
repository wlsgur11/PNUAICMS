'use client';

import Link from 'next/link';
import type { SwcuArea } from '@/lib/dashboard-shape';

/**
 * 지표 17개를 영역으로 묶은 달성 현황. 미달 지표 목록(SwcuBlock)이 '무엇을' 이라면
 * 이쪽은 '어디가' 에 답한다. 미달이 한 영역에 몰려 있는지, 여러 영역에 퍼져 있는지가
 * 하반기 배분을 정한다.
 */
export default function SwcuAreaCard({ areas, year }: { areas: SwcuArea[]; year: number }) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>SW중심대학 영역별</h2>
        <p>{year}년 지표를 영역별로 묶은 달성 현황입니다. 미달 지표가 많은 영역을 위에 표시합니다.</p>
      </div>

      {areas.length === 0 ? (
        <div className="empty" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>
          {year}년 성과지표가 아직 등록되지 않았습니다. 위쪽 연도 버튼에서 다른 연도를 선택하세요.
        </div>
      ) : (
        <>
          {areas.map((a) => (
            <div key={a.area} className="area-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 7 }}>
                <span style={{ fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--text-2)' }}>{a.area}</span>
                <span className="dash-num" style={{ fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--text-2)' }}>
                  <b style={{ color: 'var(--text-1)', fontWeight: 600 }}>{a.met}</b>/{a.total}개 달성
                  {a.unmet > 0 && <span style={{ color: 'var(--red-600)' }}> · 미달 {a.unmet}</span>}
                  {a.na > 0 && <span style={{ color: 'var(--text-3)' }}> · 판정 없음 {a.na}</span>}
                </span>
              </div>
              <div className="split-bar">
                {a.met > 0 && <span className="met" style={{ flex: a.met }} />}
                {a.unmet > 0 && <span className="unmet" style={{ flex: a.unmet }} />}
                {a.na > 0 && <span className="na" style={{ flex: a.na }} />}
              </div>
            </div>
          ))}

          <div className="dash-note">
            '판정 없음' 은 목표치가 없어 달성 여부를 가리지 않은 지표입니다.{' '}
            <Link href="/swcu" className="text-link">지표 상세</Link>
          </div>
        </>
      )}
    </div>
  );
}
