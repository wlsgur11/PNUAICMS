'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import PageHeader from '@/components/PageHeader';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import { clickKeys } from '@/lib/a11y';
import { ENUMS } from '@/lib/enums';
import type { StudentDetail, CounselingItem } from '@/lib/student-shape';

type ProjectDetail = {
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
  students: { studentNo: string | null; studentName: string }[];
};

function ProgramGrid({ title, data }: { title: string; data: string[] }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 10 }}><span className="accent-bar" />{title} <span className="muted" style={{ fontWeight: 400 }}>({data.length}건)</span></div>
      {data.length === 0
        ? <div className="empty" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>참여한 사업이 없습니다.</div>
        : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.map((v, i) => <span key={i} className="tag tag-slate">{v}</span>)}
          </div>
        )}
    </div>
  );
}

/**
 * 진로지도 상담. 이 시스템의 주 업무라 여기서 바로 넣고 고친다.
 *
 * 전에는 학생 정보 수정 폼 안에서만 다룰 수 있었다. 상담 한 줄 적으려고 학생 정보를
 * 통째로 여는 것도 번거로웠지만, 저장이 '그 학생 상담을 다 지우고 다시 넣기' 라서
 * 두 사람이 같은 학생을 열어 두면 나중에 저장한 쪽이 앞사람 상담을 지웠다.
 * 기업 컨택 이력과 같이 한 건씩 다룬다. 건수 상한도 없앴다.
 *
 * 모달 대신 카드 안에서 바로 편집한다. 상담은 자주 넣는 값이라 창이 뜨고 닫히는
 * 단계가 없는 편이 빠르다.
 */
function CounselingCard({ studentNo, rows, onChanged }: {
  studentNo: string; rows: Required<CounselingItem>[]; onChanged: () => void;
}) {
  // null 이면 편집 중이 아니고, 'new' 면 새 상담, 그 외에는 고치고 있는 상담의 id
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ type: ENUMS.COUNSEL_TYPE[0] as string, counselDate: '', counselor: '', content: '' });
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    // 상담은 보통 그날 적는다. 오늘 날짜를 넣어 두면 손이 한 번 덜 간다
    setForm({ type: ENUMS.COUNSEL_TYPE[0], counselDate: new Date().toISOString().slice(0, 10), counselor: '', content: '' });
    setEditing('new');
  };
  const openEdit = (c: Required<CounselingItem>) => {
    setForm({ type: c.type || ENUMS.COUNSEL_TYPE[0], counselDate: c.counselDate || '', counselor: c.counselor || '', content: c.content || '' });
    setEditing(c.id);
  };

  async function save() {
    if (!form.counselDate) { toast('상담일자를 입력하세요.', 'error'); return; }
    setSaving(true);
    try {
      if (editing === 'new') {
        await api(`/api/students/${studentNo}/counselings`, { method: 'POST', body: JSON.stringify(form) });
      } else {
        await api(`/api/counselings/${editing}`, { method: 'PUT', body: JSON.stringify(form) });
      }
      toast('저장되었습니다.', 'success');
      setEditing(null);
      onChanged();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  }

  async function remove(c: Required<CounselingItem>) {
    if (!confirm(`${c.counselDate || ''} 상담 기록을 삭제할까요? (복구할 수 없습니다)`)) return;
    try {
      await api(`/api/counselings/${c.id}`, { method: 'DELETE' });
      toast('삭제되었습니다.', 'success');
      if (editing === c.id) setEditing(null);
      onChanged();
    } catch (e) { toast((e as Error).message, 'error'); }
  }

  const editor = (
    <div className="soft-card" style={{ padding: 12 }}>
      <div className="form-grid">
        <div className="form-field">
          <label>상담 유형</label>
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            {ENUMS.COUNSEL_TYPE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>상담일자<span className="req">*</span></label>
          <input type="date" value={form.counselDate} onChange={(e) => setForm((p) => ({ ...p, counselDate: e.target.value }))} />
        </div>
        <div className="form-field">
          <label>상담자</label>
          <input value={form.counselor} onChange={(e) => setForm((p) => ({ ...p, counselor: e.target.value }))} placeholder="예: 김교수" />
        </div>
        <div className="form-field full">
          <label>상담내역</label>
          <textarea rows={4} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setEditing(null)} disabled={saving}>취소</button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><span className="accent-bar" />진로지도 상담 <span className="muted" style={{ fontWeight: 400 }}>({rows.length}건)</span></div>
        {editing !== 'new' && <button type="button" className="btn btn-sm" onClick={openNew}>＋ 상담 추가</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {editing === 'new' && editor}

        {rows.length === 0 && editing !== 'new' && (
          <div className="empty">등록된 상담 내역이 없습니다. ‘＋ 상담 추가’로 입력하세요.</div>
        )}

        {rows.map((c) => (
          editing === c.id ? <div key={c.id}>{editor}</div> : (
            <div key={c.id} className="soft-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 'calc(12px * var(--fs, 1))', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* 창업 상담은 진로 상담과 성격이 달라 한눈에 갈려야 한다 */}
                  <span className={`tag ${c.type === '창업상담' ? 'tag-amber' : 'tag-indigo'}`}>{c.type || '진로상담'}</span>
                  <span className="muted">{c.counselDate || '-'} · {c.counselor || '상담자 미기재'}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button type="button" className="text-link" onClick={() => openEdit(c)}>수정</button>
                  <button type="button" className="text-link danger-text" onClick={() => remove(c)}>삭제</button>
                </div>
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.content || '-'}</div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

export default function StudentDetailPage({ params }: { params: { studentNo: string } }) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: s, isLoading, mutate: reload } = useSWR<StudentDetail>(`/api/students/${params.studentNo}`);
  const { data: projectDetail } = useSWR<ProjectDetail>(
    selectedProjectId ? `/api/projects/${selectedProjectId}` : null
  );

  if (isLoading && !s) return <div className="loading">불러오는 중…</div>;
  if (!s) return <div className="empty">학생을 찾을 수 없습니다.</div>;

  /**
   * 학번이 기본키라 잘못 넣은 학번은 고칠 수가 없다. 임의 학번으로 만든 학생은
   * 지우는 것이 유일한 정리 방법이다. 무엇이 함께 사라지는지 먼저 세어서 보여 준다.
   */
  async function remove() {
    if (!s) return;
    const lost = [
      s.counselings.length && `상담 ${s.counselings.length}건`,
      s.internships.length && `인턴십 ${s.internships.length}건`,
    ].filter(Boolean).join(', ');
    const who = `${s.name || ''}(${s.studentNo})`;
    if (!confirm(
      `"${who}" 학생을 삭제할까요?\n\n`
      + (lost ? `${lost}도 함께 지워지며 되살릴 수 없습니다.\n` : '')
      + (s.projects.length ? `산학 실적 연결 ${s.projects.length}건은 실적 엑셀을 다시 올리면 돌아옵니다.\n` : '')
      + '\n다른 학번으로 같은 학생이 또 있다면, 옮길 내용을 먼저 그쪽에 적어 두세요.',
    )) return;
    if (!confirm(`마지막 확인 - "${who}" 을(를) 영구 삭제합니다.\n정말 진행할까요?`)) return;
    try {
      await api(`/api/students/${s.studentNo}`, { method: 'DELETE' });
      toast('삭제되었습니다.', 'success');
      globalMutate((k) => typeof k === 'string' && k.startsWith('/api/students'));
      router.push('/students');
    } catch (e) { toast((e as Error).message, 'error'); }
  }

  return (
    <>
      <PageHeader
        title={`${s.name || s.studentNo} 학생`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => router.push('/students')}>목록</button>
            <button className="btn" onClick={() => { window.location.href = `/api/students/${s.studentNo}/export`; }}>Excel</button>
            <button className="btn btn-primary" onClick={() => router.push(`/students/${s.studentNo}/edit`)}>정보 수정</button>
            <button className="btn btn-danger" onClick={remove}>삭제</button>
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
          <div className="info-row"><span className="info-label">동아리</span><span className="info-value">{(s.clubs ?? []).join(', ') || '-'}</span></div>
          <div className="info-row"><span className="info-label">졸업일자</span><span className="info-value">{s.graduationDate || '-'}</span></div>
          <div className="info-row"><span className="info-label">취업기업</span><span className="info-value">
            {s.employmentCompany
              ? (s.employmentCompanyId
                  ? <Link className="link" href={`/companies/${s.employmentCompanyId}`}>{s.employmentCompany}</Link>
                  : s.employmentCompany)
              : '-'}
          </span></div>
        </div>
      </div>

      <CounselingCard studentNo={s.studentNo} rows={s.counselings} onChanged={reload} />

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
                  <tr key={p.id} className="row-click"
                      role="button" tabIndex={0}
                      onClick={() => setSelectedProjectId(p.id)}
                      onKeyDown={clickKeys(() => setSelectedProjectId(p.id))}>
                    <td className="center">{p.year ?? '-'}</td>
                    <td>{p.title || '-'}</td>
                    <td>{p.period || '-'}</td>
                    <td>{p.professorName || '-'}</td>
                    <td>{p.companyId ? <Link className="link" href={`/companies/${p.companyId}`} onClick={(e) => e.stopPropagation()}>{p.companyName}</Link> : <span className="muted">{p.companyName}</span>}</td>
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
                    <td>{it.companyId ? <Link className="link" href={`/companies/${it.companyId}`}>{it.companyName || '-'}</Link> : <span className="muted">{it.companyName || '-'}</span>}</td>
                    <td className="center">{it.durationWeeks ?? '-'}</td>
                    <td>{it.activityDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedProjectId && (
        <div className="modal-root">
          <div className="modal-backdrop" onClick={() => setSelectedProjectId(null)} />
          <div className="modal-card">
            {projectDetail ? (
              <>
                <h3 className="modal-title">{projectDetail.title || '프로젝트 상세'}</h3>
                <div className="info-list">
                  <div className="info-row"><span className="info-label">연도</span><span className="info-value">{projectDetail.year ?? '-'}</span></div>
                  <div className="info-row"><span className="info-label">구분</span><span className="info-value">{projectDetail.category || '-'}{projectDetail.dept ? ` · ${projectDetail.dept}` : ''}</span></div>
                  <div className="info-row"><span className="info-label">유형</span><span className="info-value">{projectDetail.type || '-'}</span></div>
                  <div className="info-row"><span className="info-label">연구기간</span><span className="info-value">{projectDetail.period || '-'}</span></div>
                  <div className="info-row"><span className="info-label">특성화트랙</span><span className="info-value">{projectDetail.track || '-'}</span></div>
                  <div className="info-row"><span className="info-label">지도교수</span><span className="info-value">{projectDetail.professorName || '-'}</span></div>
                  <div className="info-row"><span className="info-label">연구실</span><span className="info-value">{projectDetail.labName || '-'}</span></div>
                  <div className="info-row"><span className="info-label">참여기업</span><span className="info-value">
                    {projectDetail.companyId
                      ? <Link className="link" href={`/companies/${projectDetail.companyId}`}>{projectDetail.companyName}</Link>
                      : projectDetail.companyName}
                  </span></div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="info-label" style={{ marginBottom: 6 }}>참여학생 ({projectDetail.students.length}명)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {projectDetail.students.length
                      ? projectDetail.students.map((st, i) => (
                          st.studentNo
                            ? <Link key={i} className="tag tag-indigo" href={`/students/${st.studentNo}`} onClick={() => setSelectedProjectId(null)}>{st.studentName}</Link>
                            : <span key={i} className="tag tag-indigo">{st.studentName}</span>
                        ))
                      : <span className="muted">기록 없음</span>}
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={() => setSelectedProjectId(null)}>닫기</button>
                </div>
              </>
            ) : (
              <div className="loading" style={{ padding: '40px 0' }}>불러오는 중…</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
