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
        <p>과제에 기재된 학위별 참여 인원입니다. 인원이 기재되지 않은 과제가 있어 실제보다 적게 집계됩니다.</p>
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

          {/* '13 / 7건 기재' 로 붙여 쓰면 슬래시 때문에 '7 중 13' 처럼 읽힌다.
              인원과 기재 건수는 분자·분모가 아니라 서로 다른 값이라 괄호로 끊는다 */}
          {DEGREES.map(({ key, label }) => {
            const d = p[key];
            const ratio = p.projects === 0 ? 0 : d.filled / p.projects;
            return (
              <div key={key} style={{ padding: '9px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
                  <span className="dash-num" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                    {d.sum}명
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
                      {d.filled === 0
                        ? ' (기재된 과제 없음)'
                        : ` (${d.filled}/${p.projects}건 기재)`}
                    </span>
                  </span>
                </div>
                {/* 채워진 칸은 인원이 기재된 과제, 사선은 아직 안 채워진 과제다.
                    숫자만 두면 각주를 안 읽은 사람에게 박사 참여가 실제로 적은 것으로 읽힌다 */}
                <div
                  className="chart-gap"
                  style={{ height: 6, borderRadius: 2, overflow: 'hidden' }}
                  title={`${p.projects}건 중 ${d.filled}건에 ${label} 인원이 기재됨`}
                >
                  <div style={{ width: `${ratio * 100}%`, height: '100%', background: 'var(--chart-1)' }} />
                </div>
              </div>
            );
          })}

          <div className="dash-note">
            사선은 인원이 기재되지 않은 과제입니다.
            <br />
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
