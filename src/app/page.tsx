'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import FadeContent from '@/components/FadeContent';
import { useMe } from '@/components/MeProvider';
import GoalCard from '@/components/dashboard/GoalCard';
import TotalsCard from '@/components/dashboard/TotalsCard';
import PipelineBlock from '@/components/dashboard/PipelineBlock';
import SwcuBlock from '@/components/dashboard/SwcuBlock';
import DistributionBlock from '@/components/dashboard/DistributionBlock';
import CollabBlock from '@/components/dashboard/CollabBlock';
import FollowUpBlock from '@/components/dashboard/FollowUpBlock';
import StudentBlock from '@/components/dashboard/StudentBlock';
import InternshipStatsCard from '@/components/dashboard/InternshipStatsCard';
import SwcuAreaCard from '@/components/dashboard/SwcuAreaCard';
import ProjectHeadcountCard from '@/components/dashboard/ProjectHeadcountCard';
import LabRankCard from '@/components/dashboard/LabRankCard';
import RecentContactsBlock from '@/components/dashboard/RecentContactsBlock';
import type { DashboardData } from '@/lib/dashboard-shape';

export default function DashboardPage() {
  const me = useMe();
  const isGeneral = me?.role === 'GENERAL';
  // 연도를 안 고르면 서버가 가장 최근 연도를 쓴다. 고른 뒤에는 URL 로 넘겨
  // 목표 대비, 증감, SW중심대학 지표, 연도별 실적이 모두 그 연도를 따른다
  const [year, setYear] = useState<number | null>(null);
  const { data, error } = useSWR<DashboardData>(
    year == null ? '/api/dashboard' : `/api/dashboard?year=${year}`,
    { keepPreviousData: true },
  );

  if (error) return <><PageHeader title="산학협력 성과" /><div className="card empty">불러오기 실패: {(error as Error).message}</div></>;
  if (!data) return <><PageHeader title="산학협력 성과" /><div className="loading">불러오는 중…</div></>;

  return (
    <>
      <PageHeader
        title="산학협력 성과"
        extra={data.years.length > 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))' }}>연도</span>
            {data.years.map((y) => (
              <button key={y} type="button"
                      className={`btn btn-sm${y === data.year ? ' btn-primary' : ''}`}
                      onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
        ) : undefined}
      />

      {isGeneral && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title"><span className="accent-bar" />접근 권한 대기 중</div>
          <div className="muted" style={{ fontSize: 'calc(13px * var(--fs, 1))', lineHeight: 1.6, marginTop: 6 }}>
            현재 일반 계정입니다. 관리자(슈퍼관리자)가 권한을 부여하면 기업, 학생, 실적 데이터에 접근할 수 있습니다.
          </div>
        </div>
      )}

      <FadeContent>
        <div className="dash-grid-7-5">
          <GoalCard
            industry={data.goals.industry}
            internship={data.goals.internship}
            swcu={data.goals.swcu}
            year={data.year}
            trend={data.trend}
            goalTrend={data.goalTrend}
            headcount={data.headcount}
          />
          <TotalsCard totals={data.totals} partnerCompanies={data.partnerCompanies} year={data.year} />
        </div>
      </FadeContent>

      {data.pipeline && data.distribution && (
        <>
          {/* 구역은 사이드바 메뉴 단위로 끊고, 구역마다 카드 수에 열 수를 맞춘다.
              카드 수가 기업 2 / 산학·인턴십 4 / 지표·학생 3 이라 어느 구역도
              행을 반만 채우지 않는다. 최근 컨택은 4열 표라 좁은 칸에 넣지 않고
              구역 밖 전체 폭에 둔다 */}
          <FadeContent delay={100}>
            <div className="dash-section">기업</div>
            {/* 다음 컨택 대상을 파이프라인 왼쪽에 둔다. 파이프라인이 '몇 곳이
                어느 단계인가' 라면 이쪽은 '그래서 누구부터 연락하나' 라서,
                숫자를 보고 바로 이름으로 넘어가는 순서가 된다 */}
            <div className="dash-grid-auto">
              {data.followUp && <FollowUpBlock data={data.followUp} />}
              <PipelineBlock pipeline={data.pipeline} />
              <CollabBlock items={data.collaboration ?? []} region={data.distribution.region} />
            </div>
          </FadeContent>

          <FadeContent delay={150}>
            <div className="dash-section">산학·인턴십 실적</div>
            <div className="dash-grid-4">
              <DistributionBlock distribution={data.distribution} />
              {data.projectHeadcount && (
                <ProjectHeadcountCard year={data.year} data={data.projectHeadcount} />
              )}
              {data.labs && <LabRankCard labs={data.labs} />}
              {data.internshipHeadcount && data.internshipComposition && (
                <InternshipStatsCard
                  year={data.year}
                  data={data.internshipHeadcount}
                  composition={data.internshipComposition}
                />
              )}
            </div>
          </FadeContent>

          <FadeContent delay={200}>
            {/* 학생을 지표와 같은 구역에 둔다. SW중심대학 참여율 지표의 분모가
                재학생이라 두 카드를 같이 보는 편이 맞다 */}
            <div className="dash-section">SW중심대학 성과와 학생</div>
            <div className="dash-grid-auto">
              <SwcuBlock swcu={data.goals.swcu} year={data.year} />
              <SwcuAreaCard areas={data.goals.swcu.areas} year={data.year} />
              {data.students && <StudentBlock s={data.students} />}
            </div>
          </FadeContent>

          <FadeContent delay={250}>
            <div className="dash-row">
              <RecentContactsBlock rows={data.recentHistories} />
            </div>
          </FadeContent>
        </>
      )}

    </>
  );
}
