'use client';

import Link from 'next/link';
import CountUp from '@/components/CountUp';
import type { ActivityWeek, LastInput, UserActivity } from '@/lib/dashboard-shape';

/** 달력 날짜로 며칠 전인지. 어제 밤에 적은 것을 아침에 보면 '어제' 여야 한다 */
function ago(iso: string) {
  const d = new Date(iso), now = new Date();
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 864e5,
  );
  return days <= 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`;
}

type Key = Exclude<keyof ActivityWeek, 'start'>;

const INPUTS: { key: Key; label: string; unit: string; last: 'lastCounseling' | 'lastContact' | 'lastCompany' }[] = [
  { key: 'counselings', label: '상담', unit: '건', last: 'lastCounseling' },
  { key: 'contacts', label: '컨택', unit: '건', last: 'lastContact' },
  { key: 'companies', label: '기업 등록', unit: '곳', last: 'lastCompany' },
];

const lastOf = (l: LastInput) => (l ? `마지막 입력 ${ago(l.at)}${l.by ? `, ${l.by}` : ''}` : '입력된 기록 없음');

const inline = { display: 'flex', alignItems: 'baseline', gap: 8 } as const;
const inlineNum = { fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 600, color: 'var(--text-1)' } as const;

/**
 * 사용자 활동. 입력 세 칸이 주인공이다. 사용자가 몇 명뿐이라 접속자 수는 맥락이고,
 * 기록이 계속 쌓이고 있는지가 중요한 신호다.
 *
 * 주별 막대를 붙였다가 뺐다. 입력이 드문 지금은 12주 중 한 주만 막대가 서서 숫자 이상을
 * 말해 주지 못했다. 지난주 숫자와 마지막 입력일이면 끊겼는지는 충분히 보인다.
 *
 * 접속 두 값까지 같은 크기의 칸으로 두면 다섯 칸이 되어, 1280 노트북에서 4+1 로
 * 기업 등록 칸만 아랫줄에 떨어졌다. 그래서 위쪽 한 줄로 따로 둔다.
 */
export default function ActivityBlock({ a }: { a: UserActivity }) {
  const [prev, cur] = a.weeks;

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>사용자 활동</h2>
        <p>
          시스템이 실제로 쓰이고 있는지 봅니다. 입력은 상담일, 컨택일이 아니라 기록을 입력한 날
          기준이고 이번 주는 월요일부터 셉니다. 기업은 엑셀로 한꺼번에 등록한 것도 포함합니다.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 36px', marginBottom: 18 }}>
        {a.pendingUsers != null && (
          <div style={inline}>
            <span className="dash-metric-label" style={{ marginBottom: 0 }}>권한 대기</span>
            <span className="dash-num" style={{ ...inlineNum, color: a.pendingUsers > 0 ? 'var(--red-600)' : 'var(--text-1)' }}>
              {a.pendingUsers}명
            </span>
            {a.pendingUsers > 0 && (
              <Link href="/admin/users" className="text-link" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>사용자 관리에서 승인</Link>
            )}
          </div>
        )}
        <div style={inline}>
          <span className="dash-metric-label" style={{ marginBottom: 0 }}>최근 7일 접속</span>
          <span className="dash-num" style={inlineNum}>{a.activeUsers7d}명</span>
          <span className="dash-metric-sub" style={{ marginTop: 0 }}>권한 있는 계정 {a.totalUsers}명 중</span>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px 28px',
        borderTop: '1px solid var(--border)', paddingTop: 18,
      }}>
        {INPUTS.map((r) => (
          <div key={r.key}>
            <div className="dash-metric-label">이번 주 {r.label}</div>
            <div className="dash-metric-value"><CountUp end={cur[r.key]} /><span className="unit">{r.unit}</span></div>
            <div className="dash-metric-sub">지난주 {prev[r.key]}{r.unit}</div>
            <div className="dash-metric-sub" style={{ marginTop: 2 }}>{lastOf(a[r.last])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
