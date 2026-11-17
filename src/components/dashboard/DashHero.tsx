'use client';

import CountUp from '@/components/CountUp';
import type { DashboardData } from '@/lib/dashboard-shape';

/**
 * 대시보드 맨 위 파란 띠. 로그인 없이 처음 들어오는 화면이라 이 띠가 랜딩 역할을 한다.
 * 안쪽 카드는 옅은 파랑만 쓰지만(accent ladder), 여기 한 곳만 부산대 파랑을 면으로 깐다.
 * 숫자는 모두 API 값이고, 처음 열 때 한 번 굴러간다.
 */
export default function DashHero({ data, finding, years, onYear }: {
  data: DashboardData;
  finding: string | null;
  years: number[];
  onYear: (y: number) => void;
}) {
  const t = data.totals;
  const figures = [
    { label: '관리 기업', value: t.companies.value, unit: '곳' },
    { label: '산학 과제 누적', value: t.projects.total, unit: '건' },
    { label: '인턴십 누적', value: t.internships.total, unit: '건' },
    { label: `${data.year}년 SW중심대학 지표`, value: data.goals.swcu.met, unit: `/${data.goals.swcu.total}개 달성` },
  ].filter((f): f is { label: string; value: number; unit: string } => typeof f.value === 'number');

  return (
    <section className="dash-hero" aria-labelledby="dash-hero-title">
      <div className="dash-hero-top">
        <div>
          <h1 id="dash-hero-title" className="dash-hero-title">AI융합교육원 산학협력 성과</h1>
          {finding && <p className="dash-hero-finding">{finding}</p>}
        </div>
        {years.length > 1 && (
          <div className="dash-hero-years" role="group" aria-label="연도">
            {years.map((y) => (
              <button key={y} type="button" aria-pressed={y === data.year}
                      className={y === data.year ? 'on' : undefined} onClick={() => onYear(y)}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
      <dl className="dash-hero-figures">
        {figures.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd><CountUp end={f.value} duration={1300} /><span className="u">{f.unit}</span></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
