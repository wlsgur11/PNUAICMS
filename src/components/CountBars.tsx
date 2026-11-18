/**
 * 항목별 인원 가로 막대(학생 현황, 통계분석이 같이 쓴다).
 * 막대 끝에 인원과 전체 대비 비율을 늘 적는다. 막대 길이는 가장 많은 항목 기준.
 */
export default function CountBars({ items, unit = '명', of }: {
  items: { label: string; count: number }[];
  unit?: string;
  /** 비율의 분모. 항목이 겹치는 목록(한 학생이 인턴십, 산학 둘 다)은 항목 합이 아니라 전체 인원을 넘긴다 */
  of?: number;
}) {
  if (items.length === 0) return <div className="empty">데이터 없음</div>;
  const max = Math.max(...items.map((i) => i.count), 1);
  const total = of ?? items.reduce((a, i) => a + i.count, 0);
  return (
    <div className="cb-list">
      {items.map((it) => (
        <div key={it.label} className="cb-row">
          <span className="cb-label">{it.label}</span>
          <span className="yr-bar"><span style={{ width: `${(it.count / max) * 100}%` }} /></span>
          <span className="yr-val">
            <b>{it.count.toLocaleString('ko-KR')}</b>{unit}
            {total > 0 && <em>{Math.round((it.count / total) * 100)}%</em>}
          </span>
        </div>
      ))}
    </div>
  );
}
