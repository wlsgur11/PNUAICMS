'use client';

import Link from 'next/link';
import CountUp from '@/components/CountUp';
import type { StudentSummary } from '@/lib/dashboard-shape';

/**
 * 학생 관리 현황. 사이드바에 학생 이력 메뉴가 있는데 대시보드에는 학생 지표가
 * 하나도 없던 공백을 채운다. '관리 필요' 가 이 카드에서 유일하게 행동으로 이어지는 값이다.
 */
export default function StudentBlock({ s }: { s: StudentSummary }) {
  const maxGrade = Math.max(1, ...s.gradeDistribution.map((g) => g.count));
  // 운영 데이터는 학년이 비어 있는 학생이 많다. 전부 0 이면 0 짜리 막대 넷만 남아
  // 자리만 차지하므로 섹션을 접는다
  const hasGrade = s.gradeDistribution.some((g) => g.count > 0);
  // 학년이 기재된 학생 수. 운영 데이터는 930명 중 3명만 학년이 있는 식이라,
  // 이 숫자를 안 적으면 막대가 전체 학생의 학년 분포로 읽힌다
  const gradedTotal = s.gradeDistribution.reduce((a, g) => a + g.count, 0);

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>학생 관리 현황</h2>
        <p>
          실적 파일에서 모인 학번과 직접 등록한 학생을 합한 수입니다. 재학생 수와는 다릅니다.
          상담 횟수가 적은 고학년은 따로 집계했습니다.
        </p>
      </div>

      {s.total === 0 ? (
        <div className="empty" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>등록된 학생이 없습니다.</div>
      ) : (
        <>
          <div className="dash-metrics" style={{ marginBottom: 22 }}>
            <div>
              <div className="dash-metric-label">등록 학생</div>
              <div className="dash-metric-value"><CountUp end={s.total} /><span className="unit">명</span></div>
              <div className="dash-metric-sub">졸업 {s.graduated}명</div>
            </div>
            <div>
              <div className="dash-metric-label">산학 참여</div>
              <div className="dash-metric-value"><CountUp end={s.projectParticipants} /><span className="unit">명</span></div>
              {/* '전체의 몇 %' 를 적었다가 뺐다. 학생 행 대부분이 과제 명단에서
                  만들어지므로 분모가 분자와 거의 같아, 늘 90% 대가 나오고 아무것도
                  말해 주지 않는다. 재학생으로 나눈 참여율은 위 목표 대비 카드에 있다 */}
              <div className="dash-metric-sub">과제 명단에 학번이 있는 학생</div>
            </div>
            <div>
              <div className="dash-metric-label">인턴십 참여</div>
              <div className="dash-metric-value"><CountUp end={s.internParticipants} /><span className="unit">명</span></div>
              <div className="dash-metric-sub">인턴십 명단에 학번이 있는 학생</div>
            </div>
            <div>
              <div className="dash-metric-label">상담 관리 필요</div>
              <div className="dash-metric-value" style={{ color: s.needsAttention > 0 ? 'var(--red-600)' : 'var(--text-1)' }}>
                <CountUp end={s.needsAttention} /><span className="unit">명</span>
              </div>
              <div className="dash-metric-sub">3~4학년, 상담 2회 미만</div>
            </div>
          </div>

          {hasGrade && <>
          <div className="dash-metric-label" style={{ marginBottom: 10 }}>학년별 분포</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {s.gradeDistribution.map((g) => (
              <div key={g.grade}>
                <div className="dash-bar" style={{ marginBottom: 6 }}>
                  <span style={{ width: `${(g.count / maxGrade) * 100}%` }} />
                </div>
                <div style={{ fontSize: 'calc(12px * var(--fs, 1))', color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{g.grade}학년</span>
                  <span className="dash-num" style={{ color: 'var(--text-1)' }}>{g.count}</span>
                </div>
              </div>
            ))}
          </div>
          {gradedTotal < s.total && (
            <div className="dash-note">
              학년이 기재된 학생은 {gradedTotal}명입니다. 전체 {s.total}명의 분포가 아닙니다.
            </div>
          )}
          </>}
          {!hasGrade && <div className="dash-note">학년이 입력된 학생이 없어 학년별 분포를 표시하지 않습니다.</div>}

          <div className="dash-note"><Link href="/students/dashboard" className="text-link">학생 현황 자세히</Link></div>
        </>
      )}
    </div>
  );
}
