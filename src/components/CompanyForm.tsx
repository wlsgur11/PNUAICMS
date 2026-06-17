'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate as globalMutate } from 'swr';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import { ENUMS } from '@/lib/enums';

function invalidateCompaniesCache() {
  return globalMutate((key) => typeof key === 'string' && (
    key.startsWith('/api/companies') || key === '/api/dashboard' || key === '/api/grid'
  ));
}

export type CompanyFormData = {
  id?: string;
  version?: number;
  name: string;
  joinYear?: number | null;
  region?: string | null;
  addressDetail?: string | null;
  orgType?: string | null;
  aiField?: string | null;
  mainIndustry?: string | null;
  homepage?: string | null;
  revenueScale?: string | null;
  avgSalary?: string | null;
  newcomerSalary?: string | null;
  professor1?: string | null;
  professor2?: string | null;
  mou?: boolean;
  priority?: string | null;
  status?: string | null;
  summary?: string | null;
};

const EMPTY: CompanyFormData = { name: '', mou: false, status: '미접촉', priority: 'B', region: '부산' };

export default function CompanyForm({ initial, mode }: { initial?: CompanyFormData; mode: 'create' | 'edit' }) {
  const router = useRouter();
  const [f, setF] = useState<CompanyFormData>(initial ?? EMPTY);
  const [dupMsg, setDupMsg] = useState('');
  const [dupBlocks, setDupBlocks] = useState(false); // 활성 동명 기업이면 등록 차단
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const dupTimer = useRef<ReturnType<typeof setTimeout>>();

  const set = (k: keyof CompanyFormData, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  // 기관명 입력 → 디바운스 중복체크 (신규 등록에서만)
  useEffect(() => {
    if (mode !== 'create') return;
    clearTimeout(dupTimer.current);
    const name = f.name.trim();
    if (!name) { setDupMsg(''); return; }
    dupTimer.current = setTimeout(async () => {
      try {
        const r = await api<{ duplicate: boolean; match?: { name: string; isActive: boolean } }>(
          `/api/companies/check-duplicate?name=${encodeURIComponent(name)}`
        );
        if (!r.duplicate || !r.match) { setDupMsg(''); setDupBlocks(false); return; }
        if (r.match.isActive) {
          setDupMsg(`⚠ 이미 등록된 기관명입니다 (${r.match.name}).`);
          setDupBlocks(true);
        } else {
          setDupMsg(`ℹ 비활성 상태인 동일 기관이 있습니다. 등록하면 다시 활성화됩니다.`);
          setDupBlocks(false);
        }
      } catch { /* 무시 */ }
    }, 400);
    return () => clearTimeout(dupTimer.current);
  }, [f.name, mode]);

  // 자동 채움 (이름 → 외부조회)
  async function autoFill() {
    if (!f.name.trim()) { toast('기관명을 먼저 입력하세요.', 'error'); return; }
    setLooking(true);
    try {
      const a = await api<{ enabled: boolean; sources: string[]; addressDetail: string; homepage: string; industry: string; region: string; revenueScale: string; avgSalary: string; newcomerSalary: string; summary: string }>(
        `/api/lookup?name=${encodeURIComponent(f.name.trim())}`
      );
      if (!a.enabled) { toast('자동조회가 비활성 상태입니다 (.env 에 API 키 설정 필요).', 'error'); return; }
      setF((p) => ({
        ...p,
        addressDetail: p.addressDetail || a.addressDetail || p.addressDetail,
        homepage: p.homepage || a.homepage || p.homepage,
        mainIndustry: p.mainIndustry || a.industry || p.mainIndustry,
        region: p.region || a.region || p.region,
        revenueScale: p.revenueScale || a.revenueScale || p.revenueScale,
        avgSalary: p.avgSalary || a.avgSalary || p.avgSalary,
        newcomerSalary: p.newcomerSalary || a.newcomerSalary || p.newcomerSalary,
        summary: p.summary || a.summary || p.summary,
      }));
      toast(a.sources.length ? `자동 채움 완료 (출처: ${a.sources.join(',')})` : '외부 DB에서 정보를 찾지 못했습니다.', a.sources.length ? 'success' : 'default');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLooking(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { toast('기관명은 필수입니다.', 'error'); return; }
    if (mode === 'create' && dupBlocks) { toast('이미 등록된(활성) 기관입니다.', 'error'); return; }
    setSaving(true);
    try {
      if (mode === 'create') {
        const r = await api<{ id: string; reactivated?: boolean }>('/api/companies', { method: 'POST', body: JSON.stringify(f) });
        toast(r.reactivated ? '비활성 상태였던 기관을 다시 활성화했습니다.' : '등록되었습니다.', 'success');
        invalidateCompaniesCache();
        router.push(`/companies/${r.id}`);
      } else {
        await api(`/api/companies/${f.id}`, { method: 'PUT', body: JSON.stringify(f) });
        toast('수정되었습니다.', 'success');
        invalidateCompaniesCache();
        router.push(`/companies/${f.id}`);
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head">
        <div className="card-title"><span className="accent-bar" />기업 기본정보 {mode === 'create' ? '등록' : '수정'}</div>
        <button type="button" className="btn btn-sm" onClick={autoFill} disabled={looking}>
          {looking ? '조회 중…' : '이름으로 자동 채움'}
        </button>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label>기업명<span className="req">*</span></label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="예: ㈜부산에이아이" />
          {dupMsg && <span className="err">{dupMsg}</span>}
        </div>
        <div className="form-field">
          <label>사업참여연도</label>
          <input type="number" value={f.joinYear ?? ''} onChange={(e) => set('joinYear', e.target.value ? Number(e.target.value) : null)} placeholder="예: 2026" />
        </div>
        <div className="form-field">
          <label>유형</label>
          <select value={f.orgType ?? ''} onChange={(e) => set('orgType', e.target.value || null)}>
            <option value="">선택</option>
            {ENUMS.ORG_TYPE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>지역구분</label>
          <select value={f.region ?? ''} onChange={(e) => set('region', e.target.value || null)}>
            {ENUMS.REGION.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-field full">
          <label>소재지(상세)</label>
          <input value={f.addressDetail ?? ''} onChange={(e) => set('addressDetail', e.target.value)} />
        </div>
        <div className="form-field">
          <label>AI 기술분야</label>
          <input value={f.aiField ?? ''} onChange={(e) => set('aiField', e.target.value)} placeholder="예: 컴퓨터비전, NLP" />
        </div>
        <div className="form-field">
          <label>주요산업분야</label>
          <input value={f.mainIndustry ?? ''} onChange={(e) => set('mainIndustry', e.target.value)} />
        </div>
        <div className="form-field">
          <label>홈페이지</label>
          <input value={f.homepage ?? ''} onChange={(e) => set('homepage', e.target.value)} />
        </div>
        <div className="form-field">
          <label>매출규모</label>
          <input value={f.revenueScale ?? ''} onChange={(e) => set('revenueScale', e.target.value)} />
        </div>
        <div className="form-field">
          <label>평균연봉 <span className="hint">(공개 임금데이터)</span></label>
          <input value={f.avgSalary ?? ''} onChange={(e) => set('avgSalary', e.target.value)} placeholder="자동채움: 지방공기업 평균임금" />
        </div>
        <div className="form-field">
          <label>신입사원연봉 <span className="hint">(공개 임금데이터)</span></label>
          <input value={f.newcomerSalary ?? ''} onChange={(e) => set('newcomerSalary', e.target.value)} />
        </div>
        <div className="form-field">
          <label>전공책임교수</label>
          <input value={f.professor1 ?? ''} onChange={(e) => set('professor1', e.target.value)} />
        </div>
        <div className="form-field">
          <label>교육원 담당교수</label>
          <input value={f.professor2 ?? ''} onChange={(e) => set('professor2', e.target.value)} />
        </div>
        <div className="form-field">
          <label>협력우선순위</label>
          <select value={f.priority ?? ''} onChange={(e) => set('priority', e.target.value || null)}>
            <option value="">선택</option>
            {ENUMS.PRIORITY.map((p) => <option key={p} value={p}>{p} 등급</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>진행상태</label>
          <select value={f.status ?? '미접촉'} onChange={(e) => set('status', e.target.value)}>
            {ENUMS.STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field full">
          <label>기업 소개 <span className="hint">(자동 채움: 위키피디아)</span></label>
          <textarea value={f.summary ?? ''} onChange={(e) => set('summary', e.target.value)} placeholder="‘이름으로 자동 채움’ 시 위키피디아 요약이 들어옵니다." />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={() => router.back()}>취소</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
      </div>
    </form>
  );
}
