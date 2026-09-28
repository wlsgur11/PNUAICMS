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

type Key = Exclude<keyof ActivityWeek, 'start'>;

const INPUTS: { key: Key; label: string; unit: string; last: 'lastCounseling' | 'lastContact' | 'lastCompany' }[] = [
  { key: 'counselings', label: '상담', unit: '건', last: 'lastCounseling' },
  { key: 'contacts', label: '컨택', unit: '건', last: 'lastContact' },
  { key: 'companies', label: '기업 등록', unit: '곳', last: 'lastCompany' },
];

const lastOf = (l: LastInput) => (l ? `마지막 입력 ${ago(l.at)}${l.by ? `, ${l.by}` : ''}` : '입력된 기록 없음');

/**
 * 최근 12주 주별 막대. 폭을 제한한다. 카드가 화면 전체 폭이라 칸에 맞춰 늘리면
 * 막대 하나가 100px 을 넘는 벽돌이 되고, 입력이 드문 지금은 그 벽돌 하나만 떠 보인다.
 * 입력이 없는 주도 회색 짧은 막대로 남겨 12주가 이어진 흐름으로 읽히게 한다.
 */
function Spark({ weeks, k, label, unit }: { weeks: ActivityWeek[]; k: Key; label: string; unit: string }) {
  const n = weeks.length;
  const max = Math.max(1, ...weeks.map((w) => w[k]));
  return (
    <div style={{ maxWidth: 260, margin: '12px 0 10px' }}>
      <div
        role="img"
        aria-label={`최근 12주 주별 ${label}. 이번 주 ${weeks[n - 1][k]}${unit}, 지난주 ${weeks[n - 2][k]}${unit}`}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 3, alignItems: 'end', height: 40 }}
      >
        {weeks.map((w, i) => {
          const v = w[k];
          return (
            <span
              key={w.start}
              title={`${md(w.start)} 주: ${v}${unit}`}
              style={{
                height: v > 0 ? `${(v / max) * 100}%` : 2,
                minHeight: v > 0 ? 3 : undefined,
                borderRadius: 1,
                background: v > 0 ? 'var(--chart-1)' : 'var(--border)',
                // 이번 주는 아직 안 끝났다. 흐리게 두지 않으면 월요일마다 입력이 급감한 것으로 보인다
                opacity: i === n - 1 ? 0.45 : 1,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 'calc(11px * var(--fs, 1))', color: 'var(--text-3)' }}>
        <span>{md(weeks[0].start)}</span>
        <span>이번 주</span>
      </div>
    </div>
  );
}

const inline = { display: 'flex', alignItems: 'baseline', gap: 8 } as const;
const inlineNum = { fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 600, color: 'var(--text-1)' } as const;

/**
 * 사용자 활동. 입력 세 칸이 주인공이다. 사용자가 몇 명뿐이라 접속자 수는 맥락이고,
 * 기록이 계속 쌓이고 있는지가 중요한 신호다. 입력이 몇 주째 0 이면 그게 먼저 보여야 한다.
 *
 * 접속 두 값까지 같은 크기의 칸으로 두면 다섯 칸이 되어, 1280 노트북에서 4+1 로
 * 기업 등록 칸만 아랫줄에 떨어졌다. 입력 세 칸만 두면 노트북에서도 한 줄에 들어간다.
 *
 * 입력 칸마다 눈금을 따로 잡는다. 기업은 엑셀로 수십 곳이 한 번에 들어오는 주가 있어서,
 * 눈금을 같이 쓰면 상담 막대가 바닥에 붙는다.
 */
export default function ActivityBlock({ a }: { a: UserActivity }) {
  const n = a.weeks.length;

  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>사용자 활동</h2>
        <p>
          시스템이 실제로 쓰이고 있는지 봅니다. 입력은 상담일, 컨택일이 아니라 기록을 입력한 날
          기준이고, 기업은 엑셀로 한꺼번에 등록한 것도 포함합니다.
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
            <div className="dash-metric-value"><CountUp end={a.weeks[n - 1][r.key]} /><span className="unit">{r.unit}</span></div>
            {/* 막대를 숫자 바로 아래에 둔다. 보조 문구는 칸마다 줄 수가 달라 그 아래에 두면 막대 높이가 어긋난다 */}
            <Spark weeks={a.weeks} k={r.key} label={r.label} unit={r.unit} />
            <div className="dash-metric-sub">지난주 {a.weeks[n - 2][r.key]}{r.unit}</div>
            <div className="dash-metric-sub">{lastOf(a[r.last])}</div>
          </div>
        ))}
      </div>

      <div className="dash-note">
        막대는 최근 12주 주별 입력입니다. 칸마다 눈금이 달라 칸끼리 막대 높이를 비교하면 안 됩니다.
        회색은 입력이 없던 주, 흐린 마지막 막대는 진행 중인 이번 주입니다.
      </div>
    </div>
  );
}
