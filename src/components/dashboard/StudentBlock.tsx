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

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>학생 관리 현황</h2>
        <p>등록된 학생과 실적 참여 규모. 상담이 부족한 고학년은 바로 챙길 대상이다</p>
      </div>

      {s.total === 0 ? (
        <div className="empty" style={{ fontSize: 13 }}>등록된 학생이 없습니다.</div>
      ) : (
        <>
          <div className="dash-metrics" style={{ marginBottom: 22 }}>
            <div>
              <div className="dash-metric-label">전체 학생</div>
              <div className="dash-metric-value"><CountUp end={s.total} /></div>
              <div className="dash-metric-sub">졸업 {s.graduated}명</div>
            </div>
            <div>
              <div className="dash-metric-label">산학 참여</div>
              <div className="dash-metric-value"><CountUp end={s.projectParticipants} /></div>
              <div className="dash-metric-sub">전체의 {((s.projectParticipants / s.total) * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="dash-metric-label">인턴십 참여</div>
              <div className="dash-metric-value"><CountUp end={s.internParticipants} /></div>
              <div className="dash-metric-sub">전체의 {((s.internParticipants / s.total) * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="dash-metric-label">상담 관리 필요</div>
              <div className="dash-metric-value" style={{ color: s.needsAttention > 0 ? 'var(--red-600)' : 'var(--text-1)' }}>
                <CountUp end={s.needsAttention} />
              </div>
              <div className="dash-metric-sub">3~4학년, 상담 2회 미만</div>
            </div>
          </div>

          {hasGrade && <>
          <div className="dash-metric-label" style={{ marginBottom: 10 }}>학년별 분포</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {s.gradeDistribution.map((g) => (
              <div key={g.grade}>
                <div style={{ height: 4, background: 'var(--slate-100)', borderRadius: 2, marginBottom: 6 }}>
                  <div style={{ width: `${(g.count / maxGrade) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{g.grade}학년</span>
                  <span className="dash-num" style={{ color: 'var(--text-1)' }}>{g.count}</span>
                </div>
              </div>
            ))}
          </div>
          </>}
          {!hasGrade && <div className="dash-note">학년이 입력된 학생이 없어 학년별 분포를 표시하지 않습니다.</div>}

          <div className="dash-note"><Link href="/students/dashboard" className="text-link">학생 현황 자세히</Link></div>
        </>
      )}
    </div>
  );
}
