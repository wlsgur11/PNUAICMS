'use client';

import Link from 'next/link';
import CountUp from '@/components/CountUp';
import type { UserActivity } from '@/lib/dashboard-shape';

/** 달력 날짜로 며칠 전인지. 어제 밤에 적은 것을 아침에 보면 '어제' 여야 한다 */
function ago(iso: string) {
  const d = new Date(iso), now = new Date();
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 864e5,
  );
  return days <= 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`;
}

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

const SERIES = [
  { key: 'counselings', label: '상담', color: 'var(--chart-1)' },
  { key: 'contacts', label: '컨택', color: 'var(--chart-2)' },
] as const;

/**
 * 사용자 활동. 사용자가 몇 명뿐이라 접속자 수보다 기록이 계속 쌓이고 있는지가
 * 중요한 신호다. 입력이 몇 주째 0 이면 그게 이 카드에서 제일 먼저 보여야 한다.
 */
export default function ActivityBlock({ a }: { a: UserActivity }) {
  const cur = a.weeks[a.weeks.length - 1];
  const prev = a.weeks[a.weeks.length - 2];
  const max = Math.max(1, ...a.weeks.flatMap((w) => [w.counselings, w.contacts]));
  const lastOf = (l: UserActivity['lastCounseling']) =>
    l ? `마지막 입력 ${ago(l.at)}${l.by ? `, ${l.by}` : ''}` : '입력된 기록 없음';

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>사용자 활동</h2>
        <p>
          시스템이 실제로 쓰이고 있는지 봅니다. 입력 건수는 상담일, 컨택일이 아니라
          기록을 입력한 날 기준입니다.
        </p>
      </div>

      <div className="dash-metrics" style={{ marginBottom: 22 }}>
        {a.pendingUsers != null && (
          <div>
            <div className="dash-metric-label">권한 대기</div>
            <div className="dash-metric-value" style={{ color: a.pendingUsers > 0 ? 'var(--red-600)' : 'var(--text-1)' }}>
              <CountUp end={a.pendingUsers} /><span className="unit">명</span>
            </div>
            <div className="dash-metric-sub">
              {a.pendingUsers > 0
                ? <Link href="/admin/users" className="text-link">사용자 관리에서 승인</Link>
                : '승인을 기다리는 계정 없음'}
            </div>
          </div>
        )}
        <div>
          <div className="dash-metric-label">최근 7일 접속</div>
          <div className="dash-metric-value"><CountUp end={a.activeUsers7d} /><span className="unit">명</span></div>
          <div className="dash-metric-sub">권한 있는 계정 {a.totalUsers}명</div>
        </div>
        <div>
          <div className="dash-metric-label">이번 주 상담 입력</div>
          <div className="dash-metric-value"><CountUp end={cur.counselings} /><span className="unit">건</span></div>
          <div className="dash-metric-sub">지난주 {prev.counselings}건, {lastOf(a.lastCounseling)}</div>
        </div>
        <div>
          <div className="dash-metric-label">이번 주 컨택 입력</div>
          <div className="dash-metric-value"><CountUp end={cur.contacts} /><span className="unit">건</span></div>
          <div className="dash-metric-sub">지난주 {prev.contacts}건, {lastOf(a.lastContact)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
        <div className="dash-metric-label" style={{ marginBottom: 0 }}>주별 입력 (최근 12주)</div>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'calc(12px * var(--fs, 1))', color: 'var(--text-2)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />{s.label}
          </span>
        ))}
      </div>
      <div
        role="img"
        aria-label={`최근 12주 주별 입력. 이번 주 상담 ${cur.counselings}건, 컨택 ${cur.contacts}건`}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${a.weeks.length}, 1fr)`, gap: 6 }}
      >
        {a.weeks.map((w, i) => (
          <div key={w.start} title={`${md(w.start)} 주: 상담 ${w.counselings}건, 컨택 ${w.contacts}건`}>
            {/* 이번 주는 아직 안 끝났다. 흐리게 두지 않으면 월요일마다 입력이 급감한 것으로 보인다 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, opacity: i === a.weeks.length - 1 ? 0.5 : 1 }}>
              {SERIES.map((s) => (
                <span key={s.key} style={{
                  flex: 1, borderRadius: 2, background: s.color,
                  height: `${(w[s.key] / max) * 100}%`, minHeight: w[s.key] > 0 ? 2 : 0,
                }} />
              ))}
            </div>
            <div style={{ fontSize: 'calc(11px * var(--fs, 1))', color: 'var(--text-3)', textAlign: 'center', marginTop: 4, height: 14 }}>
              {i % 2 === 1 ? md(w.start) : ''}
            </div>
          </div>
        ))}
      </div>
      <div className="dash-note">
        날짜는 그 주 월요일입니다. 마지막 칸은 진행 중인 이번 주라 흐리게 표시했습니다.
      </div>
    </div>
  );
}
