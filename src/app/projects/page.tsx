'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import CountUp from '@/components/CountUp';
import FadeContent from '@/components/FadeContent';

type Row = {
  id: string;
  year: number | null;
  dept: string | null;
  category: string | null;
  type: string | null;
  title: string | null;
  period: string | null;
  track: string | null;
  professorName: string | null;
  labName: string | null;
  companyId: string | null;
  companyName: string;
  students: string[];
};

type Facets = { type: string[]; track: string[]; years: number[] };
type Resp = { rows: Row[]; facets: Facets };

type Filters = { year: string; dept: string; category: string; type: string; track: string; q: string };
const EMPTY: Filters = { year: '', dept: '', category: '', type: '', track: '', q: '' };

export default function ProjectsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((p) => ({ ...p, [k]: v }));

  const [selected, setSelected] = useState<Row | null>(null);

  const buildParams = (f: Filters) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v.trim()) p.set(k, v.trim());
    return p;
  };
  const { data, isLoading } = useSWR<Resp>(`/api/projects?${buildParams(applied).toString()}`);
  const rows = data?.rows;
  const facets = data?.facets;

  return (
    <>
      <PageHeader title="산학협력 현황" />

      {rows && (
        <div className="filter-bar" style={{ gap: 24, marginBottom: 4 }}>
          <span className="muted">프로젝트 <strong><CountUp end={rows.length} /></strong>건</span>
          <span className="muted">참여기업 연결 <strong><CountUp end={rows.filter((r) => r.companyId).length} /></strong>건</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}>
        <div className="filter-bar">
          <select value={filters.year} onChange={(e) => set('year', e.target.value)}>
            <option value="">연도 전체</option>
            {(facets?.years ?? []).map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select value={filters.dept} onChange={(e) => set('dept', e.target.value)}>
            <option value="">학과 전체</option>
            <option value="정컴">정컴</option>
            <option value="DS">DS</option>
          </select>
          <select value={filters.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">구분 전체</option>
            <option value="학과졸업과제">학과졸업과제</option>
            <option value="교육원연계">교육원연계</option>
          </select>
          <select value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">유형 전체</option>
            {(facets?.type ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filters.track} onChange={(e) => set('track', e.target.value)}>
            <option value="">트랙 전체</option>
            {(facets?.track ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input placeholder="기업·교수·연구주제 검색..." value={filters.q} onChange={(e) => set('q', e.target.value)} style={{ flex: '1 1 220px' }} />
          <div className="spacer" />
          <button type="button" className="btn" onClick={() => { setFilters(EMPTY); setApplied(EMPTY); }}>초기화</button>
          <button className="btn btn-primary" type="submit">검색</button>
          <button type="button" className="btn" onClick={() => { window.location.href = `/api/projects/export?${buildParams(applied).toString()}`; }}>엑셀 다운로드</button>
        </div>
      </form>

      {rows && (
        <div className="muted" style={{ margin: '16px 2px 0', fontSize: 13 }}>
          검색 결과 <strong style={{ color: 'var(--slate-900)' }}><CountUp end={rows.length} /></strong>건
        </div>
      )}
      <FadeContent>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="center" style={{ width: 56 }}>연도</th>
              <th style={{ width: 96 }}>구분</th>
              <th className="center" style={{ width: 85 }}>학과</th>
              <th>지도교수 · 연구실</th>
              <th>연구주제</th>
              <th>참여기업</th>
              <th>참여학생</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !rows ? (
              <tr><td colSpan={7} className="loading">불러오는 중…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={7} className="empty">조건에 맞는 프로젝트가 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="row-click row-appear" style={{ animationDelay: `${Math.min(i, 15) * 0.035}s` }} onClick={() => setSelected(r)}>
                  <td className="center">{r.year ?? '-'}</td>
                  <td>{r.category || '-'}</td>
                  <td className="center" style={{ whiteSpace: 'nowrap' }}>{r.dept || '-'}</td>
                  <td>
                    {r.professorName || '-'}
                    {r.labName ? <><br /><span className="muted" style={{ fontSize: 12 }}>{r.labName}</span></> : null}
                  </td>
                  <td><span className="ellipsis" style={{ maxWidth: 280 }}>{r.title || '-'}</span></td>
                  <td>
                    {r.companyId
                      ? <span className="link" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); router.push(`/companies/${r.companyId}`); }}>{r.companyName}</span>
                      : <span className="muted">{r.companyName}</span>}
                  </td>
                  <td><span className="ellipsis" style={{ maxWidth: 180 }}>{r.students.length ? r.students.join(', ') : '-'}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </FadeContent>
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>※ 행을 클릭하면 프로젝트 상세를 볼 수 있습니다. 참여학생 이름은 마스킹 표시됩니다.</p>

      {selected && (
        <div className="modal-root">
          <div className="modal-backdrop" onClick={() => setSelected(null)} />
          <div className="modal-card">
            <h3 className="modal-title">{selected.title || '프로젝트 상세'}</h3>
            <div className="info-list">
              <div className="info-row"><span className="info-label">연도</span><span className="info-value">{selected.year ?? '-'}</span></div>
              <div className="info-row"><span className="info-label">구분</span><span className="info-value">{selected.category || '-'}{selected.dept ? ` · ${selected.dept}` : ''}</span></div>
              <div className="info-row"><span className="info-label">유형</span><span className="info-value">{selected.type || '-'}</span></div>
              <div className="info-row"><span className="info-label">연구기간</span><span className="info-value">{selected.period || '-'}</span></div>
              <div className="info-row"><span className="info-label">특성화트랙</span><span className="info-value">{selected.track || '-'}</span></div>
              <div className="info-row"><span className="info-label">지도교수</span><span className="info-value">{selected.professorName || '-'}</span></div>
              <div className="info-row"><span className="info-label">연구실</span><span className="info-value">{selected.labName || '-'}</span></div>
              <div className="info-row"><span className="info-label">참여기업</span><span className="info-value">
                {selected.companyId
                  ? <span className="link" style={{ cursor: 'pointer' }} onClick={() => router.push(`/companies/${selected.companyId}`)}>{selected.companyName}</span>
                  : selected.companyName}
              </span></div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="info-label" style={{ marginBottom: 6 }}>참여학생 ({selected.students.length}명)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selected.students.length
                  ? selected.students.map((s, i) => <span key={i} className="tag tag-indigo">{s}</span>)
                  : <span className="muted">기록 없음</span>}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => setSelected(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
