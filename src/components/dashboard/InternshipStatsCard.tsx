'use client';

import type { InternshipHeadcount } from '@/lib/dashboard-shape';

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
          <div className="dash-metric-value">{edu}</div>
          <div className="dash-metric-sub">정컴 {h.cse}, DS {h.ds}, 비SW {h.nonSw}</div>
        </div>
        <div>
          <div className="dash-metric-label">연계취업자</div>
          <div className="dash-metric-value">{emp}</div>
          <div className="dash-metric-sub">
            SW {h.empSw}, 비SW {h.empNonSw}
            {edu > 0 && <><br />교육인원의 {((emp / edu) * 100).toFixed(0)}%</>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InternshipStatsCard({ year, data }: {
  year: number;
  data: { year: InternshipHeadcount; total: InternshipHeadcount };
}) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>인턴십 교육 실적</h2>
        <p>실적 엑셀의 교육인원과 연계취업자를 합산한 값</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Row label={`${year}년`} h={data.year} />
        <Row label="전체 누적" h={data.total} />
      </div>
    </div>
  );
}
