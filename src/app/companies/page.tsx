'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import FadeContent from '@/components/FadeContent';
import { ENUMS, COLLAB_FIELDS } from '@/lib/enums';
import { useUrlFilters, filterParams } from '@/lib/use-url-filters';
import { clickKeys } from '@/lib/a11y';

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

// 상세 조건. 처음에는 접어 둔다. 전부 펼쳐 두면 1280 노트북에서 필터가 295px 을 차지해
// 첫 화면에 기업이 5줄만 보였다. 자주 쓰는 검색, 우선순위, 진행상태, 정렬만 밖에 둔다
const ADVANCED = [
  'region', 'business', 'aiField', 'mou', 'includeInactive', ...COLLAB_FIELDS.map((c) => c.key),
] as (keyof Filters)[];

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

function CompaniesInner() {
  const router = useRouter();
  // 필터는 URL 쿼리와 동기화한다. 상세로 갔다 돌아와도(뒤로가기/목록 링크) 조건이 유지되고,
  // 대시보드 카드처럼 조건을 붙여 들어오는 진입도 그대로 반영된다.
  // 사용자가 '검색'을 눌러 확정한 applied 만 SWR 키에 반영 → 입력 중에는 재조회 안 함.
  const { filters, set, applied, apply, reset } = useUrlFilters<Filters>(EMPTY_FILTERS);
  // 접혀 있어도 걸린 조건 수는 버튼에 보인다. 결과가 왜 줄었는지 모르는 일이 없게.
  // 직접 열거나 닫기 전까지는 조건이 걸려 있으면 펼친다(대시보드에서 조건을 붙여 들어올 때)
  const activeCount = ADVANCED.filter((k) => !!filters[k]).length;
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open ?? activeCount > 0;

  const swrKey = `/api/companies?${filterParams(applied).toString()}`;
  const { data: rows, error, isLoading } = useSWR<Row[]>(swrKey);

  return (
    <>
      <PageHeader title="협력 기업 리스트" />

      <form onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <div className="filter-bar">
          <input
            placeholder="기업명 검색..."
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
          />
          <select value={filters.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">우선순위 전체</option>
            {ENUMS.PRIORITY.map((p) => <option key={p} value={p}>{p} 등급</option>)}
          </select>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">진행상태 전체</option>
            {ENUMS.STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.sort} onChange={(e) => set('sort', e.target.value)} title="정렬 기준">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            type="button"
            className="btn"
            aria-expanded={expanded}
            aria-controls="company-filters-more"
            onClick={() => setOpen(!expanded)}
          >
            상세 조건{activeCount > 0 ? ` ${activeCount}개` : ''} {expanded ? '▴' : '▾'}
          </button>
          <div className="spacer" />
          <button type="button" className="btn" onClick={reset}>초기화</button>
          {/* 필터는 이미 자동 반영된다. 이 버튼은 디바운스를 건너뛰고 지금 바로 조회하는 용도. */}
          <button className="btn btn-primary" type="submit">검색</button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const params = filterParams(filters).toString();
              window.location.href = `/api/companies/export${params ? `?${params}` : ''}`;
            }}
            title="현재 검색 조건의 결과를 엑셀(.xlsx)로 내려받습니다."
          >
            엑셀 다운로드
          </button>
          <Link className="btn" href="/companies/new">＋ 신규 등록</Link>
        </div>

        <div id="company-filters-more" hidden={!expanded}>
          <div className="filter-bar" style={{ marginTop: 12 }}>
            <select value={filters.region} onChange={(e) => set('region', e.target.value)}>
              <option value="">지역 전체</option>
              {ENUMS.REGION.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filters.business} onChange={(e) => set('business', e.target.value)} title="관심사업분야(사업단) - 컨택이력 기준">
              <option value="">관심사업분야 전체</option>
              {ENUMS.BUSINESS.map((b) => <option key={b} value={b}>{b}</option>)}
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
          </div>
          {/* 협력 항목 체크박스 (선택한 모든 항목을 만족하는 기업만) */}
          <div className="filter-bar" style={{ marginTop: 12 }}>
            <span className="muted" style={{ fontSize: 'calc(13px * var(--fs, 1))', fontWeight: 600 }}>협력 항목:</span>
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
            <span className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))' }}>※ 선택한 항목을 모두 만족하는 기업만 표시</span>
          </div>
        </div>
      </form>

      {rows && (
        <div className="muted" style={{ margin: '16px 2px 0', fontSize: 'calc(13px * var(--fs, 1))' }}>
          검색 결과 <strong style={{ color: 'var(--slate-900)' }}>{rows.length.toLocaleString()}</strong>건
        </div>
      )}
      <FadeContent>
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
            ) : error && !rows ? (
              <tr><td colSpan={7} className="empty">불러오기 실패: {(error as Error).message}</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={7} className="empty">조건에 맞는 기업이 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id}
                    className={`row-click${r.isActive === false ? '' : ' row-appear'}`}
                    role="button" tabIndex={0}
                    onClick={() => router.push(`/companies/${r.id}`)}
                    onKeyDown={clickKeys(() => router.push(`/companies/${r.id}`))}
                    style={r.isActive === false ? { opacity: 0.5 } : { animationDelay: `${Math.min(i, 15) * 0.035}s` }}>
                  <td>
                    <span className="link">{r.name}</span>
                    {r.isActive === false && <span className="muted" style={{ marginLeft: 6, fontSize: 'calc(12px * var(--fs, 1))' }}>(비활성)</span>}
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
      </FadeContent>
    </>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<><PageHeader title="협력 기업 리스트" /><div className="loading">불러오는 중…</div></>}>
      <CompaniesInner />
    </Suspense>
  );
}
