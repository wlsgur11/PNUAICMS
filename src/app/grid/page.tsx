'use client';

/**
 * 엑셀 입력 — 기존 업체정보 엑셀 양식 그대로의 넓은 표.
 *  교수님이 쓰던 엑셀처럼 한 행에 [기업 + 협력사항 + 담당자 + 대표자]를 입력한다.
 *  셀 더블클릭으로 편집, 행 추가 후 저장하면 정규화 테이블로 자동 분리 저장된다.
 *  (축약형이 아니라 원본 엑셀 컬럼을 최대한 그대로 재현)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import useSWR, { mutate as globalMutate } from 'swr';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import PageHeader from '@/components/PageHeader';
import { ENUMS } from '@/lib/enums';

function revalidateAll() {
  return globalMutate((key) => typeof key === 'string' && (
    key.startsWith('/api/companies') || key === '/api/dashboard' || key === '/api/grid'
  ));
}

type GridRow = {
  id?: string; version?: number; code?: string;
  domestic?: string; country?: string; orgType?: string | null;
  name: string; joinYear?: number | null; addressDetail?: string;
  internship?: boolean; overseasEducation?: boolean; industryProject?: boolean;
  curriculumCommittee?: boolean; guestLecture?: boolean; valueSpread?: boolean;
  employment?: boolean; fieldTrainingOrg?: boolean;
  startup?: boolean; etc?: boolean;
  contactName?: string; contactPosition?: string; contactPhone?: string; contactEmail?: string;
  ceoName?: string; ceoPhone?: string; ceoEmail?: string;
  _dirty?: boolean;
};

export default function GridPage() {
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  // SWR로 서버 데이터 캐싱. 로컬 dirty 편집은 별도의 rows state로 관리.
  const { data: serverRows, mutate: refresh } = useSWR<GridRow[]>('/api/grid');
  useEffect(() => { if (serverRows) setRows(serverRows.map((r) => ({ ...r }))); }, [serverRows]);
  const load = async () => { await refresh(); revalidateAll(); };

  // 협력여부 체크박스 공통 정의
  const boolCol = (field: ColDef<GridRow>['field'], header: string): ColDef<GridRow> => ({
    headerName: header, field, editable: true, width: 96,
    cellEditor: 'agCheckboxCellEditor', cellRenderer: 'agCheckboxCellRenderer',
  });

  const columnDefs = useMemo<(ColDef<GridRow> | ColGroupDef<GridRow>)[]>(() => [
    { headerName: '연번', field: 'code', editable: false, width: 84, pinned: 'left' },
    {
      headerName: '구분',
      children: [
        { headerName: '국내외', field: 'domestic', editable: true, width: 90 },
        { headerName: '국가', field: 'country', editable: true, width: 90 },
        { headerName: '유형', field: 'orgType', editable: true, width: 110, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['', ...ENUMS.ORG_TYPE] } },
      ],
    },
    {
      headerName: '기업 정보',
      children: [
        { headerName: '기관명', field: 'name', editable: true, pinned: 'left', width: 200, cellStyle: { fontWeight: 600 } },
        { headerName: '사업참여연도', field: 'joinYear', editable: true, width: 110, valueParser: (p) => (p.newValue ? Number(p.newValue) : null) },
        { headerName: '소재지', field: 'addressDetail', editable: true, width: 220 },
      ],
    },
    {
      headerName: '협력 사항 (체크)',
      children: [
        boolCol('internship', '인턴십'),
        boolCol('overseasEducation', '해외교육'),
        boolCol('industryProject', '산학프로젝트'),
        boolCol('curriculumCommittee', '교과혁신위'),
        boolCol('guestLecture', '특강'),
        boolCol('valueSpread', '가치확산'),
        boolCol('startup', '창업'),
        boolCol('etc', '기타'),
      ],
    },
    {
      headerName: '담당자',
      children: [
        { headerName: '담당자명', field: 'contactName', editable: true, width: 110 },
        { headerName: '직위', field: 'contactPosition', editable: true, width: 100 },
        { headerName: '연락처', field: 'contactPhone', editable: true, width: 140 },
        { headerName: '이메일', field: 'contactEmail', editable: true, width: 200 },
      ],
    },
    {
      headerName: '대표자',
      children: [
        { headerName: '대표자명', field: 'ceoName', editable: true, width: 110 },
        { headerName: '연락처', field: 'ceoPhone', editable: true, width: 140 },
        { headerName: '이메일', field: 'ceoEmail', editable: true, width: 200 },
      ],
    },
  ], []);

  const onCellChanged = (e: CellValueChangedEvent<GridRow>) => {
    e.data._dirty = true;
    if (e.node) e.api.refreshCells({ rowNodes: [e.node], force: true });
  };

  function addRow() {
    setRows((prev) => [...prev, { name: '', country: '한국', domestic: '국내', _dirty: true }]);
  }

  async function uploadExcel() {
    const f = fileRef.current?.files?.[0];
    if (!f) { toast('파일을 선택하세요.', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/companies/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `업로드 실패 (HTTP ${res.status})`);
      const d = json.data as {
        total: number; created: number; updated: number;
        errors: { name: string; error: string }[];
        headerRow: number; sheetName: string;
        columnMapping: string[];
        collabCounts: Record<string, number>;
      };
      // 콘솔에 자세한 진단 출력 (F12로 확인)
      console.log('[엑셀 업로드] 진단:', {
        헤더_시트: d.sheetName,
        헤더_행: d.headerRow,
        컬럼_매핑: d.columnMapping,
        협력_항목_적용: d.collabCounts,
        에러: d.errors,
      });
      const labelMap: Record<string, string> = {
        internship: '인턴십', industryProject: '산학프로젝트', curriculumCommittee: '교과혁신위',
        guestLecture: '특강', employment: '채용연계', fieldTrainingOrg: '현장실습',
        overseasEducation: '해외교육', valueSpread: '가치확산',
      };
      const collabSummary = Object.entries(d.collabCounts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${labelMap[k] || k} ${v}`)
        .join(', ');
      const msg = `총 ${d.total}건 - 신규 ${d.created}, 갱신 ${d.updated}` +
        (d.errors.length ? `, 실패 ${d.errors.length}` : '') +
        `\n협력 항목: ${collabSummary || '(없음 - 컬럼 인식 실패일 수 있음)'}` +
        `\n(자세한 컬럼 매핑은 브라우저 콘솔에서 확인)`;
      toast(msg, d.errors.length ? 'error' : 'success');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function bulkAutofill() {
    if (!confirm('등록된 모든 기업의 빈 칸을 자동 채움 합니다. 기존에 입력된 값은 보존됩니다. 진행할까요?')) return;
    setAutofilling(true);
    try {
      const r = await api<{ total: number; processed: number; updated: number; skipped: number; sourceCounts: Record<string, number>; errors: { name: string; error: string }[] }>(
        '/api/companies/bulk-lookup', { method: 'POST', body: '{}' }
      );
      const src = Object.entries(r.sourceCounts).map(([k, v]) => `${k}:${v}`).join(', ');
      toast(`총 ${r.total}개 중 ${r.updated}개 갱신 (대상 ${r.processed}, 이미 채워짐 ${r.skipped}${src ? ` / 출처: ${src}` : ''})`, 'success');
      if (r.errors.length) toast(`실패 ${r.errors.length}건`, 'error');
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setAutofilling(false);
    }
  }

  async function saveAll() {
    const dirty = rows.filter((r) => r._dirty && r.name?.trim());
    if (dirty.length === 0) { toast('변경된 행이 없습니다. (기관명 빈 행은 저장 안 함)', 'default'); return; }
    setSaving(true);
    try {
      const res = await api<{ results: { ok: boolean; name: string; error?: string }[]; success: number }>(
        '/api/grid', { method: 'POST', body: JSON.stringify({ rows: dirty }) }
      );
      const failed = res.results.filter((r) => !r.ok);
      if (failed.length === 0) toast(`${res.success}건 저장 완료`, 'success');
      else toast(`${res.success}건 저장, ${failed.length}건 실패: ${failed.map((f) => `${f.name}(${f.error})`).join(', ')}`, 'error');
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="엑셀 입력" />

      {/* 엑셀 가져오기 + 자동 채움 카드 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title"><span className="accent-bar" />엑셀 가져오기 / 자동 채움</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" ref={fileRef} accept=".xlsx,.xls" />
          <button className="btn btn-primary" onClick={uploadExcel} disabled={uploading}>
            {uploading ? '업로드 중…' : '엑셀 업로드'}
          </button>
          <div className="spacer" />
          <button className="btn" onClick={bulkAutofill} disabled={autofilling}>
            {autofilling ? '자동 채움 중…' : '등록된 모든 기업에 자동 채움'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          ※ <b>업로드</b>: 헤더에 ‘기관명/기업명’이 있는 엑셀을 인식합니다. 같은 기관명은 기존 행을 갱신하며 <b>비어있는 칸만</b> 채웁니다(기존 값 보존).
          담당자/대표자 컬럼은 자동으로 실무자 정보로 분리 저장됩니다.<br />
          ※ <b>자동 채움</b>: 등록된 모든 기업의 빈 칸을 위키/네이버/DART/공개 임금데이터로 채웁니다.
          기존에 입력된 값은 절대 덮어쓰지 않습니다. (대량이면 최대 1분 소요)
        </p>
      </div>

      <div className="filter-bar">
        <span className="muted">
          기존 업체정보 <strong>엑셀 양식 그대로</strong> 입력하는 화면입니다. 셀을 더블클릭해 입력하고,
          한 행에 [기업 · 협력사항 · 담당자 · 대표자]를 채운 뒤 저장하면 자동으로 정리되어 저장됩니다.
        </span>
        <div className="spacer" />
        <button className="btn" onClick={addRow}>＋ 행 추가</button>
        <button className="btn btn-primary" onClick={saveAll} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
      </div>

      <div className="ag-theme-quartz" style={{ width: '100%', height: 600, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--slate-200)' }}>
        <AgGridReact<GridRow>
          ref={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: false }}
          onCellValueChanged={onCellChanged}
          getRowStyle={(p) => (p.data?._dirty ? { background: '#fffbeb' } : undefined)}
          stopEditingWhenCellsLoseFocus
          singleClickEdit={false}
        />
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        ※ 노란색 행 = 아직 저장 안 된 변경분. ‘협력 사항’ 체크박스는 엑셀의 O 표시에 해당합니다.
        같은 기관명으로 다시 저장하면 기존 기업이 갱신됩니다(중복 생성 안 함).
      </p>
    </>
  );
}
