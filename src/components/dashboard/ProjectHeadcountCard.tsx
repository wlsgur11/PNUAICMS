'use client';

import CountUp from '@/components/CountUp';
import type { ProjectHeadcount } from '@/lib/dashboard-shape';

/**
 * 산학 과제에 참여한 학위별 인원. 실적 보고에 쓰는 숫자인데 대시보드에는 없었다.
 *
 * 주의: 박사·석사는 기재된 과제가 절반뿐이라 합계가 실제보다 적다.
 * 그래서 학위마다 '몇 건이 기재됐는지' 를 같이 보여 준다. 숫자만 크게 두면
 * 박사 참여가 실제로 적은 것처럼 읽힌다.
 */
const DEGREES = [
  { key: 'phd', label: '박사' },
  { key: 'master', label: '석사' },
  { key: 'undergrad', label: '학부' },
] as const;

const sumOf = (p: ProjectHeadcount) => p.phd.sum + p.master.sum + p.undergrad.sum;

export default function ProjectHeadcountCard({ year, data }: {
  year: number;
  data: { year: ProjectHeadcount; total: ProjectHeadcount };
}) {
  const p = data.year;
  const total = sumOf(p);

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>산학 참여 인원</h2>
        <p>과제에 기재된 학위별 참여 인원. 인원을 적지 않은 과제가 있어 실제보다 적게 나온다</p>
      </div>

      {p.projects === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>{year}년 산학 과제가 없습니다.</div>
      ) : (
        <>
          <div className="dash-metrics" style={{ marginBottom: 18 }}>
            <div>
              <div className="dash-metric-label">{year}년 참여 인원</div>
              <div className="dash-metric-value"><CountUp end={total} /></div>
              <div className="dash-metric-sub">과제 {p.projects}건</div>
            </div>
          </div>

          {DEGREES.map(({ key, label }) => (
            <div key={key} className="dash-list-row">
              <span className="name">{label}</span>
              <span className="num">
                {p[key].sum}
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
                  {' '}/ {p[key].filled}건 기재
                </span>
              </span>
            </div>
          ))}

          <div className="dash-note">
            전체 누적 {sumOf(data.total)}명
            {' ('}
            {DEGREES.map(({ key, label }) => `${label} ${data.total[key].sum}`).join(', ')}
            {')'}
          </div>
        </>
      )}
    </div>
  );
}
