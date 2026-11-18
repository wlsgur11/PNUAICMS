'use client';

import CountUp from '@/components/CountUp';
import { goSection } from './DashSectionBar';
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
  const sign = (n: number) => (n > 0 ? `+${n}` : n === 0 ? '변화 없음' : `${n}`);
  // more: 올리면 펼쳐지는 한 줄. 전년 대비는 늘 '전년 대비' 라고 기준을 붙인다
  const yearLine = (tile: typeof t.projects, unit: string) =>
    `${data.year}년 ${tile.value}${unit}` + (tile.delta == null ? '' : `, 전년 대비 ${sign(tile.delta)}`);
  const figures: { label: string; value: number; unit: string; more: string | null; to: string }[] = [
    { label: '관리 기업', value: t.companies.value, unit: '곳',
      more: t.companies.delta == null ? null : `전년 대비 ${sign(t.companies.delta)}곳`, to: 'sec-companies' },
    { label: '산학 과제 누적', value: t.projects.total, unit: '건', more: yearLine(t.projects, '건'), to: 'sec-records' },
    { label: '인턴십 누적', value: t.internships.total, unit: '건', more: yearLine(t.internships, '건'), to: 'sec-records' },
    { label: `${data.year}년 SW중심대학 지표`, value: data.goals.swcu.met, unit: `/${data.goals.swcu.total}개 달성`,
      more: data.goals.swcu.total ? `미달 ${data.goals.swcu.total - data.goals.swcu.met}개` : null, to: 'sec-swcu' },
  ];

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
        {/* 키는 자리 번호. 이름에 연도가 들어가 키로 쓰면 연도를 바꿀 때 새로 그려져 0 부터 다시 굴러간다 */}
        {figures.map((f, i) => (
          // 누르면 그 숫자를 풀어 보여 주는 구역으로 내려간다
          <div key={i} className="dash-hero-fig" role="link" tabIndex={0}
               aria-label={`${f.label} ${f.value}${f.unit}, 자세히 보기`}
               onClick={() => goSection(f.to)}
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goSection(f.to); } }}>
            <dt>{f.label}<span className="dash-hero-arrow" aria-hidden="true">↓</span></dt>
            <dd><CountUp end={f.value} duration={1300} /><span className="u">{f.unit}</span></dd>
            {f.more && <dd className="dash-hero-more">{f.more}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}
