'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import PageHeader from '@/components/PageHeader';
import HistoryDetailModal, { type HistoryDetail } from '@/components/HistoryDetailModal';

type RecentHistory = { id: string; companyName: string; professor: string; contactDate: string; method: string; content: string; histStatus: string };
type Dashboard = {
  totalCount: number;
  internshipCount: number;
  employmentCount: number;
  mouCount: number;
  regionCount: Record<string, number>;
  recentHistories: RecentHistory[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<HistoryDetail | null>(null);

  useEffect(() => {
    api<Dashboard>('/api/dashboard').then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return (<><PageHeader title="시스템 대시보드" /><div className="card empty">불러오기 실패: {err}</div></>);
  if (!data) return (<><PageHeader title="시스템 대시보드" /><div className="loading">불러오는 중…</div></>);

  const stats = [
    { label: '관리중인 총 기업', value: data.totalCount, icon: '🏢', tone: 'indigo' },
    { label: '인턴십 가능 기업', value: data.internshipCount, icon: '🎓', tone: 'blue' },
    { label: '채용연계 가능 기업', value: data.employmentCount, icon: '💼', tone: 'green' },
    { label: 'MOU 체결 완료', value: data.mouCount, icon: '🤝', tone: 'amber' },
  ];

  return (
    <>
      <PageHeader title="시스템 대시보드" />
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-meta">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title"><span className="accent-bar" />시스템 안내</div></div>
        <p style={{ color: 'var(--slate-700)', margin: 0 }}>
          본 시스템은 부산·울산·경남 지역의 AI 관련 기업 정보를 관리하고 인턴십 및 취업 연계 현황을 모니터링하기 위한 플랫폼입니다.
          좌측 메뉴를 통해 기업을 조회하거나 신규 정보를 등록하세요.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          * 팁: 리스트에서 기업명, 실무자명 등을 클릭하면 즉시 상세 정보로 이동합니다.
        </p>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title"><span className="accent-bar" />최근 컨택 이력</div></div>
        {data.recentHistories.length === 0 ? (
          <div className="empty">컨택 이력이 없습니다.</div>
        ) : (
          <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--slate-200)' }}>
            <table className="data-table">
              <thead><tr><th>기업명</th><th>일자</th><th>상태</th><th>내용</th></tr></thead>
              <tbody>
                {data.recentHistories.map((h) => (
                  <tr key={h.id} className="row-click" onClick={() => setSelected({ ...h, personName: null })}>
                    <td style={{ fontWeight: 700 }}>{h.companyName}</td>
                    <td>{h.contactDate}</td>
                    <td><span className={`tag ${h.histStatus === '진행완료' ? 'tag-green' : 'tag-indigo'}`}>{h.histStatus}</span></td>
                    <td className="muted"><span className="ellipsis">{h.content || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HistoryDetailModal history={selected} onClose={() => setSelected(null)} />
    </>
  );
}
