'use client';

/** 컨택이력 상세 모달 — 대시보드/기업상세 어디서든 항목 클릭 시 전체 내용 표시.
 *  onEdit/onDelete 콜백이 주어지면 ‘수정’·‘삭제’ 버튼을 함께 보여준다. */
export type HistoryDetail = {
  id?: string;
  version?: number;
  personId?: string | null;
  contactDate?: string;
  histStatus?: string;
  method?: string | null;
  professor?: string | null;
  business?: string | null;
  personName?: string | null;
  companyName?: string | null;
  content?: string | null;
};

export default function HistoryDetailModal({
  history,
  onClose,
  onEdit,
  onDelete,
}: {
  history: HistoryDetail | null;
  onClose: () => void;
  onEdit?: (h: HistoryDetail) => void;
  onDelete?: (h: HistoryDetail) => void;
}) {
  if (!history) return null;
  const h = history;
  return (
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <h3 className="modal-title">컨택 이력 상세</h3>
        <div className="info-list">
          {h.companyName ? <div className="info-row"><span className="info-label">기업</span><span className="info-value">{h.companyName}</span></div> : null}
          <div className="info-row"><span className="info-label">일자</span><span className="info-value">{h.contactDate || '-'}</span></div>
          <div className="info-row"><span className="info-label">상태</span><span className="info-value"><span className={`tag ${h.histStatus === '진행완료' ? 'tag-green' : 'tag-indigo'}`}>{h.histStatus || '-'}</span></span></div>
          <div className="info-row"><span className="info-label">방식</span><span className="info-value">{h.method || '-'}</span></div>
          <div className="info-row"><span className="info-label">사업단</span><span className="info-value">{h.business || '-'}</span></div>
          <div className="info-row"><span className="info-label">담당교수</span><span className="info-value">{h.professor || '-'}</span></div>
          {h.personName ? <div className="info-row"><span className="info-label">실무자</span><span className="info-value">{h.personName}</span></div> : null}
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="info-label" style={{ marginBottom: 6 }}>내용</div>
          <div style={{ whiteSpace: 'pre-wrap', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', color: 'var(--slate-900)', lineHeight: 1.7 }}>
            {h.content || '(내용 없음)'}
          </div>
        </div>
        <div className="form-actions">
          {onDelete && <button className="btn btn-danger" onClick={() => onDelete(h)}>삭제</button>}
          {onEdit && <button className="btn" onClick={() => onEdit(h)}>✎ 수정</button>}
          <button className="btn btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
