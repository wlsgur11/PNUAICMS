'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, today } from '@/lib/client';
import { toast } from '@/components/Toaster';
import PageHeader from '@/components/PageHeader';
import HistoryDetailModal, { type HistoryDetail } from '@/components/HistoryDetailModal';
import { COLLAB_FIELDS, ENUMS } from '@/lib/enums';

type Person = { id: string; code: string; name: string; dept?: string; position?: string; email?: string; phone?: string; lastContactAt?: string };
type History = { id: string; contactDate: string; histStatus: string; content?: string; method?: string; professor?: string; person?: { name: string } | null };
type Collab = Record<string, boolean | string | number | null> & { version: number };
type Full = {
  id: string; code: string; name: string; region?: string; aiField?: string; homepage?: string;
  professor1?: string; professor2?: string; mou: boolean; priority?: string; status: string;
  addressDetail?: string; mainIndustry?: string; summary?: string; version: number;
  collaboration: Collab | null; persons: Person[]; histories: History[];
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<Full | null>(null);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState<null | 'person' | 'history' | 'collab'>(null);
  const [histDetail, setHistDetail] = useState<HistoryDetail | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const load = useCallback(() => {
    api<Full>(`/api/companies/${id}`).then(setC).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(load, [load]);

  async function deactivate() {
    if (!confirm('이 기업을 비활성 처리할까요? (데이터는 보존되며 목록에서 숨겨집니다)')) return;
    try { await api(`/api/companies/${id}`, { method: 'DELETE' }); toast('비활성 처리되었습니다.', 'success'); router.push('/companies'); }
    catch (e) { toast((e as Error).message, 'error'); }
  }

  if (err) return (<><PageHeader title="기업 상세 정보" /><div className="card empty">{err}</div></>);
  if (!c) return (<><PageHeader title="기업 상세 정보" /><div className="loading">불러오는 중…</div></>);

  return (
    <>
      <PageHeader title="기업 상세 정보" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link className="back-link" href="/companies">← 목록으로 돌아가기</Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => router.push(`/companies/${id}/edit`)}>✎ 기본정보 수정</button>
          <button className="btn btn-danger" onClick={deactivate}>비활성</button>
        </div>
      </div>

      <div className="detail-grid">
        {/* 기업 기본정보 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">🏢 {c.name}</div>
            {c.priority && <span className={`badge badge-${c.priority}`}>{c.priority} 등급</span>}
          </div>
          <div className="info-list">
            <div className="info-row"><span className="info-label">ID</span><span className="info-value">{c.code}</span></div>
            <div className="info-row"><span className="info-label">지역</span><span className="info-value">{c.region || '-'}</span></div>
            <div className="info-row"><span className="info-label">AI 기술분야</span><span className="info-value">{c.aiField || '-'}</span></div>
            <div className="info-row"><span className="info-label">주요산업</span><span className="info-value">{c.mainIndustry || '-'}</span></div>
            <div className="info-row"><span className="info-label">담당 교수</span><span className="info-value">{[c.professor1, c.professor2].filter(Boolean).join(', ') || '-'}</span></div>
            <div className="info-row"><span className="info-label">진행상태</span><span className="info-value"><span className="tag tag-indigo">{c.status}</span></span></div>
            <div className="info-row"><span className="info-label">MOU 체결</span><span className="info-value">{c.mou ? '체결 완료' : '미체결'}</span></div>
            <div className="info-row"><span className="info-label">홈페이지</span><span className="info-value">{c.homepage ? <a href={c.homepage} target="_blank" style={{ color: 'var(--indigo-600)' }}>{c.homepage}</a> : '-'}</span></div>
            <div className="info-row"><span className="info-label">소재지</span><span className="info-value">{c.addressDetail || '-'}</span></div>
          </div>
          {c.summary ? (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSummary((v) => !v)}>
                {showSummary ? '▴ 기업 소개 숨기기' : '▾ 기업 소개 보기 (위키피디아)'}
              </button>
              {showSummary && <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>{c.summary}</p>}
            </div>
          ) : null}
        </div>

        {/* 인턴십 및 채용연계 정보 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">🎓 인턴십 및 채용연계 정보</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal('collab')}>✎ 수정</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COLLAB_FIELDS.filter((cf) => c.collaboration?.[cf.key]).map((cf) => (
              <span key={cf.key} className={`tag ${cf.key === 'employment' ? 'tag-indigo' : 'tag-green'}`}>{cf.label} 가능</span>
            ))}
            {COLLAB_FIELDS.every((cf) => !c.collaboration?.[cf.key]) && <span className="muted">설정된 협업 항목이 없습니다.</span>}
          </div>
          <div className="info-list" style={{ marginTop: 18 }}>
            <div className="info-row"><span className="info-label">요구역량</span><span className="info-value">{String(c.collaboration?.requiredSkills ?? '') || '-'}</span></div>
            <div className="info-row"><span className="info-label">우대전공</span><span className="info-value">{String(c.collaboration?.preferredMajor ?? '') || '-'}</span></div>
            <div className="info-row"><span className="info-label">수용가능인원</span><span className="info-value">{c.collaboration?.capacity != null && c.collaboration?.capacity !== '' ? `${c.collaboration.capacity}명` : '-'}</span></div>
          </div>
          {c.collaboration?.memo ? <p className="muted" style={{ marginTop: 14 }}>메모: {String(c.collaboration.memo)}</p> : null}
        </div>

        {/* 실무자 목록 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">👥 실무자 목록</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal('person')}>＋ 추가</button>
          </div>
          {c.persons.length === 0 ? <div className="empty">등록된 실무자가 없습니다.</div> : (
            <table className="data-table">
              <thead><tr><th>이름/직책</th><th>연락처</th><th>이메일</th></tr></thead>
              <tbody>
                {c.persons.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><br /><span className="muted">{p.position || ''}</span></td>
                    <td>{p.phone || '-'}</td>
                    <td>{p.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 컨택 이력 및 성과 */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">🤝 컨택 이력 및 성과</div>
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
                    onClick={() => setHistDetail({ contactDate: h.contactDate, histStatus: h.histStatus, method: h.method, professor: h.professor, personName: h.person?.name ?? null, companyName: c.name, content: h.content })}>
                    <td style={{ whiteSpace: 'nowrap' }}>{h.contactDate}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><span className={`tag ${h.histStatus === '진행완료' ? 'tag-green' : 'tag-indigo'}`}>{h.histStatus}</span></td>
                    <td><span className="ellipsis" style={{ maxWidth: 240 }}>{h.content || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal === 'person' && <PersonModal companyId={id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'history' && <HistoryModal companyId={id} persons={c.persons} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'collab' && <CollabModal companyId={id} collab={c.collaboration} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      <HistoryDetailModal history={histDetail} onClose={() => setHistDetail(null)} />
    </>
  );
}

/* ── 모달: 실무자 추가 ── */
function PersonModal({ companyId, onClose, onSaved }: { companyId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', position: '', dept: '', phone: '', email: '', contactPref: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  async function save() {
    if (!f.name.trim()) { toast('이름은 필수입니다.', 'error'); return; }
    setSaving(true);
    try { await api(`/api/companies/${companyId}/persons`, { method: 'POST', body: JSON.stringify(f) }); toast('실무자 추가됨', 'success'); onSaved(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  }
  return (
    <Modal title="실무자 추가" onClose={onClose} onSave={save} saving={saving}>
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

/* ── 모달: 컨택이력 추가 ── */
function HistoryModal({ companyId, persons, onClose, onSaved }: { companyId: string; persons: Person[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ contactDate: today(), personId: '', professor: '', method: '미팅', content: '', histStatus: '논의중' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  async function save() {
    if (!f.contactDate) { toast('컨택일자는 필수입니다.', 'error'); return; }
    setSaving(true);
    try { await api(`/api/companies/${companyId}/histories`, { method: 'POST', body: JSON.stringify(f) }); toast('컨택이력 추가됨', 'success'); onSaved(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  }
  return (
    <Modal title="컨택 이력 추가" onClose={onClose} onSave={save} saving={saving}>
      <div className="form-grid">
        <div className="form-field"><label>컨택일자<span className="req">*</span></label><input type="date" value={f.contactDate} onChange={(e) => set('contactDate', e.target.value)} /></div>
        <div className="form-field"><label>실무자</label>
          <select value={f.personId} onChange={(e) => set('personId', e.target.value)}>
            <option value="">선택 안함</option>{persons.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-field"><label>담당교수</label><input value={f.professor} onChange={(e) => set('professor', e.target.value)} /></div>
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
function CollabModal({ companyId, collab, onClose, onSaved }: { companyId: string; collab: Collab | null; onClose: () => void; onSaved: () => void }) {
  const init: Record<string, boolean> = {};
  COLLAB_FIELDS.forEach((cf) => (init[cf.key] = !!collab?.[cf.key]));
  const [f, setF] = useState(init);
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
          ...f, memo, requiredSkills, preferredMajor,
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
