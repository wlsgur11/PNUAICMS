'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import type { StudentDetail, ProgramMap } from '@/lib/student-shape';

function ProgramGrid({ title, data }: { title: string; data: ProgramMap }) {
  const entries = ['program1', 'program2', 'program3', 'program4', 'program5'] as (keyof ProgramMap)[];
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 10 }}><span className="accent-bar" />{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
        {entries.map((k, i) => (
          <div key={k} className="tag tag-slate" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span className="muted">사업{i + 1}</span>
            <strong>{data[k] || '-'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentDetailPage({ params }: { params: { studentNo: string } }) {
  const router = useRouter();
  const { data: s, isLoading } = useSWR<StudentDetail>(`/api/students/${params.studentNo}`);

  if (isLoading && !s) return <div className="loading">불러오는 중…</div>;
  if (!s) return <div className="empty">학생을 찾을 수 없습니다.</div>;

  return (
    <>
      <PageHeader
        title={`${s.name || s.nameMasked || s.studentNo} 학생`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => router.push('/students')}>목록</button>
            <button className="btn" onClick={() => { window.location.href = `/api/students/${s.studentNo}/export`; }}>Excel</button>
            <button className="btn btn-primary" onClick={() => router.push(`/students/${s.studentNo}/edit`)}>정보 수정</button>
          </div>
        }
      />

      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}><span className="accent-bar" />기본 정보</div>
        <div className="info-list">
          <div className="info-row"><span className="info-label">학번</span><span className="info-value">{s.studentNo}</span></div>
          <div className="info-row"><span className="info-label">이름</span><span className="info-value">{s.name || '-'}</span></div>
          <div className="info-row"><span className="info-label">학과 · 전공</span><span className="info-value">{s.department || '-'} · {s.major || '-'}</span></div>
          <div className="info-row"><span className="info-label">학년 · 학점</span><span className="info-value">{s.grade ?? '-'}학년 · {s.gpa ?? '-'}</span></div>
          <div className="info-row"><span className="info-label">진로희망</span><span className="info-value">{s.careerGoal || '-'}</span></div>
          <div className="info-row"><span className="info-label">연락처</span><span className="info-value">{s.phone || '-'}</span></div>
          <div className="info-row"><span className="info-label">이메일</span><span className="info-value">{s.email || '-'}</span></div>
          <div className="info-row"><span className="info-label">자격증</span><span className="info-value">{s.certificates.join(', ') || '-'}</span></div>
          <div className="info-row"><span className="info-label">외국어</span><span className="info-value">{s.foreignLanguages.join(', ') || '-'}</span></div>
          <div className="info-row"><span className="info-label">졸업일자</span><span className="info-value">{s.graduationDate || '-'}</span></div>
          <div className="info-row"><span className="info-label">취업기업</span><span className="info-value">
            {s.employmentCompany
              ? (s.employmentCompanyId
                  ? <span className="link" onClick={() => router.push(`/companies/${s.employmentCompanyId}`)}>{s.employmentCompany}</span>
                  : s.employmentCompany)
              : '-'}
          </span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}><span className="accent-bar" />진로지도 상담 <span className="muted" style={{ fontWeight: 400 }}>({s.counselings.length}/5)</span></div>
        {s.counselings.length === 0 ? (
          <div className="empty">등록된 상담 내역이 없습니다. ‘정보 수정’에서 추가할 수 있습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s.counselings.map((c, i) => (
              <div key={c.id || i} className="soft-card" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>상담 {i + 1} · {c.counselDate || '-'} · {c.counselor || '-'}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{c.content || '-'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        <ProgramGrid title="SW중심대학 사업 참여" data={s.swPrograms} />
        <ProgramGrid title="부트캠프 사업 참여" data={s.bootcampPrograms} />
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}><span className="accent-bar" />연결된 산학 프로젝트 ({s.projects.length})</div>
        {s.projects.length === 0 ? <div className="empty">연결된 산학 프로젝트가 없습니다.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th className="center" style={{ width: 56 }}>연도</th><th>과제명</th><th>기간</th><th>지도교수</th><th>기업</th></tr></thead>
              <tbody>
                {s.projects.map((p) => (
                  <tr key={p.id}>
                    <td className="center">{p.year ?? '-'}</td>
                    <td>{p.title || '-'}</td>
                    <td>{p.period || '-'}</td>
                    <td>{p.professorName || '-'}</td>
                    <td>{p.companyId ? <span className="link" onClick={() => router.push(`/companies/${p.companyId}`)}>{p.companyName}</span> : <span className="muted">{p.companyName}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}><span className="accent-bar" />인턴십 이력 ({s.internships.length})</div>
        {s.internships.length === 0 ? <div className="empty">등록된 인턴십이 없습니다. ‘정보 수정’에서 추가할 수 있습니다.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>유형</th><th>기업체명</th><th className="center" style={{ width: 80 }}>기간(주)</th><th style={{ width: 120 }}>연월일</th></tr></thead>
              <tbody>
                {s.internships.map((it) => (
                  <tr key={it.id}>
                    <td>{it.internshipType || '-'}</td>
                    <td>{it.companyId ? <span className="link" onClick={() => router.push(`/companies/${it.companyId}`)}>{it.companyName || '-'}</span> : <span className="muted">{it.companyName || '-'}</span>}</td>
                    <td className="center">{it.durationWeeks ?? '-'}</td>
                    <td>{it.activityDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
