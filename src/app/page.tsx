'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import HistoryDetailModal, { type HistoryDetail } from '@/components/HistoryDetailModal';

type RecentHistory = { id: string; companyName: string; professor: string; contactDate: string; method: string; content: string; histStatus: string };
type Dashboard = {
  totalCount: number;
  internshipCount: number;
  employmentCount: number;
  mouCount: number;
  regionCount: Record<string, number>;
  recentHistories: RecentHistory[];
};
type YearStat = {
  year: number;
  enrolledCSE: number | null; enrolledDS: number | null;
  industryTargetCSE: number | null; industryTargetDS: number | null;
  internTargetCSE: number | null; internTargetDS: number | null;
  industryTargetRatio: number | null; industryAchievedRatio: number | null; industryStudents: number | null;
  internshipTargetRatio: number | null; internshipAchievedRatio: number | null; internshipStudents: number | null;
};

const pct = (n: number | null) => (n == null ? '-' : `${(n * 100).toFixed(1)}%`);

/** 목표 기준치 인원 요약 (재학생 / 목표 인원) */
function BaselineRow({ label, cse, ds }: { label: string; cse: number | null; ds: number | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span className="stat-label" style={{ minWidth: 96 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>정컴 {cse ?? '-'}</span>
      <span className="muted">·</span>
      <span style={{ fontWeight: 700 }}>DS {ds ?? '-'}</span>
    </div>
  );
}

/** 원형 게이지 (목표 대비 달성률) */
function Gauge({ percent, color }: { percent: number; color: string }) {
  const r = 52, circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.min(100, Math.max(0, percent)) / 100);
  return (
    <svg width={132} height={132} viewBox="0 0 132 132" style={{ flexShrink: 0 }}>
      <circle cx={66} cy={66} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={13} />
      <circle
        cx={66} cy={66} r={r} fill="none" stroke={color} strokeWidth={13} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 66 66)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={66} y={62} textAnchor="middle" fontSize={28} fontWeight={800} fill={color}>{Math.round(percent)}%</text>
      <text x={66} y={84} textAnchor="middle" fontSize={12} fill="var(--slate-400)">목표 대비</text>
    </svg>
  );
}

/** 목표 대비 달성 카드 (원형 게이지 + 수치, 목표 달성 시 초록 강조) */
function MetricCard({ title, target, achieved, students }: { title: string; target: number | null; achieved: number | null; students: number | null }) {
  const ratio = target && target > 0 && achieved != null ? (achieved / target) * 100 : 0;
  const met = target != null && achieved != null && achieved >= target;
  const accent = met ? '#16a34a' : 'var(--indigo-600)';
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="card-title"><span className="accent-bar" />{title}</div>
        {met && <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>✓ 목표 달성</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, margin: 'auto 0', padding: '6px 0' }}>
        <Gauge percent={ratio} color={accent} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div className="stat-label">목표</div><div style={{ fontSize: 22, fontWeight: 700 }}>{pct(target)}</div></div>
          <div><div className="stat-label">달성</div><div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{pct(achieved)}</div></div>
          <div><div className="stat-label">참여 학부생</div><div style={{ fontSize: 22, fontWeight: 700 }}>{students ?? '-'}<span style={{ fontSize: 13, fontWeight: 400 }}>명</span></div></div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error } = useSWR<Dashboard>('/api/dashboard');
  const { data: yearStats } = useSWR<YearStat[]>('/api/year-stats');
  const [selected, setSelected] = useState<HistoryDetail | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const years = (yearStats ?? []).map((y) => y.year);
  const activeYear = year ?? years[0] ?? null;
  const cur = (yearStats ?? []).find((y) => y.year === activeYear) ?? null;

  if (error) return (<><PageHeader title="시스템 대시보드" /><div className="card empty">불러오기 실패: {(error as Error).message}</div></>);
  if (!data) return (<><PageHeader title="시스템 대시보드" /><div className="loading">불러오는 중…</div></>);

  return (
    <>
      <PageHeader title="시스템 대시보드" />

      {/* 정량실적 현황판 (엑셀 전체현황 기반) */}
      {yearStats && yearStats.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div className="card-title"><span className="accent-bar" />정량실적 현황판</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {years.map((y) => (
                <button key={y} className={`btn btn-sm${y === activeYear ? ' btn-primary' : ''}`} onClick={() => setYear(y)}>{y}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            {cur && (
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', padding: '12px 16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <BaselineRow label="SW학과 재학생" cse={cur.enrolledCSE} ds={cur.enrolledDS} />
                <BaselineRow label="산학 목표인원" cse={cur.industryTargetCSE} ds={cur.industryTargetDS} />
                <BaselineRow label="인턴십 목표인원" cse={cur.internTargetCSE} ds={cur.internTargetDS} />
              </div>
            )}
            <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              <MetricCard title="산학협력 프로젝트" target={cur?.industryTargetRatio ?? null} achieved={cur?.industryAchievedRatio ?? null} students={cur?.industryStudents ?? null} />
              <MetricCard title="인턴십" target={cur?.internshipTargetRatio ?? null} achieved={cur?.internshipAchievedRatio ?? null} students={cur?.internshipStudents ?? null} />
            </div>
          </div>
        </div>
      )}

      {/* 기업 관계 현황 */}
      <div className="stats-grid">
        {[
          { label: '관리중인 총 기업', value: data.totalCount, icon: '🏢', tone: 'indigo' },
          { label: '인턴십 가능 기업', value: data.internshipCount, icon: '🎓', tone: 'blue' },
          { label: '채용연계 가능 기업', value: data.employmentCount, icon: '💼', tone: 'green' },
          { label: 'MOU 체결 완료', value: data.mouCount, icon: '🤝', tone: 'amber' },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-meta">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><div className="card-title"><span className="accent-bar" />최근 컨택 이력</div></div>
        {data.recentHistories.length === 0 ? (
          <div className="empty">컨택 이력이 없습니다.</div>
        ) : (
          <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--slate-200)' }}>
            <table className="data-table">
              <thead><tr><th>기업명</th><th>일자</th><th>상태</th><th>내용</th></tr></thead>
              <tbody>
                {data.recentHistories.map((h) => (
                  <tr key={h.id} className="row-click" onClick={() => setSelected({ ...h, personName: null })}>
                    <td style={{ fontWeight: 700 }}>{h.companyName}</td>
                    <td>{h.contactDate}</td>
                    <td><span className={`tag ${h.histStatus === '진행완료' ? 'tag-green' : 'tag-indigo'}`}>{h.histStatus}</span></td>
                    <td className="muted"><span className="ellipsis">{h.content || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HistoryDetailModal history={selected} onClose={() => setSelected(null)} />
    </>
  );
}
