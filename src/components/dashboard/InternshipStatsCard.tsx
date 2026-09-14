'use client';

import type { InternshipHeadcount, InternshipComposition } from '@/lib/dashboard-shape';

/**
 * 인턴십 교육인원과 연계취업자. 실적 보고에 그대로 옮겨 쓰는 숫자인데
 * 그동안 대시보드에 없어서 엑셀을 다시 열어봐야 했다.
 */
function Row({ label, h }: { label: string; h: InternshipHeadcount }) {
  const edu = h.cse + h.ds + h.nonSw;
  const emp = h.empSw + h.empNonSw;
  return (
    <div style={{ paddingTop: 14, borderTop: '1px solid var(--slate-100)' }}>
      <div className="dash-metric-label" style={{ marginBottom: 10 }}>{label}</div>
      <div className="dash-metrics">
        <div>
          <div className="dash-metric-label">교육인원</div>
          <div className="dash-metric-value">{edu}<span className="unit">명</span></div>
          <div className="dash-metric-sub">정컴 {h.cse}, DS {h.ds}, 비SW {h.nonSw}</div>
        </div>
        <div>
          <div className="dash-metric-label">연계취업자</div>
          <div className="dash-metric-value">{emp}<span className="unit">명</span></div>
          <div className="dash-metric-sub">
            SW {h.empSw}, 비SW {h.empNonSw}
            {edu > 0 && <><br />교육인원의 {((emp / edu) * 100).toFixed(0)}%</>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 구성 한 축. 값이 적어 막대보다 라벨과 비율을 그대로 나열하는 편이 읽힌다 */
function Axis({ label, items }: { label: string; items: { key: string; count: number }[] }) {
  const total = items.reduce((a, x) => a + x.count, 0);
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: 'var(--text-3)', flex: '0 0 56px' }}>{label}</span>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        {items.map((x) => (
          <span key={x.key} style={{ fontSize: 'calc(12px * var(--fs, 1))', color: 'var(--text-2)' }}>
            {x.key} <span className="dash-num" style={{ color: 'var(--text-1)', fontWeight: 500 }}>{x.count}</span>
            <span style={{ color: 'var(--text-3)' }}> · {((x.count / total) * 100).toFixed(0)}%</span>
          </span>
        ))}
      </span>
    </div>
  );
}

export default function InternshipStatsCard({ year, data, composition }: {
  year: number;
  data: { year: InternshipHeadcount; total: InternshipHeadcount };
  composition: { year: InternshipComposition; total: InternshipComposition };
}) {
  // 선택 연도에 인턴십이 없으면 구성 칸이 비어 버린다. 그때만 누적으로 내려가고 라벨로 알린다
  const hasYear = composition.year.domestic.length > 0;
  const comp = hasYear ? composition.year : composition.total;

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>인턴십 교육 실적</h2>
        <p>실적 자료의 교육인원과 연계취업자를 합산한 값입니다. 해외 인턴십은 SW중심대학 성과지표에도 반영됩니다.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Row label={`${year}년`} h={data.year} />
        <Row label="전체 누적" h={data.total} />

        <div style={{ paddingTop: 14, borderTop: '1px solid var(--slate-100)' }}>
          <div className="dash-metric-label" style={{ marginBottom: 10 }}>
            구성 ({hasYear ? `${year}년` : '전체 누적'})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Axis label="국내외" items={comp.domestic} />
            <Axis label="주관" items={comp.hostType} />
            <Axis label="교육방식" items={comp.method} />
          </div>
        </div>
      </div>
    </div>
  );
}
