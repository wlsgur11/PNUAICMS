'use client';

import Link from 'next/link';
import type { SwcuSummary } from '@/lib/dashboard-shape';

/**
 * 미달 목록이 이 블록의 핵심이다. "3개 미달"만으로는 하반기에 뭘 밀지 정할 수 없고,
 * "해외 인턴십 3/10" 이 보여야 결정이 된다.
 */
export default function SwcuBlock({ swcu }: { swcu: SwcuSummary }) {
  if (swcu.total === 0) {
    return (
      <div className="card" style={{ padding: 14 }}>
        <div className="dash-eyebrow">SW중심대학 지표</div>
        <div className="dash-question">하반기에 뭘 밀어야 하나?</div>
        <div className="empty" style={{ fontSize: 12 }}>이 연도의 성과지표가 아직 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="dash-eyebrow">SW중심대학 지표</div>
      <div className="dash-question">하반기에 뭘 밀어야 하나?</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
        <span className="dash-num" style={{ fontSize: 34, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{swcu.met}</span>
        <span className="dash-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-3)', lineHeight: 1 }}>/ {swcu.total}</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 2 }}>달성</span>
        <span style={{ flex: 1 }} />
        <span className="dash-num" style={{ fontSize: 20, fontWeight: 800, color: 'var(--red-600)', lineHeight: 1 }}>{swcu.unmetCount}</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>미달</span>
      </div>

      <Link href="/swcu" style={{ textDecoration: 'none' }} title="클릭하면 지표 상세로 이동합니다">
        {/* 지표 하나당 눈금 하나. 개수와 달성 여부만 읽히면 되므로 얇게 둔다. */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
          {swcu.cells.map((c, i) => (
            <div key={i} style={{
              flex: 1, height: 6, borderRadius: 1,
              background: c === 'met' ? 'var(--green-600)' : c === 'unmet' ? 'var(--red-600)' : 'var(--slate-300)',
            }} />
          ))}
        </div>
      </Link>

      <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 9 }}>
        <div className="muted" style={{ fontSize: 10, marginBottom: 6 }}>미달 지표</div>
        {swcu.unmet.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--green-600)', fontWeight: 700 }}>전 지표 달성</div>
        ) : (
          swcu.unmet.map((u) => (
            <div key={u.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.name}</span>
              <span className="dash-num" style={{ fontSize: 14, color: 'var(--red-600)', fontWeight: 800 }}>
                {u.actual}<span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}> / {u.target}{u.unit ?? ''}</span>
              </span>
            </div>
          ))
        )}
        {swcu.unmetCount > swcu.unmet.length && (
          <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
            외 {swcu.unmetCount - swcu.unmet.length}개
          </div>
        )}
      </div>
    </div>
  );
}
