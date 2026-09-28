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

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

const ROWS: {
  key: Exclude<keyof ActivityWeek, 'start'>;
  label: string;
  unit: string;
  last: 'lastCounseling' | 'lastContact' | 'lastCompany';
}[] = [
  { key: 'counselings', label: '상담', unit: '건', last: 'lastCounseling' },
  { key: 'contacts', label: '컨택', unit: '건', last: 'lastContact' },
  { key: 'companies', label: '기업 등록', unit: '곳', last: 'lastCompany' },
];

const lastOf = (l: LastInput) => (l ? `마지막 입력 ${ago(l.at)}${l.by ? `, ${l.by}` : ''}` : '입력된 기록 없음');

/**
 * 사용자 활동. 사용자가 몇 명뿐이라 접속자 수보다 기록이 계속 쌓이고 있는지가
 * 중요한 신호다. 입력이 몇 주째 0 이면 그게 이 카드에서 제일 먼저 보여야 한다.
 *
 * 상담, 컨택, 기업을 한 차트에 겹치지 않고 줄마다 따로 그린다. 기업은 엑셀로
 * 수십 곳이 한 번에 들어오는 주가 있어서, 눈금을 같이 쓰면 상담 막대가 바닥에 붙는다.
 * 줄이 나뉘어 있으니 색으로 계열을 가를 필요도 없어 한 색만 쓴다.
 */
export default function ActivityBlock({ a }: { a: UserActivity }) {
  const n = a.weeks.length;

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>사용자 활동</h2>
        <p>
          시스템이 실제로 쓰이고 있는지 봅니다. 입력 건수는 상담일, 컨택일이 아니라
          기록을 입력한 날 기준이고, 기업은 엑셀로 한꺼번에 등록한 것도 포함합니다.
        </p>
      </div>

      <div className="dash-metrics" style={{ marginBottom: 8 }}>
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
      </div>

      {ROWS.map((r, ri) => {
        const vals = a.weeks.map((w) => w[r.key]);
        const max = Math.max(1, ...vals);
        return (
          <div key={r.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '10px 24px', padding: '16px 0 14px', borderTop: '1px solid var(--border)' }}>
            <div style={{ width: 200 }}>
              <div className="dash-metric-label">이번 주 {r.label}</div>
              <div className="dash-metric-value"><CountUp end={vals[n - 1]} /><span className="unit">{r.unit}</span></div>
              <div className="dash-metric-sub">지난주 {vals[n - 2]}{r.unit}, {lastOf(a[r.last])}</div>
            </div>
            <div style={{ flex: '1 1 240px' }}>
              <div
                role="img"
                aria-label={`최근 12주 주별 ${r.label}. 이번 주 ${vals[n - 1]}${r.unit}, 지난주 ${vals[n - 2]}${r.unit}`}
                style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, alignItems: 'end', height: 48 }}
              >
                {a.weeks.map((w, i) => (
                  <span
                    key={w.start}
                    title={`${md(w.start)} 주: ${w[r.key]}${r.unit}`}
                    style={{
                      height: `${(w[r.key] / max) * 100}%`, minHeight: w[r.key] > 0 ? 2 : 0,
                      borderRadius: 2, background: 'var(--chart-1)',
                      // 이번 주는 아직 안 끝났다. 흐리게 두지 않으면 월요일마다 입력이 급감한 것으로 보인다
                      opacity: i === n - 1 ? 0.45 : 1,
                    }}
                  />
                ))}
              </div>
              {/* 주 날짜는 맨 아래 줄에만. 줄마다 막대 폭이 같아 위 줄과도 맞는다 */}
              {ri === ROWS.length - 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 4, marginTop: 6 }}>
                  {a.weeks.map((w, i) => (
                    <span key={w.start} style={{ fontSize: 'calc(11px * var(--fs, 1))', color: 'var(--text-3)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {i % 2 === 1 ? md(w.start) : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="dash-note">
        막대는 최근 12주 주별 입력이고 날짜는 그 주 월요일입니다. 줄마다 눈금이 달라
        줄끼리 막대 높이를 비교하면 안 됩니다. 마지막 칸은 진행 중인 이번 주라 흐리게 표시했습니다.
      </div>
    </div>
  );
}
