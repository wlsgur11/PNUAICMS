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
        <div className="empty" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>{year}년 산학 과제가 없습니다.</div>
      ) : (
        <>
          <div className="dash-metrics" style={{ marginBottom: 18 }}>
            <div>
              <div className="dash-metric-label">{year}년 참여 인원</div>
              <div className="dash-metric-value"><CountUp end={total} /><span className="unit">명</span></div>
              <div className="dash-metric-sub">과제 {p.projects}건</div>
            </div>
          </div>

          {/* '13 / 7건 기재' 로 붙여 쓰면 슬래시 때문에 '7 중 13' 처럼 읽힌다.
              인원과 기재 건수는 분자·분모가 아니라 서로 다른 값이라 괄호로 끊는다 */}
          {/* 막대 길이는 인원(가장 많은 학위가 끝까지). 예전엔 기재 비율을 막대로 그려 인원과 헷갈렸다.
              기재 현황은 막대 아래 글로 적는다 */}
          <div className="yr-chart">
            {DEGREES.map(({ key, label }) => {
              const d = p[key];
              const maxSum = Math.max(1, ...DEGREES.map((x) => p[x.key].sum));
              return (
                <div key={key} className="yr-row">
                  <div className="yr-year">{label}</div>
                  <div>
                    <div className="yr-line">
                      <div className="yr-bar"><span style={{ width: `${(d.sum / maxSum) * 100}%` }} /></div>
                      <div className="yr-val"><b>{d.sum}</b>명</div>
                    </div>
                    <div className="yr-sub">
                      {d.filled === 0 ? '인원이 기재된 과제 없음' : d.filled === p.projects ? `과제 ${p.projects}건 모두 기재` : `과제 ${p.projects}건 중 ${d.filled}건만 인원 기재`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
