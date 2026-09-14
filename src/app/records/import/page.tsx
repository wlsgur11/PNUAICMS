'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';
import type { RecordsPreview } from '@/lib/records-preview';

type Summary = {
  projects: number; internships: number; students: number; unmatchedCompanies: string[];
};
type OriginalMeta = { filename: string; size: number; createdAt: string; uploadedBy: string | null } | null;

/**
 * 연도별로 지금 몇 건이고 적재 후 몇 건이 되는지. 이 표가 1차 저지선이다.
 * 합계만 보이면 '늘었으니 괜찮다' 로 읽히는데, 어떤 해는 늘고 어떤 해는
 * 통째로 비는 경우가 실제로 생긴다. 연도별로 나눠야 그게 보인다.
 */
function DeltaRows({ rows }: { rows: { year: string; before: number; after: number }[] }) {
  return (
    <>
      {rows.map((r) => {
        const d = r.after - r.before;
        const gone = r.before > 0 && r.after === 0;
        return (
          <div key={r.year} className="info-row">
            <span className="info-label">{r.year}</span>
            <span className="info-value" style={{ color: gone ? 'var(--red-600)' : undefined }}>
              {r.before} → <b>{r.after}</b>
              <span className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>
                {d === 0 ? '변화 없음' : d > 0 ? `+${d}` : `${d}`}
              </span>
              {gone && <span style={{ marginLeft: 8, fontWeight: 500 }}>전부 사라짐</span>}
            </span>
          </div>
        );
      })}
    </>
  );
}

function PreviewTable({ p }: { p: RecordsPreview }) {
  const t = p.totals;
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--slate-100)' }}>
      <div className="info-label" style={{ marginBottom: 8 }}>
        산학협력 과제 {t.projectsBefore} → {t.projectsAfter}건
      </div>
      <div className="info-list"><DeltaRows rows={p.projects} /></div>

      <div className="info-label" style={{ margin: '16px 0 8px' }}>
        인턴십 {t.internshipsBefore} → {t.internshipsAfter}건
      </div>
      <div className="info-list"><DeltaRows rows={p.internships} /></div>

      <p className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.7 }}>
        엑셀에 든 연도별 현황판: {p.yearStats.join(', ') || '없음'}
        <br />
        기업, 컨택 이력, 학생은 지워지지 않습니다. 학생은 추가와 이름 보완만 됩니다.
      </p>
    </div>
  );
}

export default function RecordsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Summary | null>(null);
  // 파일을 고르면 먼저 미리보기를 받아 둔다. 확인하기 전에는 적재하지 않는다
  const [preview, setPreview] = useState<RecordsPreview | null>(null);
  // 사라지는 연도가 있을 때만 쓰는 확인. 기본값이 false 라 그냥 못 지나간다
  const [acceptLoss, setAcceptLoss] = useState(false);
  const { data: original, mutate: mutateOriginal } = useSWR<OriginalMeta>('/api/records/original?meta=1');

  /** 적재하지 않고 무엇이 바뀌는지만 받아 온다 */
  async function send(dryRun: boolean) {
    const fd = new FormData();
    fd.append('file', file!);
    if (dryRun) fd.append('dryRun', '1');
    const res = await fetch('/api/records/import', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json?.error || (dryRun ? '미리보기 실패' : '업로드 실패'));
    return json.data;
  }

  async function pick(f: File | null) {
    setFile(f); setPreview(null); setResult(null); setAcceptLoss(false);
    if (!f) return;
    setBusy(true);
    try {
      // file state 는 아직 반영 전이라 send 가 못 읽는다. 여기서만 직접 만든다
      const fd = new FormData();
      fd.append('file', f);
      fd.append('dryRun', '1');
      const res = await fetch('/api/records/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || '미리보기 실패');
      setPreview(json.data as RecordsPreview);
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  async function upload() {
    if (!file) { toast('파일을 선택하세요.', 'error'); return; }
    if (!preview) { toast('미리보기를 먼저 확인하세요.', 'error'); return; }
    if (preview.lostYears.length > 0 && !acceptLoss) {
      toast('사라지는 연도가 있습니다. 확인란에 체크해 주세요.', 'error');
      return;
    }
    setBusy(true); setResult(null);
    try {
      setResult(await send(false) as Summary);
      setPreview(null); setFile(null); setAcceptLoss(false);
      mutateOriginal();
      toast('적재 완료', 'success');
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="실적 업로드" />
      <div className="card" style={{ maxWidth: 720 }}>
        <p className="muted" style={{ marginBottom: 14, lineHeight: 1.7 }}>
          산학협력·인턴십 정량실적 엑셀(.xlsx)을 올리면 과제·인턴십·학생이 적재됩니다.
          기존 실적은 <b>전체 교체</b>됩니다. 엑셀에 없는 연도는 사라지므로,
          파일을 고르면 먼저 무엇이 어떻게 바뀌는지 보여 드립니다. 확인 후 적용을 누르면 반영됩니다.
        </p>
        <input type="file" accept=".xlsx" onChange={(e) => pick(e.target.files?.[0] ?? null)} />

        {busy && !preview && <div className="muted" style={{ fontSize: 13, marginTop: 12 }}>파일을 읽는 중…</div>}

        {preview && <PreviewTable p={preview} />}

        {preview && preview.lostYears.length > 0 && (
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14,
            padding: '10px 12px', background: 'var(--danger-soft-bg)',
            color: 'var(--danger-soft-text)', borderRadius: 'var(--radius)', fontSize: 13, lineHeight: 1.6,
          }}>
            <input type="checkbox" checked={acceptLoss} onChange={(e) => setAcceptLoss(e.target.checked)}
                   style={{ marginTop: 3 }} />
            <span>
              {preview.lostYears.join(', ')}년 실적이 <b>전부 사라집니다</b>.
              이 엑셀이 전체 기간 자료가 맞는지 확인했고, 그래도 적용하겠습니다.
            </span>
          </label>
        )}

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={upload}
                  disabled={busy || !preview || (preview.lostYears.length > 0 && !acceptLoss)}>
            {busy && preview ? '적재 중…' : '적용'}
          </button>
          {!preview && <span className="muted" style={{ fontSize: 12 }}>파일을 고르면 바뀌는 내용을 먼저 보여 드립니다.</span>}
          {preview && (
            <button className="btn btn-sm" onClick={() => pick(null)} disabled={busy}>취소</button>
          )}
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
