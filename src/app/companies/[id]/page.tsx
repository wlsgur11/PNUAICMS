'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { api, today } from '@/lib/client';
import { toast } from '@/components/Toaster';
import PageHeader from '@/components/PageHeader';
import HistoryDetailModal, { type HistoryDetail } from '@/components/HistoryDetailModal';
import { COLLAB_FIELDS, ENUMS } from '@/lib/enums';

/** 변경 후 기업 목록·대시보드 캐시도 함께 무효화 */
function revalidateAllCompanies() {
  return globalMutate((key) => typeof key === 'string' && (
    key.startsWith('/api/companies') || key === '/api/dashboard' || key === '/api/grid'
  ));
}

type Person = {
  id: string; code: string; version?: number;
  name: string; dept?: string; position?: string;
  email?: string; phone?: string; contactPref?: string;
  lastContactAt?: string;
};
type History = {
  id: string; version?: number;
  contactDate: string; histStatus: string;
  content?: string; method?: string; professor?: string; business?: string | null;
  personId?: string | null;
  person?: { name: string } | null;
};
type Collab = Record<string, boolean | string | number | null> & { version: number };
type Full = {
  id: string; code: string; name: string; region?: string; aiField?: string; homepage?: string;
  professor1?: string; professor2?: string; mou: boolean; priority?: string; status: string;
  addressDetail?: string; mainIndustry?: string; summary?: string;
  isActive: boolean; version: number;
  createdAt?: string; updatedAt?: string; createdBy?: string | null; updatedBy?: string | null;
  collaboration: Collab | null; persons: Person[]; histories: History[];
  participatingStudents?: { studentNo: string; nameMasked: string }[];
  participation?: {
    projects: { year: number; students: { studentNo: string; nameMasked: string }[] }[];
    internships: { year: number; students: { studentNo: string; nameMasked: string }[] }[];
  };
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const swrKey = `/api/companies/${id}`;
  const { data: c, error, mutate: refresh } = useSWR<Full>(swrKey);
  const [modal, setModal] = useState<null | 'person' | 'history' | 'collab'>(null);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [editHistory, setEditHistory] = useState<History | null>(null);
  const [histDetail, setHistDetail] = useState<HistoryDetail | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // 변경 후 상세 + 목록 + 대시보드 캐시 모두 무효화
  const reload = async () => { await refresh(); revalidateAllCompanies(); };

  async function deactivate() {
    if (!confirm('이 기업을 비활성 처리할까요? (데이터는 보존되며 목록에서 숨겨집니다)')) return;
    try { await api(`/api/companies/${id}`, { method: 'DELETE' }); toast('비활성 처리되었습니다.', 'success'); revalidateAllCompanies(); router.push('/companies'); }
    catch (e) { toast((e as Error).message, 'error'); }
  }

  async function reactivate() {
    if (!c) return;
    try {
      await api(`/api/companies/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: true, version: c.version }) });
      toast('다시 활성화되었습니다.', 'success');
      reload();
    } catch (e) { toast((e as Error).message, 'error'); }
  }

  async function hardDelete() {
    if (!c) return;
    // 2단계 확인 (실수 방지)
    if (!confirm(`"${c.name}" 을(를) 완전 삭제할까요?\n\n실무자·컨택 이력까지 모두 함께 삭제되며 복구할 수 없습니다.`)) return;
    if (!confirm(`마지막 확인 - "${c.name}" 의 모든 데이터를 영구 삭제합니다.\n정말 진행할까요?`)) return;
    try {
      await api(`/api/companies/${id}?hard=1`, { method: 'DELETE' });
      toast('완전 삭제되었습니다.', 'success');
      revalidateAllCompanies();
      router.push('/companies');
    } catch (e) { toast((e as Error).message, 'error'); }
  }

  async function deletePerson(p: Person) {
    if (!confirm(`실무자 "${p.name}" 을(를) 삭제할까요? (목록에서 숨겨집니다)`)) return;
    try { await api(`/api/persons/${p.id}`, { method: 'DELETE' }); toast('삭제되었습니다.', 'success'); reload(); }
    catch (e) { toast((e as Error).message, 'error'); }
  }

  async function deleteHistory(h: HistoryDetail) {
    if (!h.id) return;
    if (!confirm('이 컨택 이력을 삭제할까요? (복구할 수 없습니다)')) return;
    try { await api(`/api/histories/${h.id}`, { method: 'DELETE' }); toast('삭제되었습니다.', 'success'); setHistDetail(null); reload(); }
    catch (e) { toast((e as Error).message, 'error'); }
  }

  if (error) return (<><PageHeader title="기업 상세 정보" /><div className="card empty">{(error as Error).message}</div></>);
  if (!c) return (<><PageHeader title="기업 상세 정보" /><div className="loading">불러오는 중…</div></>);

  return (
    <>
      <PageHeader title="기업 상세 정보" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Link className="back-link" href="/companies" style={{ marginBottom: 0 }}>← 목록으로 돌아가기</Link>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => router.push(`/companies/${id}/edit`)}>✎ 기본정보 수정</button>
          {c.isActive
            ? <button className="btn btn-danger" onClick={deactivate}>비활성</button>
            : <>
                <button className="btn" onClick={reactivate}>↻ 다시 활성화</button>
                <button className="btn btn-danger" onClick={hardDelete}>완전 삭제</button>
              </>}
        </div>
      </div>
      <div style={{ height: 20 }} />

      <div className="detail-grid">
        {/* 기업 기본정보 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="accent-bar" />{c.name}</div>
            {c.priority && <span className={`badge badge-${c.priority}`}>{c.priority} 등급</span>}
          </div>
          <div className="info-list">
            <div className="info-row"><span className="info-label">ID</span><span className="info-value">{c.code}</span></div>
            <div className="info-row"><span className="info-label">지역</span><span className="info-value">{c.region || '-'}</span></div>
            <div className="info-row"><span className="info-label">AI 기술분야</span><span className="info-value">{c.aiField || '-'}</span></div>
            <div className="info-row"><span className="info-label">주요산업</span><span className="info-value">{c.mainIndustry || '-'}</span></div>
            <div className="info-row"><span className="info-label">전공책임교수</span><span className="info-value">{c.professor1 || '-'}</span></div>
            <div className="info-row"><span className="info-label">교육원 담당교수</span><span className="info-value">{c.professor2 || '-'}</span></div>
            <div className="info-row"><span className="info-label">진행상태</span><span className="info-value"><span className="tag tag-indigo">{c.status}</span></span></div>
            <div className="info-row"><span className="info-label">홈페이지</span><span className="info-value">{c.homepage ? <a href={c.homepage} target="_blank" style={{ color: 'var(--indigo-600)' }}>{c.homepage}</a> : '-'}</span></div>
            <div className="info-row"><span className="info-label">소재지</span><span className="info-value">{c.addressDetail || '-'}</span></div>
          </div>
          {c.summary ? (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSummary((v) => !v)}>
                {showSummary ? '▴ 특이사항 숨기기' : '▾ 특이사항 보기'}
              </button>
              {showSummary && <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>{c.summary}</p>}
            </div>
          ) : null}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--slate-100)', fontSize: 12, color: 'var(--slate-400)', lineHeight: 1.7 }}>
            <div>최초등록 {c.createdAt?.slice(0, 10) || '-'}{c.createdBy ? ` · ${c.createdBy}` : ''}</div>
            <div>최근수정 {c.updatedAt?.slice(0, 10) || '-'}{c.updatedBy ? ` · ${c.updatedBy}` : ''}</div>
          </div>
        </div>

        {/* 인턴십 및 채용연계 정보 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="accent-bar" />인턴십 및 채용연계 정보</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal('collab')}>✎ 수정</button>
          </div>
          <div className="info-list">
            {COLLAB_FIELDS.map((cf) => {
              const on = !!c.collaboration?.[cf.key];
              return (
                <div className="info-row" key={cf.key}>
                  <span className="info-label">{cf.label}</span>
                  <span className="info-value">
                    {on
                      ? <span className={`tag ${cf.key === 'employment' ? 'tag-indigo' : 'tag-green'}`}>가능</span>
                      : <span className="muted">-</span>}
                  </span>
                </div>
              );
            })}
            <div className="info-row"><span className="info-label">MOU 체결</span><span className="info-value">{c.mou ? <span className="tag tag-green">체결 완료</span> : <span className="muted">미체결</span>}</span></div>
            <div className="info-row"><span className="info-label">요구역량</span><span className="info-value">{String(c.collaboration?.requiredSkills ?? '') || '-'}</span></div>
            <div className="info-row"><span className="info-label">우대전공</span><span className="info-value">{String(c.collaboration?.preferredMajor ?? '') || '-'}</span></div>
            <div className="info-row"><span className="info-label">수용가능인원</span><span className="info-value">{c.collaboration?.capacity != null && c.collaboration?.capacity !== '' ? `${c.collaboration.capacity}명` : '-'}</span></div>
          </div>
          {c.collaboration?.memo ? <p className="muted" style={{ marginTop: 14 }}>메모: {String(c.collaboration.memo)}</p> : null}
        </div>

        {/* 실무자 목록 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="accent-bar" />실무자 목록</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal('person')}>＋ 추가</button>
          </div>
          {c.persons.length === 0 ? <div className="empty">등록된 실무자가 없습니다.</div> : (
            <table className="data-table">
              <thead><tr>
                <th>이름/직책</th>
                <th>연락처</th>
                <th>이메일</th>
                <th style={{ whiteSpace: 'nowrap', width: 120 }}>관리</th>
              </tr></thead>
              <tbody>
                {c.persons.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><br /><span className="muted">{p.position || ''}</span></td>
                    <td>{p.phone || '-'}</td>
                    <td>{p.email || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm" onClick={() => setEditPerson(p)}>수정</button>
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: 6 }} onClick={() => deletePerson(p)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 컨택 이력 및 성과 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="accent-bar" />컨택 이력 및 성과</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal('history')}>＋ 기록 추가</button>
          </div>
          {c.histories.length === 0 ? <div className="empty">컨택 이력이 없습니다.</div> : (
            <table className="data-table">
              <thead><tr>
                <th style={{ whiteSpace: 'nowrap', width: 104 }}>일자</th>
                <th style={{ whiteSpace: 'nowrap', width: 88 }}>상태</th>
                <th>내용</th>
              </tr></thead>
              <tbody>
                {c.histories.map((h) => (
                  <tr key={h.id} className="row-click"
                    onClick={() => setHistDetail({
                      id: h.id, version: h.version, personId: h.personId ?? null,
                      contactDate: h.contactDate, histStatus: h.histStatus,
                      method: h.method, professor: h.professor, business: h.business ?? null,
                      personName: h.person?.name ?? null, companyName: c.name, content: h.content,
                    })}>
                    <td style={{ whiteSpace: 'nowrap' }}>{h.contactDate}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><span className={`tag ${h.histStatus === '진행완료' ? 'tag-green' : 'tag-indigo'}`}>{h.histStatus}</span></td>
                    <td><span className="ellipsis" style={{ maxWidth: 240 }}>{h.content || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>※ 행을 클릭하면 전체 내용을 보거나 수정·삭제할 수 있습니다.</p>
        </div>

        {/* 참여 학생 (연결 A) */}
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="accent-bar" />참여 학생 ({c.participatingStudents?.length ?? 0})</div>
          </div>
          {(c.participatingStudents?.length ?? 0) === 0 ? (
            <div className="empty">이 기업과 연결된 산학·인턴십 참여 학생이 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {([
                { key: 'projects', label: '산학협력' },
                { key: 'internships', label: '인턴십' },
              ] as const).map((cat) => {
                const groups = c.participation?.[cat.key] ?? [];
                if (!groups.length) return null;
                return (
                  <div key={cat.key}>
                    <div className="stat-label" style={{ marginBottom: 8 }}>{cat.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {groups.map((g) => (
                        <div key={g.year} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                          <span style={{ minWidth: 52, fontWeight: 600, color: 'var(--slate-600)', fontSize: 13 }}>
                            {g.year > 0 ? `${g.year}년` : '연도미상'}
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {g.students.map((s) => (
                              <span key={s.studentNo} className="tag tag-indigo" style={{ cursor: 'pointer' }} onClick={() => router.push(`/students/${s.studentNo}`)}>{s.nameMasked}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 모달: 추가 */}
      {modal === 'person' && <PersonModal companyId={id} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
      {modal === 'history' && <HistoryModal companyId={id} persons={c.persons} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
      {modal === 'collab' && <CollabModal companyId={id} collab={c.collaboration} mou={c.mou} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}

      {/* 모달: 수정 (편집 모드) */}
      {editPerson && (
        <PersonModal
          companyId={id}
          initial={editPerson}
          onClose={() => setEditPerson(null)}
          onSaved={() => { setEditPerson(null); reload(); }}
        />
      )}
      {editHistory && (
        <HistoryModal
          companyId={id}
          persons={c.persons}
          initial={editHistory}
          onClose={() => setEditHistory(null)}
          onSaved={() => { setEditHistory(null); reload(); }}
        />
      )}

      {/* 컨택이력 상세 모달 (수정·삭제 콜백 포함) */}
      <HistoryDetailModal
        history={histDetail}
        onClose={() => setHistDetail(null)}
        onEdit={(h) => {
          setHistDetail(null);
          if (!h.id) return;
          setEditHistory({
            id: h.id, version: h.version, contactDate: h.contactDate ?? today(),
            histStatus: h.histStatus ?? '논의중', content: h.content ?? '',
            method: h.method ?? '미팅', professor: h.professor ?? '',
            business: h.business ?? null,
            personId: h.personId ?? null,
          });
        }}
        onDelete={deleteHistory}
      />
    </>
  );
}

/* ── 모달: 실무자 추가/수정 ── */
function PersonModal({
  companyId, initial, onClose, onSaved,
}: { companyId: string; initial?: Person | null; onClose: () => void; onSaved: () => void }) {
  const editing = !!initial?.id;
  const [f, setF] = useState({
    name: initial?.name ?? '',
    position: initial?.position ?? '',
    dept: initial?.dept ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    contactPref: initial?.contactPref ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) { toast('이름은 필수입니다.', 'error'); return; }
    setSaving(true);
    try {
      if (editing && initial?.id) {
        await api(`/api/persons/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...f, version: initial.version }),
        });
        toast('실무자가 수정되었습니다.', 'success');
      } else {
        await api(`/api/companies/${companyId}/persons`, {
          method: 'POST',
          body: JSON.stringify(f),
        });
        toast('실무자가 추가되었습니다.', 'success');
      }
      onSaved();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  }

  return (
    <Modal title={editing ? '실무자 수정' : '실무자 추가'} onClose={onClose} onSave={save} saving={saving}>
      <div className="form-grid">
        <div className="form-field"><label>이름<span className="req">*</span></label><input value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="form-field"><label>직책</label><input value={f.position} onChange={(e) => set('position', e.target.value)} /></div>
        <div className="form-field"><label>부서</label><input value={f.dept} onChange={(e) => set('dept', e.target.value)} /></div>
        <div className="form-field"><label>연락처</label><input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        <div className="form-field"><label>이메일</label><input value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div className="form-field"><label>선호연락방식</label>
          <select value={f.contactPref} onChange={(e) => set('contactPref', e.target.value)}>
            <option value="">선택</option>{ENUMS.CONTACT_PREF.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

/* ── 모달: 컨택이력 추가/수정 ── */
function HistoryModal({
  companyId, persons, initial, onClose, onSaved,
}: { companyId: string; persons: Person[]; initial?: History | null; onClose: () => void; onSaved: () => void }) {
  const editing = !!initial?.id;
  const [f, setF] = useState({
    contactDate: initial?.contactDate ?? today(),
    personId: initial?.personId ?? '',
    professor: initial?.professor ?? '',
    business: initial?.business ?? '',
    method: initial?.method ?? '미팅',
    content: initial?.content ?? '',
    histStatus: initial?.histStatus ?? '논의중',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.contactDate) { toast('컨택일자는 필수입니다.', 'error'); return; }
    setSaving(true);
    // 사업단 미선택('')은 null 로 보낸다 (enum 검증 통과용)
    const payload = { ...f, business: f.business || null };
    try {
      if (editing && initial?.id) {
        await api(`/api/histories/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...payload, version: initial.version }),
        });
        toast('컨택이력이 수정되었습니다.', 'success');
      } else {
        await api(`/api/companies/${companyId}/histories`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast('컨택이력이 추가되었습니다.', 'success');
      }
      onSaved();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  }

  return (
    <Modal title={editing ? '컨택 이력 수정' : '컨택 이력 추가'} onClose={onClose} onSave={save} saving={saving}>
      <div className="form-grid">
        <div className="form-field"><label>컨택일자<span className="req">*</span></label><input type="date" value={f.contactDate} onChange={(e) => set('contactDate', e.target.value)} /></div>
        <div className="form-field"><label>실무자</label>
          <select value={f.personId ?? ''} onChange={(e) => set('personId', e.target.value)}>
            <option value="">선택 안함</option>{persons.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-field"><label>담당교수</label><input value={f.professor} onChange={(e) => set('professor', e.target.value)} /></div>
        <div className="form-field"><label>관심사업분야(사업단)</label>
          <select value={f.business} onChange={(e) => set('business', e.target.value)}>
            <option value="">선택 안함</option>{ENUMS.BUSINESS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="form-field"><label>컨택방식</label>
          <select value={f.method} onChange={(e) => set('method', e.target.value)}>{ENUMS.CONTACT_METHOD.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </div>
        <div className="form-field"><label>상태</label>
          <select value={f.histStatus} onChange={(e) => set('histStatus', e.target.value)}>{ENUMS.HISTORY_STATUS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </div>
        <div className="form-field full"><label>내용</label><textarea value={f.content} onChange={(e) => set('content', e.target.value)} /></div>
      </div>
    </Modal>
  );
}

/* ── 모달: 협업정보 수정 ── */
function CollabModal({ companyId, collab, mou: mouInit, onClose, onSaved }: { companyId: string; collab: Collab | null; mou: boolean; onClose: () => void; onSaved: () => void }) {
  const init: Record<string, boolean> = {};
  COLLAB_FIELDS.forEach((cf) => (init[cf.key] = !!collab?.[cf.key]));
  const [f, setF] = useState(init);
  const [mou, setMou] = useState(!!mouInit);
  const [memo, setMemo] = useState(String(collab?.memo ?? ''));
  const [requiredSkills, setRequiredSkills] = useState(String(collab?.requiredSkills ?? ''));
  const [preferredMajor, setPreferredMajor] = useState(String(collab?.preferredMajor ?? ''));
  const [capacity, setCapacity] = useState(collab?.capacity != null ? String(collab.capacity) : '');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await api(`/api/companies/${companyId}/collaboration`, {
        method: 'PUT',
        body: JSON.stringify({
          ...f, mou, memo, requiredSkills, preferredMajor,
          capacity: capacity === '' ? null : Number(capacity),
          version: collab?.version,
        }),
      });
      toast('협업정보 저장됨', 'success'); onSaved();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  }
  return (
    <Modal title="인턴십·채용연계 정보 수정" onClose={onClose} onSave={save} saving={saving}>
      <div className="collab-grid">
        {COLLAB_FIELDS.map((cf) => (
          <label key={cf.key} className="collab-toggle">
            <input type="checkbox" checked={f[cf.key]} onChange={(e) => setF((p) => ({ ...p, [cf.key]: e.target.checked }))} />
            {cf.label}
          </label>
        ))}
      </div>
      <div className="form-grid" style={{ marginTop: 18 }}>
        <div className="form-field"><label>MOU 체결여부</label>
          <select value={mou ? '1' : '0'} onChange={(e) => setMou(e.target.value === '1')}>
            <option value="0">미체결</option>
            <option value="1">체결</option>
          </select>
        </div>
        <div className="form-field"><label>요구역량</label><input value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} placeholder="예: Python, PyTorch" /></div>
        <div className="form-field"><label>우대전공</label><input value={preferredMajor} onChange={(e) => setPreferredMajor(e.target.value)} placeholder="예: 컴퓨터공학" /></div>
        <div className="form-field"><label>수용가능인원(명)</label><input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="예: 3" /></div>
        <div className="form-field full"><label>기타 메모</label><textarea value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

/* ── 공용 모달 셸 ── */
function Modal({ title, children, onClose, onSave, saving }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <h3 className="modal-title">{title}</h3>
        {children}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}
