'use client';

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
import StudentBlock from '@/components/dashboard/StudentBlock';
import InternshipStatsCard from '@/components/dashboard/InternshipStatsCard';
import RecentContactsBlock from '@/components/dashboard/RecentContactsBlock';
import type { DashboardData } from '@/lib/dashboard-shape';

export default function DashboardPage() {
  const me = useMe();
  const isGeneral = me?.role === 'GENERAL';
  const { data, error } = useSWR<DashboardData>('/api/dashboard');

  if (error) return <><PageHeader title="산학협력 성과" /><div className="card empty">불러오기 실패: {(error as Error).message}</div></>;
  if (!data) return <><PageHeader title="산학협력 성과" /><div className="loading">불러오는 중…</div></>;

  return (
    <>
      <PageHeader title="산학협력 성과" />

      {isGeneral && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title"><span className="accent-bar" />접근 권한 대기 중</div>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>
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
          />
          <TotalsCard totals={data.totals} />
        </div>
      </FadeContent>

      {data.pipeline && data.distribution && (
        <>
          {/* 아래 카드를 한 그리드에 모아 둔다. 행마다 쪼개면 auto-fit 이
              항목 수 이상으로 열을 만들 수 없어 넓은 화면에서도 2열에 머문다 */}
          <FadeContent delay={100}>
            <div className="dash-grid-auto">
              <PipelineBlock pipeline={data.pipeline} />
              <SwcuBlock swcu={data.goals.swcu} />
              <DistributionBlock distribution={data.distribution} />
              <CollabBlock items={data.collaboration ?? []} region={data.distribution.region} />
              {data.students && <StudentBlock s={data.students} />}
              {data.internshipHeadcount && (
                <InternshipStatsCard year={data.year} data={data.internshipHeadcount} />
              )}
            </div>
          </FadeContent>

          <FadeContent delay={200}>
            <div className="dash-row">
              <RecentContactsBlock rows={data.recentHistories} />
            </div>
          </FadeContent>
        </>
      )}

    </>
  );
}
