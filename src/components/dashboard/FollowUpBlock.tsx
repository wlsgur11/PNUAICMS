'use client';

import Link from 'next/link';
import type { FollowUp } from '@/lib/dashboard-shape';

/**
 * 다음에 연락할 기업.
 *
 * 다른 카드가 전부 집계 숫자라 '지금 어떤 상태인가' 에만 답한다. 미접촉 98곳이라는
 * 숫자는 상태는 알려 주지만 내일 할 일로는 이어지지 않는다. 이 카드만 이름을 낸다.
 *
 * 정렬은 협력우선순위(A/B/C)가 먼저, 같으면 오래 조용한 곳부터다. 컨택 기록이
 * 아예 없는 곳이 가장 오래 조용한 곳이라 맨 앞에 온다.
 */
function sinceLabel(date: string | null): string {
  if (date == null) return '컨택 기록 없음';
  const days = Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / 864e5);
  if (Number.isNaN(days)) return date;
  if (days < 0) return `${date} (예정)`;
  if (days < 31) return `${date} (${days}일 전)`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${date} (${months}개월 전)`;
  const [y, m] = [Math.floor(months / 12), months % 12];
  return `${date} (${y}년${m ? ` ${m}개월` : ''} 전)`;
}

export default function FollowUpBlock({ data }: { data: FollowUp }) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>다음 컨택 대상</h2>
        <p>
          협약이 끝나지 않은 기업 중 우선순위가 높고 오래 조용한 곳부터입니다.
          이름을 누르시면 해당 기업으로 이동합니다.
        </p>
      </div>

      {data.total === 0 ? (
        <div className="empty" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>후속 조치가 남은 기업이 없습니다.</div>
      ) : (
        <>
          <div className="dash-metrics" style={{ marginBottom: 18 }}>
            <div>
              <div className="dash-metric-label">컨택 기록 없음</div>
              <div className="dash-metric-value" style={{ color: data.untouched > 0 ? 'var(--red-600)' : 'var(--text-1)' }}>
                {data.untouched}<span className="unit">곳</span>
              </div>
              <div className="dash-metric-sub">후속 대상 {data.total}곳 중</div>
            </div>
            <div>
              <div className="dash-metric-label">반년 넘게 조용</div>
              <div className="dash-metric-value">{data.stale}<span className="unit">곳</span></div>
              <div className="dash-metric-sub">접촉은 했으나 기록이 끊긴 곳</div>
            </div>
          </div>

          {data.rows.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`} className="dash-list-row">
              <span className="name">
                {c.name}
                {c.priority && (
                  <span className="badge" style={{ marginLeft: 6, fontSize: 'calc(11px * var(--fs, 1))' }}>{c.priority}</span>
                )}
              </span>
              <span style={{ fontSize: 'calc(12px * var(--fs, 1))', color: 'var(--text-3)', textAlign: 'right' }}>
                {c.status}
                <br />
                {sinceLabel(c.lastContact)}
              </span>
            </Link>
          ))}

          <div className="dash-note">
            {data.noPriority
              // 우선순위가 비어 있으면 정렬 근거가 '오래 조용한 순' 하나뿐이다.
              // 그 사실을 적어야 목록 순서를 근거로 착각하지 않는다
              ? <>협력우선순위가 기재된 기업이 없어 조용한 기간만으로 정렬했습니다. </>
              : <>협력우선순위 A, B, C 순으로 먼저 정렬합니다. </>}
            <Link href="/companies?status=미접촉" className="text-link">미접촉 기업 전체 보기</Link>
          </div>
        </>
      )}
    </div>
  );
}
