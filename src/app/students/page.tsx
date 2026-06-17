'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import type { StudentListRow } from '@/lib/student-shape';

type Resp = { rows: StudentListRow[]; facets: { departments: string[]; majors: string[] } };
type Filters = { q: string; department: string; major: string; grade: string; status: string };
const EMPTY: Filters = { q: '', department: '', major: '', grade: '', status: '' };

export default function StudentsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((p) => ({ ...p, [k]: v }));

  const buildParams = (f: Filters) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v.trim()) p.set(k, v.trim());
    return p;
  };
  const { data, isLoading } = useSWR<Resp>(`/api/students?${buildParams(applied).toString()}`);
  const rows = data?.rows;
  const facets = data?.facets;

  return (
    <>
      <PageHeader title="학생 목록" />

      <form onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}>
        <div className="filter-bar">
          <select value={filters.department} onChange={(e) => set('department', e.target.value)}>
            <option value="">학과 전체</option>
            {(facets?.departments ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filters.major} onChange={(e) => set('major', e.target.value)}>
            <option value="">전공 전체</option>
            {(facets?.majors ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filters.grade} onChange={(e) => set('grade', e.target.value)}>
            <option value="">학년 전체</option>
            {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">재학/졸업 전체</option>
            <option value="재학">재학</option>
            <option value="졸업">졸업</option>
          </select>
          <input placeholder="이름·학번·연락처 검색..." value={filters.q} onChange={(e) => set('q', e.target.value)} style={{ flex: '1 1 220px' }} />
          <div className="spacer" />
          <button type="button" className="btn" onClick={() => { setFilters(EMPTY); setApplied(EMPTY); }}>초기화</button>
          <button className="btn btn-primary" type="submit">검색</button>
          <button type="button" className="btn" onClick={() => router.push('/students/new')}>신규 등록</button>
          <button type="button" className="btn" onClick={() => { window.location.href = `/api/students/export?${buildParams(applied).toString()}`; }}>엑셀 다운로드</button>
        </div>
      </form>

      {rows && (
        <div className="muted" style={{ margin: '16px 2px 0', fontSize: 13 }}>
          검색 결과 <strong style={{ color: 'var(--slate-900)' }}>{rows.length}</strong>명
        </div>
      )}
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>학번</th>
              <th style={{ width: 90 }}>이름</th>
              <th>학과</th>
              <th>전공</th>
              <th className="center" style={{ width: 60 }}>학년</th>
              <th>진로희망</th>
              <th className="center" style={{ width: 80 }}>상담</th>
              <th style={{ width: 110 }}>최근수정</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !rows ? (
              <tr><td colSpan={8} className="loading">불러오는 중…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={8} className="empty">조건에 맞는 학생이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.studentNo} className="row-click" onClick={() => router.push(`/students/${r.studentNo}`)}>
                  <td>{r.studentNo}</td>
                  <td>{r.nameMasked}</td>
                  <td>{r.department || '-'}</td>
                  <td>{r.major || '-'}</td>
                  <td className="center">{r.grade ?? '-'}</td>
                  <td>{r.careerGoal || '-'}</td>
                  <td className="center">{r.counselCount}회</td>
                  <td>{r.updatedAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>※ 이름은 마스킹 표시되며, 행을 클릭하면 학생 상세에서 실명과 전체 정보를 볼 수 있습니다.</p>
    </>
  );
}
