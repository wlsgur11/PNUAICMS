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

      <div style={{ display: 'flex', gap: 14, marginBottom: 11 }}>
        <div>
          <div className="dash-num" style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-600)', lineHeight: 1 }}>{swcu.met}</div>
          <div className="muted" style={{ fontSize: 10 }}>달성</div>
        </div>
        <div>
          <div className="dash-num" style={{ fontSize: 22, fontWeight: 800, color: 'var(--red-600)', lineHeight: 1 }}>{swcu.unmetCount}</div>
          <div className="muted" style={{ fontSize: 10 }}>미달</div>
        </div>
      </div>

      <Link href="/swcu" style={{ textDecoration: 'none' }} title="클릭하면 지표 상세로 이동합니다">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, marginBottom: 11 }}>
          {swcu.cells.map((c, i) => (
            <div key={i} style={{
              height: 17, borderRadius: 2,
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
            <div key={u.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-2)' }}>{u.name}</span>
              <span className="dash-num" style={{ color: 'var(--red-600)', fontWeight: 700 }}>
                {u.actual} / {u.target}{u.unit ?? ''}
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
