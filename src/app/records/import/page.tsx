'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';

type Summary = {
  projects: number; internships: number; students: number; unmatchedCompanies: string[];
};
type OriginalMeta = { filename: string; size: number; createdAt: string; uploadedBy: string | null } | null;

export default function RecordsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Summary | null>(null);
  const { data: original, mutate: mutateOriginal } = useSWR<OriginalMeta>('/api/records/original?meta=1');

  async function upload() {
    if (!file) { toast('파일을 선택하세요.', 'error'); return; }
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/records/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || '업로드 실패');
      setResult(json.data as Summary);
      mutateOriginal();
      toast('적재 완료', 'success');
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="실적 업로드" />
      <div className="card" style={{ maxWidth: 720 }}>
        <p className="muted" style={{ marginBottom: 14, lineHeight: 1.7 }}>
          산학협력·인턴십 정량실적 엑셀(.xlsx)을 업로드하면 프로젝트·인턴십·학생이 적재됩니다.
          다시 올리면 기존 실적은 전체 교체됩니다. (기업·컨택 데이터는 영향 없음)
        </p>
        <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={upload} disabled={busy}>
            {busy ? '적재 중…' : '업로드'}
          </button>
        </div>

        {original && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--slate-100)' }}>
            <div className="info-label" style={{ marginBottom: 6 }}>최근 업로드 원본</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {original.filename} · {Math.max(1, Math.round(original.size / 1024)).toLocaleString()}KB · {new Date(original.createdAt).toLocaleString('ko-KR')}
              </span>
              <a className="btn btn-sm" href="/api/records/original" download>원본 내려받기</a>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="card" style={{ maxWidth: 720, marginTop: 16 }}>
          <div className="card-head"><div className="card-title"><span className="accent-bar" />적재 결과</div></div>
          <div className="info-list">
            <div className="info-row"><span className="info-label">프로젝트</span><span className="info-value">{result.projects}건</span></div>
            <div className="info-row"><span className="info-label">인턴십</span><span className="info-value">{result.internships}건</span></div>
            <div className="info-row"><span className="info-label">학생(학번)</span><span className="info-value">{result.students}명</span></div>
            <div className="info-row"><span className="info-label">미매칭 기업</span><span className="info-value">{result.unmatchedCompanies.length}개</span></div>
          </div>
          {result.unmatchedCompanies.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--slate-100)' }}>
              <div className="info-label" style={{ marginBottom: 6 }}>CMS에 없는 기업 (원본 이름으로 보존됨)</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.9, maxHeight: 260, overflow: 'auto' }}>
                {result.unmatchedCompanies.join(', ')}
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                ※ 이 기업들을 CMS에 등록하면 해당 실적이 자동으로 연결됩니다.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
