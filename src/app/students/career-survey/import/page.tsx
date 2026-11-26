'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';

type Preview = {
  year: number | null; count: number; skipped: number; linked: number;
  departments: { label: string; count: number }[]; questions: string[];
};

export default function CareerSurveyImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function send(dryRun: boolean) {
    if (!file) { toast('파일을 선택하세요.', 'error'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('year', year);
      const res = await fetch('/api/career-surveys/import' + (dryRun ? '?dryRun=1' : ''), { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || '처리 실패');
      if (dryRun) {
        setPreview(json.data as Preview);
        if (json.data.year) setYear(String(json.data.year));
      } else {
        toast(`${json.data.year}년 진로조사 ${json.data.count}명 저장`, 'success');
        await mutate((k) => typeof k === 'string' && k.startsWith('/api/career-surveys'));
        router.push('/students/career-survey');
      }
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="진로조사 엑셀 올리기" />
      <div className="card" style={{ maxWidth: 760 }}>
        <p className="muted" style={{ marginBottom: 14, lineHeight: 1.7 }}>
          구글폼 응답을 내려받은 엑셀(.xlsx)을 올립니다. 미리보기로 연도와 인원을 확인한 뒤 저장하세요.
          같은 연도를 다시 올리면 그 연도 응답만 새 파일로 바뀝니다. 연락처와 증빙 링크는 저장하지 않습니다.
        </p>
        <input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setYear(''); }} />
        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => send(true)} disabled={busy}>미리보기</button>
          {preview && (
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              조사 연도
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} style={{ width: 90 }} aria-label="조사 연도" />
            </label>
          )}
          <button className="btn btn-primary" onClick={() => send(false)} disabled={busy || !preview || !year}>
            {busy ? '처리 중…' : '저장'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="card" style={{ marginTop: 16, maxWidth: 760 }}>
          <div className="card-title" style={{ marginBottom: 10 }}>
            {preview.year ? `${preview.year}년` : '연도를 찾지 못했습니다. 위에 직접 넣어 주세요'}, 응답 {preview.count}명
          </div>
          <ul style={{ margin: '0 0 12px', paddingLeft: 18, lineHeight: 1.8 }}>
            <li>CMS 학생 목록에 있는 학생 {preview.linked}명</li>
            <li>학과: {preview.departments.map((d) => `${d.label} ${d.count}명`).join(', ')}</li>
            {preview.skipped > 0 && <li>학번이 비어 건너뛴 응답 {preview.skipped}건</li>}
          </ul>
          <div className="muted" style={{ marginBottom: 6 }}>저장할 문항 {preview.questions.length}개</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 'calc(13px * var(--fs, 1))', lineHeight: 1.7 }}>
            {preview.questions.map((q) => <li key={q}>{q}</li>)}
          </ol>
        </div>
      )}
    </>
  );
}
