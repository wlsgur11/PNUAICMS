'use client';

import Link from 'next/link';
import type { LabRank } from '@/lib/dashboard-shape';

/**
 * 연구실별 산학 과제 수 상위. 어느 연구실이 산학을 끌고 가는지, 반대로
 * 한두 연구실에 몰려 있는지 본다.
 *
 * 과제 목록에는 연구실 필터가 없어 교수명 검색(q)으로 넘긴다. q 는
 * lab.professorName 을 contains 로 훑으므로 동명이인이 있으면 같이 걸린다.
 */
export default function LabRankCard({ labs }: {
  labs: { top: LabRank[]; labCount: number; unlinked: number };
}) {
  const max = Math.max(1, ...labs.top.map((l) => l.count));

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>연구실별 산학 과제</h2>
        <p>과제 수가 많은 연구실입니다. 이름을 누르시면 해당 교수의 과제 목록으로 이동합니다. 전체 연도 누적 기준입니다.</p>
      </div>

      {labs.top.length === 0 ? (
        <div className="empty" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>연구실이 연결된 과제가 없습니다.</div>
      ) : (
        <>
          {labs.top.map((l) => (
            <Link key={`${l.professor}|${l.lab ?? ''}`} href={`/projects?q=${encodeURIComponent(l.professor)}`} className="dash-list-row">
              <span className="name">
                {l.professor}
                {l.lab && <span style={{ color: 'var(--text-3)', fontSize: 'calc(12px * var(--fs, 1))' }}> · {l.lab}</span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="dash-bar" style={{ '--bar-w': '70px' } as React.CSSProperties}>
                  <span style={{ width: `${(l.count / max) * 100}%` }} />
                </span>
                <span className="num" style={{ minWidth: 26, textAlign: 'right' }}>{l.count}</span>
              </span>
            </Link>
          ))}

          <div className="dash-note">
            과제가 있는 연구실 {labs.labCount}곳
            {labs.unlinked > 0 && <> · 연구실이 연결되지 않은 과제 {labs.unlinked}건</>}
          </div>
        </>
      )}
    </div>
  );
}
