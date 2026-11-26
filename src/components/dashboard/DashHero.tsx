'use client';

import CountUp from '@/components/CountUp';
import { goSection } from './DashSectionBar';
import type { DashboardData, GoalMetric } from '@/lib/dashboard-shape';

/**
 * 대시보드 맨 위 파란 띠. 로그인 없이 처음 들어오는 화면이라 이 띠가 랜딩 역할을 한다.
 * 가장 자랑할 숫자만 둔다(2026-11-26 사용자, 실장님 의견).
 *  - 큰 단: 규모가 크거나 해마다 늘어난 숫자 셋. 산학 과제(4년 전 대비, 연속 증가), 협력 기업, 참여 학부생
 *  - 작은 단: 그해 목표를 넘긴 지표만. 못 미친 지표는 아래 '목표 대비' 카드에서 본다
 * 예전에는 목표 대비 지표를 문장으로 한 줄 더 적었고, 미달 지표가 맨 위에 크게 보였다.
 */
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Fig({ to, label, children, className }: { to: string; label: string; children: React.ReactNode; className: string }) {
  // 누르면 그 숫자를 풀어 보여 주는 구역으로 내려간다
  return (
    <div className={`dash-hero-fig ${className}`} role="link" tabIndex={0} aria-label={`${label}, 자세히 보기`}
      onClick={() => goSection(to)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goSection(to); } }}>
      {children}
    </div>
  );
}

export default function DashHero({ data, years, onYear }: {
  data: DashboardData;
  years: number[];
  onYear: (y: number) => void;
}) {
  const t = data.totals;
  const g = data.goals;

  // 산학 과제: 고른 해까지 최근 4년에서 연속 증가 햇수
  const trend = data.trend.filter((p) => p.year <= data.year).slice(-4);
  let streak = 0;
  for (let i = trend.length - 1; i > 0 && trend[i].projects > trend[i - 1].projects; i--) streak++;
  // 숫자 바로 아래 한 줄: 여러 해 늘었으면 출발점과 연속 증가, 아니면 전년 대비
  const d = t.projects.delta;
  const growth = streak >= 2
    ? `${trend[trend.length - 1 - streak].year}년 ${trend[trend.length - 1 - streak].projects.toLocaleString('ko-KR')}건에서 ${streak}년 연속 증가`
    : d == null ? null : d === 0 ? '전년과 같음' : `전년 대비 ${d > 0 ? '+' : ''}${d}건`;

  // 목표를 넘긴 지표만 작은 단에 올린다
  const metGoal = (m: GoalMetric) => m.achieved != null && m.target != null && m.achieved >= m.target;
  const wins = [
    metGoal(g.industry) && `산학협력 참여율 ${pct(g.industry.achieved!)} (목표 ${pct(g.industry.target!)} 달성)`,
    metGoal(g.internship) && `인턴십 참여율 ${pct(g.internship.achieved!)} (목표 ${pct(g.internship.target!)} 달성)`,
    g.swcu.total > 0 && g.swcu.met === g.swcu.total && `SW중심대학 지표 ${g.swcu.total}개 모두 달성`,
  ].filter((x): x is string => !!x);

  return (
    <section className="dash-hero" aria-labelledby="dash-hero-title">
      <div className="dash-hero-top">
        <h1 id="dash-hero-title" className="dash-hero-title">AI융합교육원 산학협력 성과</h1>
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

      {/* 키는 자리 번호. 이름에 연도가 들어가 키로 쓰면 연도를 바꿀 때 새로 그려져 0 부터 다시 굴러간다 */}
      <div className="dash-hero-goals">
        <Fig to="sec-records" label={`${data.year}년 산학 과제 ${t.projects.value}건`} className="goal">
          <div className="dash-hero-label">{data.year}년 산학 과제</div>
          <div className="dash-hero-big"><CountUp end={t.projects.value} duration={1300} /><span className="u">건</span></div>
          {/* 막대를 깔았다가 뺐다(2026-11-26 사용자 의견). 옆 카드와 같은 숫자와 글 구성으로 맞춘다 */}
          {growth && <div className="dash-hero-from">{growth}</div>}
          <div className="dash-hero-status">누적 {t.projects.total.toLocaleString('ko-KR')}건</div>
        </Fig>

        <Fig to="sec-companies" label={`협력 기업 ${t.companies.value}곳`} className="goal">
          <div className="dash-hero-label">협력 기업</div>
          <div className="dash-hero-big"><CountUp end={t.companies.value} duration={1300} /><span className="u">곳</span></div>
          <div className="dash-hero-status">실적 있는 기업 {data.partnerCompanies.toLocaleString('ko-KR')}곳</div>
        </Fig>

        <Fig to="sec-goals" label={`${data.year}년 산학 과제 참여 학부생 ${g.industry.students ?? '-'}명`} className="goal">
          <div className="dash-hero-label">{data.year}년 산학 과제 참여 학부생</div>
          <div className="dash-hero-big">
            {g.industry.students == null ? '-' : <CountUp end={g.industry.students} duration={1300} />}
            <span className="u">명</span>
          </div>
          {g.internship.students != null && <div className="dash-hero-status">인턴십 참여 학부생 {g.internship.students}명</div>}
        </Fig>
      </div>

      {wins.length > 0 && (
        <ul className="dash-hero-wins">
          {wins.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </section>
  );
}
