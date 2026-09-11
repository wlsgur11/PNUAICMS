'use client';

import { useState } from 'react';
import HistoryDetailModal, { type HistoryDetail } from '@/components/HistoryDetailModal';
import { clickKeys } from '@/lib/a11y';
import type { DashboardData } from '@/lib/dashboard-shape';

type Row = DashboardData['recentHistories'][number];

/** 최근 컨택 5건. 행을 누르면 전체 내용을 모달로 본다 */
export default function RecentContactsBlock({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<HistoryDetail | null>(null);

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>최근 컨택 이력</h2>
        <p>가장 최근 기록 5건. 행을 누르면 전체 내용이 열린다</p>
      </div>

      {rows.length === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>컨택 이력이 없습니다.</div>
      ) : (
        <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
          <table className="data-table">
            <thead><tr><th>기업명</th><th>일자</th><th>상태</th><th>내용</th></tr></thead>
            <tbody>
              {rows.map((h) => {
                const open = () => setSelected({ ...h, personName: null });
                return (
                  <tr key={h.id} className="row-click" role="button" tabIndex={0}
                      onClick={open} onKeyDown={clickKeys(open)}>
                    <td style={{ fontWeight: 500 }}>{h.companyName}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{h.contactDate}</td>
                    <td><span className={`tag ${h.histStatus === '진행완료' ? 'tag-green' : 'tag-indigo'}`}>{h.histStatus}</span></td>
                    <td className="muted"><span className="ellipsis">{h.content || '-'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <HistoryDetailModal history={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
