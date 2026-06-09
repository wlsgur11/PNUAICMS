'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';

type IndicatorRow = {
  area: string | null; name: string; unit: string | null;
  target: number | null; actual: number | null;
  verifiedActual: number | null; verifyResult: string | null;
};
type Preview = {
  year: number; university: string | null; submittedAt: string | null;
  indicators: IndicatorRow[]; rawCount: number;
};

const fmt = (n: number | null, unit: string | null) => {
  if (n == null) return '-';
  if (unit === '%') return (n * 100).toFixed(2) + '%';
  return String(n);
};

export default function SwcuImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function send(dryRun: boolean) {
    if (!file) { toast('파일을 선택하세요.', 'error'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = '/api/swcu/import' + (dryRun ? '?dryRun=1' : '');
      const res = await fetch(url, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || '처리 실패');
      if (dryRun) {
        setPreview(json.data as Preview);
        toast('미리보기 생성됨. 확인 후 저장하세요.', 'success');
      } else {
        toast(`${json.data.year}년 저장 완료 (지표 ${json.data.indicators} / 원시값 ${json.data.raws})`, 'success');
        setPreview(null); setFile(null);
      }
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="SW중심대학 실적 업로드" />
      <div className="card" style={{ maxWidth: 760 }}>
        <p className="muted" style={{ marginBottom: 14, lineHeight: 1.7 }}>
          연차별 SW중심대학 정량실적 엑셀(.xlsx)을 업로드합니다. 먼저 미리보기로 파싱 결과(연도·성과지표 목표/실적)를
          확인한 뒤 저장하세요. 같은 연도를 다시 올리면 그 연도만 전체 교체됩니다. (다른 연도·기존 CMS 데이터 무영향)
        </p>
        <input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} />
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => send(true)} disabled={busy}>미리보기</button>
          <button className="btn btn-primary" onClick={() => send(false)} disabled={busy || !preview}>
            {busy ? '처리 중…' : '저장'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <div className="card-title"><span className="accent-bar" />{preview.year}년 미리보기</div>
            <span className="muted" style={{ fontSize: 13 }}>지표 {preview.indicators.length} · 원시값 {preview.rawCount}</span>
          </div>
          <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--slate-200)' }}>
            <table className="data-table">
              <thead><tr><th>영역</th><th>성과지표</th><th>단위</th><th>목표</th><th>실적</th><th>KMAC검증</th></tr></thead>
              <tbody>
                {preview.indicators.map((i) => (
                  <tr key={i.name}>
                    <td className="muted">{i.area || ''}</td>
                    <td>{i.name}</td>
                    <td className="center">{i.unit || ''}</td>
                    <td className="center">{fmt(i.target, i.unit)}</td>
                    <td className="center" style={{ fontWeight: 700 }}>{fmt(i.actual, i.unit)}</td>
                    <td className="center">
                      {i.verifyResult ? <span className={`tag ${i.verifyResult === 'O' ? 'tag-green' : 'tag-indigo'}`}>{i.verifyResult}</span> : '-'}
                      {i.verifiedActual != null && <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>{fmt(i.verifiedActual, i.unit)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
