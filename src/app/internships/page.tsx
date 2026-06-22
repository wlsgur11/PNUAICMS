'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';

type Row = {
  id: string;
  year: number | null;
  programName: string | null;
  hostType: string | null;
  method: string | null;
  domestic: string | null;
  weeks: number | null;
  credits: number | null;
  cntCSE: number | null;
  cntDS: number | null;
  cntNonSW: number | null;
  companyId: string | null;
  companyName: string;
};
type Facets = { hostType: string[]; method: string[]; domestic: string[]; years: number[] };
type Resp = { rows: Row[]; facets: Facets };

type Filters = { year: string; host: string; method: string; domestic: string; q: string };
const EMPTY: Filters = { year: '', host: '', method: '', domestic: '', q: '' };

export default function InternshipsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((p) => ({ ...p, [k]: v }));

  const buildParams = (f: Filters) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v.trim()) p.set(k, v.trim());
    return p;
  };
  const { data, isLoading } = useSWR<Resp>(`/api/internships?${buildParams(applied).toString()}`);
  const rows = data?.rows;
  const facets = data?.facets;
  const sum = (key: keyof Row) => (rows ?? []).reduce((a, r) => a + (Number(r[key]) || 0), 0);

  return (
    <>
      <PageHeader title="인턴십 현황" />

      {rows && (
        <div className="filter-bar" style={{ gap: 24, marginBottom: 4 }}>
          <span className="muted">인턴십 <strong>{rows.length}</strong>건</span>
          <span className="muted">교육인원 정컴 <strong>{sum('cntCSE')}</strong> · DS <strong>{sum('cntDS')}</strong> · 비SW <strong>{sum('cntNonSW')}</strong></span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}>
        <div className="filter-bar">
          <select value={filters.year} onChange={(e) => set('year', e.target.value)}>
            <option value="">연도 전체</option>
            {(facets?.years ?? []).map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select value={filters.host} onChange={(e) => set('host', e.target.value)}>
            <option value="">주관 전체</option>
            {(facets?.hostType ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filters.method} onChange={(e) => set('method', e.target.value)}>
            <option value="">교육방식 전체</option>
            {(facets?.method ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filters.domestic} onChange={(e) => set('domestic', e.target.value)}>
            <option value="">국내외 전체</option>
            {(facets?.domestic ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input placeholder="기업·프로그램 검색..." value={filters.q} onChange={(e) => set('q', e.target.value)} />
          <div className="spacer" />
          <button type="button" className="btn" onClick={() => { setFilters(EMPTY); setApplied(EMPTY); }}>초기화</button>
          <button className="btn btn-primary" type="submit">검색</button>
          <button type="button" className="btn" onClick={() => { window.location.href = `/api/internships/export?${buildParams(applied).toString()}`; }}>엑셀 다운로드</button>
        </div>
      </form>

      {rows && (
        <div className="muted" style={{ margin: '16px 2px 0', fontSize: 13 }}>
          검색 결과 <strong style={{ color: 'var(--slate-900)' }}>{rows.length}</strong>건
        </div>
      )}
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="center" style={{ width: 64 }}>연도</th>
              <th>기업</th>
              <th>프로그램</th>
              <th className="center" style={{ width: 96 }}>주관</th>
              <th className="center" style={{ width: 72 }}>교육방식</th>
              <th className="center" style={{ width: 72 }}>기간(주)</th>
              <th className="center" style={{ width: 56 }}>정컴</th>
              <th className="center" style={{ width: 56 }}>DS</th>
              <th className="center" style={{ width: 56 }}>비SW</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !rows ? (
              <tr><td colSpan={9} className="loading">불러오는 중…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={9} className="empty">조건에 맞는 인턴십이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={r.companyId ? 'row-click' : undefined}
                    onClick={r.companyId ? () => router.push(`/companies/${r.companyId}`) : undefined}>
                  <td className="center">{r.year ?? '-'}</td>
                  <td>{r.companyId ? <span className="link">{r.companyName}</span> : <span className="muted">{r.companyName}</span>}</td>
                  <td>{r.programName || '-'}</td>
                  <td className="center">{r.hostType ? <span className="tag tag-indigo">{r.hostType}</span> : '-'}</td>
                  <td className="center">{r.method || '-'}</td>
                  <td className="center">{r.weeks ?? '-'}</td>
                  <td className="center">{r.cntCSE ?? '-'}</td>
                  <td className="center">{r.cntDS ?? '-'}</td>
                  <td className="center">{r.cntNonSW ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>※ CMS에 등록된 기업은 행을 클릭하면 기업 상세로 이동합니다. 회색 기업명은 아직 미등록(이름만 보존)입니다.</p>
    </>
  );
}
