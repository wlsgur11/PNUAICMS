'use client';

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';
import { api } from '@/lib/client';
import type { RecordsPreview, SideDiff, YearDiff } from '@/lib/records-preview';

type Summary = {
  projects: number; internships: number; students: number; unmatchedCompanies: string[];
};
type OriginalMeta = { filename: string; size: number; createdAt: string; uploadedBy: string | null } | null;

/** 연도 하나의 식별자. 트리에서 눌러 이동할 때 쓴다 */
const anchorOf = (kind: 'p' | 'i', year: string) => `diff-${kind}-${year}`;

/**
 * 연도 한 덩이. git diff 가 파일 하나를 접어 보여 주듯 연도 하나를 접어 보여 준다.
 *
 * 색만으로 구분하지 않는다. 색각이상이면 빨강과 초록이 같아 보여서, 왼쪽 홈에
 * 기호(−, +)를 고정 폭으로 두어 색을 못 봐도 읽히게 한다.
 *
 * 유지되는 건은 한 줄로 접는다. git diff 가 바뀌지 않은 줄을 접는 것과 같다.
 * 486건을 다 펴면 정작 갈린 건이 묻힌다.
 */
function DiffFile({ d, kind, open, onToggle }: {
  d: YearDiff; kind: 'p' | 'i'; open: boolean; onToggle: () => void;
}) {
  // 다섯 칸을 추가와 삭제 비율로 나눈다. GitHub 의 파일별 막대와 같은 뜻
  const changed = d.addedTotal + d.removedTotal;
  const addCells = changed === 0 ? 0 : Math.max(d.addedTotal ? 1 : 0, Math.round((d.addedTotal / changed) * 5));
  const delCells = changed === 0 ? 0 : Math.max(d.removedTotal ? 1 : 0, 5 - addCells);
  // before 와 after 는 따로 세지 않는다. 유지 + 사라짐 = 지금, 유지 + 들어옴 = 적재 후
  const before = d.kept + d.removedTotal;
  const after = d.kept + d.addedTotal;

  return (
    <div className="diff-file" id={anchorOf(kind, d.year)}>
      <button type="button" className="diff-file-head" onClick={onToggle}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--text-3)', fontSize: 'calc(11px * var(--fs, 1))' }}>{open ? '▾' : '▸'}</span>
          {d.year === '미기재' ? '연도 미기재' : `${d.year}년`}
          <span className="muted" style={{ fontWeight: 400, fontSize: 'calc(12px * var(--fs, 1))' }}>{before} → {after}건</span>
        </span>
        <span className="diff-file-stat">
          {d.addedTotal > 0 && <span className="add">+{d.addedTotal}</span>}
          {d.removedTotal > 0 && <span className="del">−{d.removedTotal}</span>}
          {changed === 0 && <span className="muted">변화 없음</span>}
          <span className="diff-bar">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={i < addCells ? 'add' : i < addCells + delCells ? 'del' : ''} />
            ))}
          </span>
        </span>
      </button>

      {open && (
        <div className="diff-body">
          {d.removed.map((label, i) => (
            <div key={`d${i}`} className="diff-row del"><span className="sign">−</span><span className="body">{label}</span></div>
          ))}
          {d.removedTotal > d.removed.length && (
            <div className="diff-row ctx"><span className="sign">⋯</span><span className="body">사라지는 건 {d.removedTotal - d.removed.length}건 더 있습니다</span></div>
          )}
          {d.kept > 0 && (
            <div className="diff-row ctx"><span className="sign">⋯</span><span className="body">그대로 유지 {d.kept}건</span></div>
          )}
          {d.added.map((label, i) => (
            <div key={`a${i}`} className="diff-row add"><span className="sign">+</span><span className="body">{label}</span></div>
          ))}
          {d.addedTotal > d.added.length && (
            <div className="diff-row ctx"><span className="sign">⋯</span><span className="body">새로 들어오는 건 {d.addedTotal - d.added.length}건 더 있습니다</span></div>
          )}
          {changed === 0 && (
            <div className="diff-row ctx"><span className="sign">⋯</span><span className="body">이 해는 바뀌는 것이 없습니다</span></div>
          )}
        </div>
      )}
    </div>
  );
}

/** 왼쪽 트리 한 줄. 어디에 얼마나 바뀌는지를 세는 자리다 */
function TreeItem({ label, d, onClick }: { label: string; d: YearDiff; onClick: () => void }) {
  const changed = d.addedTotal + d.removedTotal;
  return (
    <button type="button" className={`diff-tree-item${changed ? '' : ' quiet'}`} onClick={onClick}>
      <span>{label}</span>
      <span className="n">
        {d.addedTotal > 0 && <span className="add">+{d.addedTotal}</span>}
        {d.removedTotal > 0 && <span className="del">−{d.removedTotal}</span>}
        {changed === 0 && <span className="muted">—</span>}
      </span>
    </button>
  );
}

function PreviewTable({ p }: { p: RecordsPreview }) {
  const t = p.totals;
  const sections = [
    { kind: 'p' as const, title: '산학협력 과제', d: p.projectDiff, before: t.projectsBefore, after: t.projectsAfter },
    { kind: 'i' as const, title: '인턴십', d: p.internshipDiff, before: t.internshipsBefore, after: t.internshipsAfter },
  ];

  // 바뀌는 것이 없는 해는 접어 둔다. 다 펴 두면 정작 갈린 해가 묻힌다
  const [closed, setClosed] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const sec of sections) {
      for (const y of sec.d.years) {
        if (y.addedTotal + y.removedTotal === 0) s.add(anchorOf(sec.kind, y.year));
      }
    }
    return s;
  });
  const toggle = (id: string) => setClosed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  /** 트리에서 누르면 그 덩이로 옮겨 간다. 접혀 있으면 펴 준다 */
  const jump = (id: string) => {
    setClosed((prev) => { const n = new Set(prev); n.delete(id); return n; });
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };

  return (
    <div className="diff-layout">
      <aside className="diff-tree">
        {sections.map((sec) => (
          <div key={sec.kind}>
            <div className="diff-tree-group">{sec.title} {sec.before} → {sec.after}건</div>
            {sec.d.years.map((y) => (
              <TreeItem
                key={y.year}
                label={y.year === '미기재' ? '연도 미기재' : `${y.year}년`}
                d={y}
                onClick={() => jump(anchorOf(sec.kind, y.year))}
              />
            ))}
          </div>
        ))}
      </aside>

      <div style={{ minWidth: 0 }}>
        {sections.map((sec) => (
          <div key={sec.kind} style={{ marginBottom: 22 }}>
            <div className="info-label">
              {sec.title} {sec.before} → {sec.after}건
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                유지 {sec.d.kept} · 사라짐 {sec.d.removedTotal} · 새로 들어옴 {sec.d.addedTotal}
              </span>
            </div>
            {sec.d.years.map((y) => (
              <DiffFile
                key={y.year}
                d={y}
                kind={sec.kind}
                open={!closed.has(anchorOf(sec.kind, y.year))}
                onToggle={() => toggle(anchorOf(sec.kind, y.year))}
              />
            ))}
          </div>
        ))}

        <p className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', lineHeight: 1.7 }}>
          엑셀에 든 연도별 현황판: {p.yearStats.join(', ') || '없음'}
          <br />
          기업, 컨택 이력, 학생은 지워지지 않습니다. 학생은 추가와 이름 보완만 됩니다.
          <br />
          건별 대조는 <b>연도 + 기업명 + 제목</b>으로 맞춥니다. 제목이나 기업명이 조금만
          달라져도 사라진 건 하나와 새 건 하나로 잡히니, 목록을 보고 실제로 빠진 건인지
          이름만 바뀐 건인지 확인해 주세요.
        </p>
      </div>
    </div>
  );
}

type UnmatchedRow = { name: string; projects: number; internships: number };

/**
 * 아직 기업에 안 붙은 실적.
 *
 * 실적 엑셀은 우리가 못 고친다. 담당자가 '(쭈)폭씨', 'Bear Robotics' 처럼 적어 보내도
 * 여기서 한 번 기업에 붙여 두면 그 표기가 그 기업의 '다른 표기' 로 남아 다음 업로드부터
 * 자동으로 붙는다. 업로드 직후에만 뜨던 미매칭 목록과 달리 이 칸은 항상 지금 상태를 보여 준다.
 */
function UnmatchedCard() {
  const { data, mutate } = useSWR<{ total: number; rows: UnmatchedRow[] }>('/api/records/unmatched');
  const { data: companies } = useSWR<{ id: string; name: string }[]>('/api/companies');
  const [pickName, setPickName] = useState<Record<string, string>>({});
  const [linking, setLinking] = useState<string | null>(null);

  if (!data) return null;

  async function link(raw: string) {
    const typed = (pickName[raw] || '').trim();
    const target = companies?.find((c) => c.name === typed);
    if (!target) { toast('목록에 있는 기업명을 정확히 고르세요.', 'error'); return; }
    setLinking(raw);
    try {
      const r = await api<{ companyName: string; alias: string | null; linked: number }>(
        '/api/records/unmatched',
        { method: 'POST', body: JSON.stringify({ raw, companyId: target.id }) },
      );
      toast(`${r.companyName}에 실적 ${r.linked}건을 붙였습니다.`, 'success');
      setPickName((p) => ({ ...p, [raw]: '' }));
      mutate();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setLinking(null); }
  }

  return (
    <div className="card" style={{ maxWidth: 720, marginTop: 16 }}>
      <div className="card-head">
        <div className="card-title"><span className="accent-bar" />아직 기업에 안 붙은 실적 {data.total}건</div>
      </div>

      {data.total === 0 ? (
        <div className="empty" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>모든 실적이 기업에 연결되어 있습니다.</div>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 'calc(13px * var(--fs, 1))', lineHeight: 1.7, margin: '0 0 14px' }}>
            엑셀에 적힌 이름이 CMS 기업과 달라 안 붙은 것들입니다. 같은 기업이면 오른쪽에서
            골라 연결하세요. 그 표기가 해당 기업의 <b>다른 표기</b>로 저장돼 다음 업로드부터 자동으로 붙습니다.
            CMS에 아예 없는 기업이면 먼저 <a className="text-link" href="/companies/new">기업으로 등록</a>하세요.
          </p>

          {/* 기업이 100곳 넘는다. select 로 펼치면 찾기 어려워 입력하며 좁히는 datalist 를 쓴다 */}
          <datalist id="cms-companies">
            {(companies ?? []).map((c) => <option key={c.id} value={c.name} />)}
          </datalist>

          {data.rows.map((r) => (
            <div key={r.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '9px 0', borderTop: '1px solid var(--slate-100)',
            }}>
              <span style={{ flex: '1 1 180px', minWidth: 0 }}>
                <b style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>{r.name}</b>
                <span className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginLeft: 8 }}>
                  {[r.projects && `과제 ${r.projects}`, r.internships && `인턴십 ${r.internships}`].filter(Boolean).join(' · ')}
                </span>
              </span>
              <input
                list="cms-companies" placeholder="연결할 기업"
                value={pickName[r.name] ?? ''}
                onChange={(e) => setPickName((p) => ({ ...p, [r.name]: e.target.value }))}
                style={{ flex: '0 1 200px' }}
              />
              <button className="btn btn-sm" onClick={() => link(r.name)}
                      disabled={linking === r.name || !(pickName[r.name] || '').trim()}>
                {linking === r.name ? '연결 중…' : '연결'}
              </button>
            </div>
          ))}
        </>
      )}
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
      globalMutate('/api/records/unmatched'); // 적재로 미매칭 목록이 통째로 바뀐다
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

        {busy && !preview && <div className="muted" style={{ fontSize: 'calc(13px * var(--fs, 1))', marginTop: 12 }}>파일을 읽는 중…</div>}

        {preview && preview.lostYears.length > 0 && (
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14,
            padding: '10px 12px', background: 'var(--danger-soft-bg)',
            color: 'var(--danger-soft-text)', borderRadius: 'var(--radius)', fontSize: 'calc(13px * var(--fs, 1))', lineHeight: 1.6,
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
          {!preview && <span className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))' }}>파일을 고르면 바뀌는 내용을 먼저 보여 드립니다.</span>}
          {preview && (
            <button className="btn btn-sm" onClick={() => pick(null)} disabled={busy}>취소</button>
          )}
        </div>

        {original && !preview && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--slate-100)' }}>
            <div className="info-label" style={{ marginBottom: 6 }}>최근 업로드 원본</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="muted" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>
                {original.filename} · {Math.max(1, Math.round(original.size / 1024)).toLocaleString()}KB · {new Date(original.createdAt).toLocaleString('ko-KR')}
              </span>
              <a className="btn btn-sm" href="/api/records/original" download>원본 내려받기</a>
            </div>
          </div>
        )}
      </div>

      {/* 미리보기는 좌우 대조가 들어가 720px 로는 좁다. 폭 제한 없는 카드로 따로 둔다 */}
      {preview && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><div className="card-title"><span className="accent-bar" />적용하면 이렇게 바뀝니다</div></div>
          <PreviewTable p={preview} />
        </div>
      )}

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
              <div className="muted" style={{ fontSize: 'calc(13px * var(--fs, 1))', lineHeight: 1.9, maxHeight: 260, overflow: 'auto' }}>
                {result.unmatchedCompanies.join(', ')}
              </div>
              <p className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginTop: 8 }}>
                ※ 아래 <b>아직 기업에 안 붙은 실적</b>에서 기존 기업에 바로 연결할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      )}

      <UnmatchedCard />
    </>
  );
}
