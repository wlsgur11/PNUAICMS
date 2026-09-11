'use client';

import Link from 'next/link';
import type { SwcuSummary } from '@/lib/dashboard-shape';

/**
 * 미달 지표의 이름과 수치를 직접 나열하는 것이 이 카드의 핵심이다.
 * "3개 미달" 만으로는 하반기에 뭘 밀지 정할 수 없고, "해외 인턴십 3/10" 이 보여야 결정이 된다.
 */
export default function SwcuBlock({ swcu, year }: { swcu: SwcuSummary; year: number }) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>SW중심대학 성과지표</h2>
        <p>목표에 못 미친 지표를 부족분이 큰 순서로 보여 드립니다.</p>
      </div>

      {swcu.total === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>
          {year}년 성과지표가 아직 등록되지 않았습니다. 위쪽 연도 버튼에서 다른 연도를 선택하세요.
        </div>
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
            <div className="dash-note" style={{ color: 'var(--green-600)', marginTop: 8 }}>모든 지표를 달성했습니다.</div>
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
