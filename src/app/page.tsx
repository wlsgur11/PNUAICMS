'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import HistoryDetailModal, { type HistoryDetail } from '@/components/HistoryDetailModal';

type RecentHistory = { id: string; companyName: string; professor: string; contactDate: string; method: string; content: string; histStatus: string };
type Dashboard = {
  totalCount: number;
  internshipCount: number;
  employmentCount: number;
  industryProjectCount: number;
  mouCount: number;
  projectTotal: number;
  internshipTotal: number;
  studentTotal: number;
  partnerCompanyTotal: number;
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

/** 단일 지표(산학협력·인턴십)의 연도별 달성률 추이 막대그래프. 막대=달성률, 검정 점선=목표치. */
function MetricTrend({ title, color, data }: { title: string; color: string; data: { year: number; actual: number | null; target: number | null }[] }) {
  const series = [...data].sort((a, b) => a.year - b.year);
  // 달성률·목표치 모두 축 범위에 반영 (목표선이 잘리지 않도록)
  const vals = series.flatMap((d) => [d.actual ?? 0, d.target ?? 0]);
  const axisMax = Math.max(0.01, ...vals) * 1.18;

  const W = 520, H = 260, padL = 48, padR = 20, padT = 22, padB = 46;
  const plotW = W - padL - padR, plotH = H - padT - padB, baseY = padT + plotH;
  const groupW = plotW / Math.max(1, series.length);
  const barW = Math.min(96, groupW - 40);
  const yOf = (v: number) => padT + plotH * (1 - v / axisMax);
  const ticks = [0, axisMax / 2, axisMax];

  return (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <div className="card-title"><span className="accent-bar" />{title} 달성률</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>
          <svg width={22} height={8}><line x1={0} y1={4} x2={22} y2={4} stroke="#1f2937" strokeWidth={1.5} strokeDasharray="4 3" /></svg>
          목표치
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* y축 눈금선 + 라벨 */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={yOf(t)} x2={W - padR} y2={yOf(t)} stroke="var(--slate-100)" strokeWidth={1} />
            <text x={padL - 10} y={yOf(t) + 4} textAnchor="end" fontSize={13} fill="var(--slate-400)">
              {(t * 100).toFixed(t < 0.1 ? 1 : 0)}%
            </text>
          </g>
        ))}
        {/* 막대 + 값 라벨 + 목표선 + 연도 라벨 */}
        {series.map((d, i) => {
          const v = d.actual ?? 0;
          const tv = d.target ?? 0;
          const x = padL + i * groupW + (groupW - barW) / 2;
          const y = yOf(v);
          return (
            <g key={d.year}>
              <rect x={x} y={y} width={barW} height={baseY - y} rx={4} fill={color} />
              {tv > 0 && (
                <line x1={x - 6} y1={yOf(tv)} x2={x + barW + 6} y2={yOf(tv)} stroke="#1f2937" strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              <text x={x + barW / 2} y={y - 7} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
                {(v * 100).toFixed(2)}%
              </text>
              <text x={x + barW / 2} y={baseY + 22} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--slate-600)">
                {d.year}
              </text>
              {tv > 0 && (
                <text x={x + barW / 2} y={baseY + 38} textAnchor="middle" fontSize={11} fill="var(--slate-400)">목표 {(tv * 100).toFixed(1)}%</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error } = useSWR<Dashboard>('/api/dashboard');
  const { data: yearStats } = useSWR<YearStat[]>('/api/year-stats');
  const [selected, setSelected] = useState<HistoryDetail | null>(null);
  // 'all' = 연도별 추이 그래프 / 숫자 = 해당 연도 목표·달성 게이지
  const [view, setView] = useState<'all' | number>('all');

  const years = (yearStats ?? []).map((y) => y.year);
  const cur = typeof view === 'number' ? (yearStats ?? []).find((y) => y.year === view) ?? null : null;

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
              <button className={`btn btn-sm${view === 'all' ? ' btn-primary' : ''}`} onClick={() => setView('all')}>전체</button>
              {years.map((y) => (
                <button key={y} className={`btn btn-sm${view === y ? ' btn-primary' : ''}`} onClick={() => setView(y)}>{y}</button>
              ))}
            </div>
          </div>

          <div className="muted" style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
            ※ CMS가 자체 추적하는 산학·인턴십 정량실적입니다 (SW중심대학 성과 탭의 공식 평가지표와는 별개 자료). 일부 과거 연도에서 산학협력 달성이 0%로 보이는 것은 원본(4차연도 현황) 엑셀에 해당 연도 값이 비어 있어서이며, 실제 미달성이 아닙니다.
          </div>

          {view === 'all' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
                {[
                  { label: '누적 산학협력', value: data.projectTotal, unit: '건' },
                  { label: '누적 인턴십', value: data.internshipTotal, unit: '건' },
                  { label: '참여 학생', value: data.studentTotal, unit: '명' },
                  { label: '참여 기업', value: data.partnerCompanyTotal, unit: '개' },
                ].map((t) => (
                  <div key={t.label} style={{ padding: '14px 18px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-100)' }}>
                    <div className="stat-label">{t.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>
                      {t.value ?? '-'}<span style={{ fontSize: 13, fontWeight: 500, marginLeft: 2, color: 'var(--slate-500)' }}>{t.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
                <MetricTrend
                  title="산학협력"
                  color="var(--indigo-600)"
                  data={yearStats.map((y) => ({ year: y.year, actual: y.industryAchievedRatio, target: y.industryTargetRatio }))}
                />
                <MetricTrend
                  title="인턴십"
                  color="#0ea5e9"
                  data={yearStats.map((y) => ({ year: y.year, actual: y.internshipAchievedRatio, target: y.internshipTargetRatio }))}
                />
              </div>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* 기업 관계 현황 (클릭 시 조건 적용된 기업 리스트로 이동) */}
      <div className="stats-grid">
        {[
          { label: '관리중인 총 기업', value: data.totalCount, icon: '🏢', tone: 'indigo', href: '/companies' },
          { label: '인턴십 가능 기업', value: data.internshipCount, icon: '🎓', tone: 'blue', href: '/companies?internship=1' },
          { label: '산학프로젝트 가능 기업', value: data.industryProjectCount, icon: '🔬', tone: 'green', href: '/companies?industryProject=1' },
          { label: 'MOU 체결 완료', value: data.mouCount, icon: '🤝', tone: 'amber', href: '/companies?mou=1' },
          { label: '관리 학생', value: data.studentTotal, icon: '🧑‍🎓', tone: 'indigo', href: '/students' },
        ].map((s) => (
          <Link className="stat-card stat-card-link" key={s.label} href={s.href}>
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-meta">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </Link>
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
