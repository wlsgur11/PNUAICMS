'use client';

/**
 * 엑셀 입력 — 기존 업체정보 엑셀 양식 그대로의 넓은 표.
 *  교수님이 쓰던 엑셀처럼 한 행에 [기업 + 협력사항 + 담당자 + 대표자]를 입력한다.
 *  셀 더블클릭으로 편집, 행 추가 후 저장하면 정규화 테이블로 자동 분리 저장된다.
 *  (축약형이 아니라 원본 엑셀 컬럼을 최대한 그대로 재현)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import PageHeader from '@/components/PageHeader';
import { ENUMS } from '@/lib/enums';

type GridRow = {
  id?: string; version?: number; code?: string;
  domestic?: string; country?: string; orgType?: string | null;
  name: string; joinYear?: number | null; addressDetail?: string;
  internship?: boolean; overseasEducation?: boolean; industryProject?: boolean;
  curriculumCommittee?: boolean; guestLecture?: boolean; valueSpread?: boolean;
  startup?: string; etc?: string;
  contactName?: string; contactPosition?: string; contactPhone?: string; contactEmail?: string;
  ceoName?: string; ceoPhone?: string; ceoEmail?: string;
  _dirty?: boolean;
};

export default function GridPage() {
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setRows(await api<GridRow[]>('/api/grid'));
  }, []);
  useEffect(() => { load().catch((e) => toast((e as Error).message, 'error')); }, [load]);

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
        { headerName: '창업', field: 'startup', editable: true, width: 110 },
        { headerName: '기타', field: 'etc', editable: true, width: 160 },
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
      <PageHeader title="📊 엑셀 입력" />
      <div className="filter-bar">
        <span className="muted">
          기존 업체정보 <strong>엑셀 양식 그대로</strong> 입력하는 화면입니다. 셀을 더블클릭해 입력하고,
          한 행에 [기업 · 협력사항 · 담당자 · 대표자]를 채운 뒤 저장하면 자동으로 정리되어 저장됩니다.
        </span>
        <div className="spacer" />
        <button className="btn" onClick={addRow}>＋ 행 추가</button>
        <button className="btn btn-primary" onClick={saveAll} disabled={saving}>{saving ? '저장 중…' : '💾 저장'}</button>
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
