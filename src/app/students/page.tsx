'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import FadeContent from '@/components/FadeContent';
import { useUrlFilters, filterParams } from '@/lib/use-url-filters';
import { clickKeys } from '@/lib/a11y';
import { GRADES, gradeLabel } from '@/lib/enums';
import type { StudentListRow } from '@/lib/student-shape';

type Resp = { rows: StudentListRow[]; facets: { departments: string[]; majors: string[]; careerGoals: string[] } };
type Filters = { q: string; department: string; major: string; grade: string; status: string; careerGoal: string; counsel: string; contact: string; sort: string };
const EMPTY: Filters = { q: '', department: '', major: '', grade: '', status: '', careerGoal: '', counsel: '', contact: '', sort: '' };

const SORTS: { value: string; label: string }[] = [
  { value: '', label: '최근 수정순' },
  { value: 'created_desc', label: '최근 등록순' },
  { value: 'counsel_asc', label: '상담 적은 순' },
  { value: 'counsel_desc', label: '상담 많은 순' },
  { value: 'name_asc', label: '이름순' },
  // 같은 이름이 여러 줄 보일 때 학번순으로 두면 중복이 나란히 붙는다
  { value: 'no_asc', label: '학번순' },
];

function StudentsPageInner() {
  const router = useRouter();
  // 필터는 URL 쿼리와 동기화한다. 상세로 갔다 돌아와도 조건이 유지된다.
  const { filters, set, applied, apply, reset } = useUrlFilters<Filters>(EMPTY);

  const { data, error, isLoading } = useSWR<Resp>(`/api/students?${filterParams(applied).toString()}`);
  const rows = data?.rows;
  const facets = data?.facets;

  return (
    <>
      <PageHeader title="학생 목록" />

      <form onSubmit={(e) => { e.preventDefault(); apply(); }}>
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
            {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">재학/졸업 전체</option>
            <option value="재학">재학</option>
            <option value="졸업">졸업</option>
          </select>
          <select value={filters.careerGoal} onChange={(e) => set('careerGoal', e.target.value)}>
            <option value="">진로희망 전체</option>
            {(facets?.careerGoals ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          {/* 상담이 주 업무다. 아직 한 번도 안 만난 학생을 뽑는 게 제일 잦다 */}
          <select value={filters.counsel} onChange={(e) => set('counsel', e.target.value)}>
            <option value="">상담 전체</option>
            <option value="없음">상담 없음</option>
            <option value="있음">상담 있음</option>
          </select>
          {/* 신규 등록은 연락처가 필수다. 예전 학생은 비어 있어서 채울 대상을 뽑아 본다 */}
          <select value={filters.contact} onChange={(e) => set('contact', e.target.value)}>
            <option value="">연락처 전체</option>
            <option value="없음">연락처 없음</option>
            <option value="있음">연락처 있음</option>
          </select>
          <select value={filters.sort} onChange={(e) => set('sort', e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input placeholder="이름·학번·연락처·이메일 검색..." value={filters.q} onChange={(e) => set('q', e.target.value)} style={{ flex: '1 1 220px' }} />
          <div className="spacer" />
          <button type="button" className="btn" onClick={reset}>초기화</button>
          {/* 필터는 이미 자동 반영된다. 이 버튼은 디바운스를 건너뛰고 지금 바로 조회하는 용도. */}
          <button className="btn btn-primary" type="submit">검색</button>
          <button type="button" className="btn" onClick={() => router.push('/students/new')}>신규 등록</button>
          <button type="button" className="btn" onClick={() => { window.location.href = `/api/students/export?${filterParams(applied).toString()}`; }}>엑셀 다운로드</button>
        </div>
      </form>

      {rows && (
        <div className="muted" style={{ margin: '16px 2px 0', fontSize: 'calc(13px * var(--fs, 1))' }}>
          검색 결과 <strong style={{ color: 'var(--slate-900)' }}>{rows.length.toLocaleString()}</strong>명
        </div>
      )}
      <FadeContent>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data-table">
          <thead>
            <tr>
              {/* 남는 폭을 진로희망이 다 가져가고 학년은 한 글자 모자라 접혔다.
                  값 길이에 맞춰 나눈다. 학년은 '초과학기' 가 제일 길다 */}
              <th style={{ width: 110 }}>학번</th>
              <th style={{ width: 84 }}>이름</th>
              <th style={{ width: 150 }}>학과</th>
              <th style={{ width: 150 }}>전공</th>
              <th className="center" style={{ width: 96 }}>학년</th>
              <th>진로희망</th>
              <th className="center" style={{ width: 72 }}>상담</th>
              <th style={{ width: 118 }}>최근수정</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !rows ? (
              <tr><td colSpan={8} className="loading">불러오는 중…</td></tr>
            ) : error && !rows ? (
              <tr><td colSpan={8} className="empty">불러오기 실패: {(error as Error).message}</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={8} className="empty">조건에 맞는 학생이 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.studentNo} className="row-click row-appear" style={{ animationDelay: `${Math.min(i, 15) * 0.035}s` }}
                    role="button" tabIndex={0}
                    onClick={() => router.push(`/students/${r.studentNo}`)}
                    onKeyDown={clickKeys(() => router.push(`/students/${r.studentNo}`))}>
                  <td className="nowrap">{r.studentNo}</td>
                  <td>{r.studentName}</td>
                  <td>{r.department || '-'}</td>
                  <td>{r.major || '-'}</td>
                  <td className="center">{gradeLabel(r.grade)}</td>
                  <td>{r.careerGoal || '-'}</td>
                  <td className="center">{r.counselCount}회</td>
                  <td className="nowrap">{r.updatedAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </FadeContent>
      <p className="muted" style={{ marginTop: 10, fontSize: 'calc(12px * var(--fs, 1))' }}>※ 행을 클릭하면 학생 상세에서 전체 정보를 볼 수 있습니다.</p>
    </>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<><PageHeader title="학생 목록" /><div className="loading">불러오는 중…</div></>}>
      <StudentsPageInner />
    </Suspense>
  );
}
