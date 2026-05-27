'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import PageHeader from '@/components/PageHeader';
import { ENUMS } from '@/lib/enums';

type Row = {
  id: string; code: string; name: string; professor: string; region: string;
  mou: boolean; internship: boolean; employment: boolean;
  lastMeeting: string; priority: string; status: string;
};

export default function CompaniesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [priority, setPriority] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (region) params.set('region', region);
    if (priority) params.set('priority', priority);
    try {
      setRows(await api<Row[]>(`/api/companies?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }, [q, region, priority]);

  useEffect(() => { load(); /* 최초 1회 */ /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <>
      <PageHeader title="협력 기업 리스트" />

      <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input placeholder="기업명 검색..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">지역 전체</option>
          {ENUMS.REGION.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">우선순위 전체</option>
          {ENUMS.PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn btn-primary" type="submit">🔍 검색</button>
        <Link className="btn" href="/companies/new">＋ 신규 등록</Link>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>기업명</th><th>담당교수</th><th className="center">MOU</th>
              <th className="center">인턴십</th><th className="center">채용연계</th>
              <th>최근 미팅일</th><th className="center">우선순위</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">불러오는 중…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="empty">조건에 맞는 기업이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/companies/${r.id}`)}>
                  <td><span className="link">{r.name}</span></td>
                  <td>{r.professor || '-'}</td>
                  <td className="center">
                    <span className={`badge ${r.mou ? 'badge-mou-yes' : 'badge-mou-no'}`}>{r.mou ? '체결' : '미체결'}</span>
                  </td>
                  <td className="center">{r.internship ? <span className="check-yes">✔</span> : <span className="check-no">–</span>}</td>
                  <td className="center">{r.employment ? <span className="check-yes">✔</span> : <span className="check-no">–</span>}</td>
                  <td>{r.lastMeeting || '-'}</td>
                  <td className="center">{r.priority ? <span className={`badge badge-${r.priority}`}>{r.priority}</span> : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
