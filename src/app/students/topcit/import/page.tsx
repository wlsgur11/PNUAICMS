'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';

type Summary = { round: number; examDate: string | null; registered: number; attended: number; linked: number };
type Item = { file: File; summary?: Summary; error?: string };

export default function TopcitImportPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  async function post(file: File, dryRun: boolean): Promise<Summary> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/topcit/import' + (dryRun ? '?dryRun=1' : ''), { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json?.error || '처리 실패');
    return json.data as Summary;
  }

  // 회차 파일을 여러 개 한 번에 고를 수 있어 파일마다 차례로 보낸다
  async function preview() {
    setBusy(true);
    const next: Item[] = [];
    for (const it of items) {
      try { next.push({ file: it.file, summary: await post(it.file, true) }); }
      catch (e) { next.push({ file: it.file, error: (e as Error).message }); }
    }
    setItems(next);
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    try {
      for (const it of items.filter((x) => x.summary)) await post(it.file, false);
      toast(`TOPCIT ${items.filter((x) => x.summary).length}개 회차 저장`, 'success');
      await mutate((k) => typeof k === 'string' && k.startsWith('/api/topcit'));
      router.push('/students/topcit');
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  const ready = items.length > 0 && items.every((x) => x.summary || x.error) && items.some((x) => x.summary);
  return (
    <>
      <PageHeader title="TOPCIT 엑셀 올리기" />
      <div className="card" style={{ maxWidth: 760 }}>
        <p className="muted" style={{ marginBottom: 14, lineHeight: 1.7 }}>
          TOPCIT 정기평가 회차별 등록접수자 엑셀(.xls, .xlsx)을 올립니다. 여러 회차 파일을 한 번에 고를 수 있습니다.
          같은 회차를 다시 올리면 그 회차만 새 파일로 바뀝니다. 추이와 결과 집계는 접수자 전원으로 내고,
          개인별 결과는 이름과 연락처가 모두 맞는 CMS 학생만 남깁니다(엑셀에 학번이 없습니다). 연락처와 실명은 저장하지 않습니다.
        </p>
        <input type="file" accept=".xls,.xlsx" multiple
          onChange={(e) => setItems([...(e.target.files ?? [])].map((file) => ({ file })))} />
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button className="btn" onClick={preview} disabled={busy || items.length === 0}>미리보기</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !ready}>{busy ? '처리 중…' : '저장'}</button>
        </div>
      </div>

      {items.some((x) => x.summary || x.error) && (
        <div className="table-wrap" style={{ marginTop: 16, maxWidth: 760 }}>
          <table className="data-table">
            <thead><tr><th>파일</th><th>회차</th><th>시험일</th><th>접수</th><th>응시</th><th>CMS 학생</th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.file.name}>
                  <td>{it.file.name}</td>
                  {it.summary ? (
                    <>
                      <td>{it.summary.round}회</td>
                      <td>{it.summary.examDate ?? '-'}</td>
                      <td>{it.summary.registered}명</td>
                      <td>{it.summary.attended}명</td>
                      <td>{it.summary.linked}명</td>
                    </>
                  ) : <td colSpan={5} style={{ color: 'var(--red-600, #c00)' }}>{it.error ?? '대기'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
