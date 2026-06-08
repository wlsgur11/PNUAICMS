'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import { ENUMS, COLLAB_FIELDS } from '@/lib/enums';

type Row = {
  id: string; code: string; name: string; professor: string; region: string;
  mou: boolean; internship: boolean; employment: boolean;
  lastMeeting: string; priority: string; status: string;
  isActive: boolean;
};

type Filters = {
  q: string; region: string; priority: string; status: string; aiField: string;
  business: string;
  sort: string;
  mou: boolean; includeInactive: boolean;
  internship: boolean; industryProject: boolean; curriculumCommittee: boolean;
  guestLecture: boolean; employment: boolean; overseasEducation: boolean;
  valueSpread: boolean; fieldTrainingOrg: boolean;
};
const EMPTY_FILTERS: Filters = {
  q: '', region: '', priority: '', status: '', aiField: '',
  business: '',
  sort: 'name_asc',
  mou: false, includeInactive: false,
  internship: false, industryProject: false, curriculumCommittee: false,
  guestLecture: false, employment: false, overseasEducation: false,
  valueSpread: false, fieldTrainingOrg: false,
};

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name_asc', label: '기관명 (가나다순)' },
  { value: 'name_desc', label: '기관명 (역순)' },
  { value: 'year_desc', label: '사업참여연도 (최신순)' },
  { value: 'year_asc', label: '사업참여연도 (오래된순)' },
  { value: 'meeting_desc', label: '최근 미팅일 (최신순)' },
  { value: 'priority_asc', label: '우선순위 (A→C)' },
  { value: 'status_asc', label: '진행상태순' },
  { value: 'updated_desc', label: '최근 수정순' },
];

export default function CompaniesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // 사용자가 '검색'을 눌러 적용한 필터만 SWR 키에 반영 → 입력 중에는 재조회 안 함
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  function set<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters((p) => ({ ...p, [k]: v }));
  }

  const buildParams = (f: Filters) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (v === true) params.set(k, '1');
      else if (typeof v === 'string' && v.trim()) params.set(k, v.trim());
    }
    return params;
  };

  const swrKey = `/api/companies?${buildParams(applied).toString()}`;
  const { data: rows, isLoading } = useSWR<Row[]>(swrKey);

  function reset() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  return (
    <>
      <PageHeader title="협력 기업 리스트" />

      <form onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}>
        {/* 1행: 텍스트·드롭다운·MOU·버튼 */}
        <div className="filter-bar">
          <input
            placeholder="기업명 검색..."
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
          />
          <select value={filters.region} onChange={(e) => set('region', e.target.value)}>
            <option value="">지역 전체</option>
            {ENUMS.REGION.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">우선순위 전체</option>
            {ENUMS.PRIORITY.map((p) => <option key={p} value={p}>{p} 등급</option>)}
          </select>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">진행상태 전체</option>
            {ENUMS.STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.business} onChange={(e) => set('business', e.target.value)} title="관심사업분야(사업단) - 컨택이력 기준">
            <option value="">관심사업분야 전체</option>
            {ENUMS.BUSINESS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filters.sort} onChange={(e) => set('sort', e.target.value)} title="정렬 기준">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            placeholder="AI 기술분야 (예: 비전, NLP)"
            value={filters.aiField}
            onChange={(e) => set('aiField', e.target.value)}
            style={{ minWidth: 160, flex: '0 1 220px' }}
          />
          <label className="collab-toggle" style={{ marginLeft: 4 }}>
            <input type="checkbox" checked={filters.mou} onChange={(e) => set('mou', e.target.checked)} />
            MOU 체결
          </label>
          <label className="collab-toggle">
            <input type="checkbox" checked={filters.includeInactive} onChange={(e) => set('includeInactive', e.target.checked)} />
            비활성 포함
          </label>
          <div className="spacer" />
          <button type="button" className="btn" onClick={reset}>초기화</button>
          <button className="btn btn-primary" type="submit">검색</button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const params = buildParams(filters).toString();
              window.location.href = `/api/companies/export${params ? `?${params}` : ''}`;
            }}
            title="현재 검색 조건의 결과를 엑셀(.xlsx)로 내려받습니다."
          >
            엑셀 다운로드
          </button>
          <Link className="btn" href="/companies/new">＋ 신규 등록</Link>
        </div>

        {/* 2행: 협력 항목 체크박스 (선택한 모든 항목을 만족하는 기업만) */}
        <div className="filter-bar" style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>협력 항목:</span>
          {COLLAB_FIELDS.map((cf) => (
            <label key={cf.key} className="collab-toggle">
              <input
                type="checkbox"
                checked={!!filters[cf.key as keyof Filters]}
                onChange={(e) => set(cf.key as keyof Filters, e.target.checked as Filters[keyof Filters])}
              />
              {cf.label}
            </label>
          ))}
          <span className="muted" style={{ fontSize: 12 }}>※ 선택한 항목을 모두 만족하는 기업만 표시</span>
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
              <th>기업명</th><th>담당교수</th><th className="center">MOU</th>
              <th className="center">인턴십</th><th className="center">채용연계</th>
              <th>최근 미팅일</th><th className="center">우선순위</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !rows ? (
              <tr><td colSpan={7} className="loading">불러오는 중…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={7} className="empty">조건에 맞는 기업이 없습니다.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="row-click" onClick={() => router.push(`/companies/${r.id}`)}
                    style={r.isActive === false ? { opacity: 0.5 } : undefined}>
                  <td>
                    <span className="link">{r.name}</span>
                    {r.isActive === false && <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>(비활성)</span>}
                  </td>
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
