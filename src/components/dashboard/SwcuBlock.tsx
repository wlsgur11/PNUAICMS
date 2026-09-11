'use client';

import Link from 'next/link';
import type { SwcuSummary } from '@/lib/dashboard-shape';

/**
 * 미달 지표의 이름과 수치를 직접 나열하는 것이 이 카드의 핵심이다.
 * "3개 미달" 만으로는 하반기에 뭘 밀지 정할 수 없고, "해외 인턴십 3/10" 이 보여야 결정이 된다.
 */
export default function SwcuBlock({ swcu }: { swcu: SwcuSummary }) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>SW중심대학 성과지표</h2>
        <p>하반기에 무엇을 밀어야 하는지 판단한다. 목표에 못 미친 지표를 부족분이 큰 순으로 보여준다</p>
      </div>

      {swcu.total === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>이 연도의 성과지표가 아직 없습니다.</div>
      ) : (
        <>
          <div className="dash-metrics" style={{ marginBottom: 20 }}>
            <div>
              <div className="dash-metric-label">달성</div>
              <div className="dash-metric-value met">{swcu.met}<span style={{ fontSize: 15, color: 'var(--text-3)' }}> / {swcu.total}</span></div>
            </div>
            <div>
              <div className="dash-metric-label">미달</div>
              <div className="dash-metric-value" style={{ color: swcu.unmetCount > 0 ? 'var(--red-600)' : 'var(--text-1)' }}>{swcu.unmetCount}</div>
            </div>
          </div>

          <div className="dash-metric-label" style={{ marginBottom: 2 }}>미달 지표</div>
          {swcu.unmet.length === 0 ? (
            <div className="dash-note" style={{ color: 'var(--green-600)', marginTop: 8 }}>전 지표 달성</div>
          ) : (
            swcu.unmet.map((u) => (
              <div key={u.name} className="dash-list-row">
                <span className="name">{u.name}</span>
                <span className="num" style={{ color: 'var(--red-600)' }}>
                  {u.actual}<span style={{ fontSize: 12, color: 'var(--text-3)' }}> / {u.target}{u.unit ?? ''}</span>
                </span>
              </div>
            ))
          )}

          <div className="dash-note">
            {swcu.unmetCount > swcu.unmet.length && <>외 {swcu.unmetCount - swcu.unmet.length}개 </>}
            <Link href="/swcu" className="text-link">지표 상세와 산출근거</Link>
          </div>
        </>
      )}
    </div>
  );
}
