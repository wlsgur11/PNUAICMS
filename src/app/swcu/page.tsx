'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';

type Indicator = {
  area: string | null; name: string; unit: string | null;
  target: number | null; actual: number | null;
  verifiedActual: number | null; verifyResult: string | null; sortOrder: number;
  formula: string | null; numLabel: string | null; numValue: number | null;
  denLabel: string | null; denValue: number | null;
};
type Raw = { scope: string; category: string | null; label: string; value: number | null; sortOrder: number };
type YearData = { year: number; university: string | null; submittedAt: string | null; indicators: Indicator[]; raws: Raw[] };

const fmt = (n: number | null, unit: string | null) => {
  if (n == null) return '-';
  if (unit === '%') return (n * 100).toFixed(1) + '%';
  return String(Math.round(n * 100) / 100);
};

// 낮을수록 좋은 지표 (목표 이하면 달성)
const LOWER_BETTER = new Set<string>(['참여학과 교원 1인당 학생수']);

// 핵심 차트로 띄울 지표 (title=표시명, name=파서 CANONICAL_NAMES와 정확히 일치)
const KEY: { title: string; name: string }[] = [
  { title: '산학협력 프로젝트 참여율', name: '산학협력 프로젝트 참여율' },
  { title: '인턴십 이수율', name: '인턴십 이수율' },
  { title: 'SW전공생 취업률', name: '취업률' },
  { title: '수혜학생 만족도', name: '수혜학생 만족도' },
];

/** 지표 하나의 연도별 추이 막대 (목표선 포함) */
function KpiTrend({ title, years, indicatorName }: { title: string; years: YearData[]; indicatorName: string }) {
  const series = years.map((y) => {
    const ind = y.indicators.find((i) => i.name === indicatorName);
    return { year: y.year, actual: ind?.actual ?? null, target: ind?.target ?? null, unit: ind?.unit ?? null };
  });
  const unit = series.find((s) => s.unit)?.unit ?? null;
  const vals = series.flatMap((s) => [s.actual ?? 0, s.target ?? 0]);
  const axisMax = Math.max(0.0001, ...vals) * 1.18;
  const W = 360, H = 180, padL = 40, padR = 12, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB, baseY = padT + plotH;
  const gw = plotW / Math.max(1, series.length);
  const bw = Math.min(48, gw - 24);
  const yOf = (v: number) => padT + plotH * (1 - v / axisMax);
  return (
    <div className="card" style={{ padding: 16, height: '100%' }}>
      <div className="card-title" style={{ marginBottom: 8 }}><span className="accent-bar" />{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke="var(--slate-200)" />
        {series.map((s, i) => {
          const x = padL + i * gw + (gw - bw) / 2;
          const y = s.actual == null ? baseY : yOf(s.actual);
          const barColor =
            s.actual != null && s.target != null && s.actual >= s.target
              ? '#16a34a'
              : 'var(--indigo-600)';
          return (
            <g key={s.year}>
              <rect x={x} y={y} width={bw} height={baseY - y} rx={3} fill={barColor} />
              {s.target != null && <line x1={x - 4} y1={yOf(s.target)} x2={x + bw + 4} y2={yOf(s.target)} stroke="#1f2937" strokeWidth={1.5} />}
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={barColor}>{fmt(s.actual, unit)}</text>
              <text x={x + bw / 2} y={baseY + 18} textAnchor="middle" fontSize={12} fill="var(--slate-600)">{s.year}</text>
            </g>
          );
        })}
      </svg>
      <div className="muted" style={{ fontSize: 12 }}>막대=실적(초록=목표 달성), 가는 검정선=목표</div>
    </div>
  );
}

export default function SwcuDashboardPage() {
  const { data, error } = useSWR<YearData[]>('/api/swcu');
  const [rawYear, setRawYear] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (error) return (<><PageHeader title="SW중심대학 성과" /><div className="card empty">불러오기 실패</div></>);
  if (!data) return (<><PageHeader title="SW중심대학 성과" /><div className="loading">불러오는 중…</div></>);
  if (data.length === 0) return (<><PageHeader title="SW중심대학 성과" /><div className="card empty">아직 적재된 실적이 없습니다. ‘실적 엑셀 업로드’에서 연차 파일을 올려주세요.</div></>);

  const years = data;
  const nameOrder: string[] = [];
  const areaOf: Record<string, string | null> = {};
  for (const y of years) for (const i of y.indicators) {
    if (!(i.name in areaOf)) { nameOrder.push(i.name); areaOf[i.name] = i.area; }
  }
  const unitOf: Record<string, string | null> = {};
  for (const y of years) for (const i of y.indicators) if (i.unit) unitOf[i.name] = i.unit;
  const valOf = (y: YearData, name: string) => y.indicators.find((i) => i.name === name) ?? null;

  const activeRawYear = rawYear ?? years[years.length - 1].year;
  const rawData = years.find((y) => y.year === activeRawYear);

  return (
    <>
      <PageHeader title="SW중심대학 성과" />

      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 16 }}>
        {KEY.map((k) => <KpiTrend key={k.name} title={k.title} years={years} indicatorName={k.name} />)}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><div className="card-title"><span className="accent-bar" />성과지표 성적표 (목표 / 실적)</div></div>
        <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--slate-200)', overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: 'var(--slate-50)' }}>지표</th>
                {years.map((y) => <th key={y.year} className="center">{y.year}</th>)}
              </tr>
            </thead>
            <tbody>
              {nameOrder.map((name) => (
                <Fragment key={name}>
                <tr>
                  <td
                    onClick={() => setExpanded(expanded === name ? null : name)}
                    style={{ position: 'sticky', left: 0, background: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <span className="muted" style={{ fontWeight: 400, marginRight: 4 }}>{expanded === name ? '▾' : '▸'}</span>
                    {name}{unitOf[name] ? <span className="muted" style={{ fontWeight: 400 }}> ({unitOf[name]})</span> : ''}
                  </td>
                  {years.map((y) => {
                    const ind = valOf(y, name);
                    if (!ind || ind.actual == null) return <td key={y.year} className="center muted">-</td>;
                    const normTarget = ind.target != null && unitOf[name] === '점' && ind.target > 0 && ind.target < 1 ? ind.target * 100 : ind.target;
                    const met = normTarget != null && ind.actual != null &&
                      (LOWER_BETTER.has(name) ? ind.actual <= normTarget : ind.actual >= normTarget);
                    return (
                      <td key={y.year} className="center">
                        <span style={{ fontWeight: 700, color: met ? '#16a34a' : 'inherit' }}>
                          {fmt(ind.actual, unitOf[name])}
                        </span>
                        {normTarget != null && <span className="muted" style={{ fontSize: 11, display: 'block' }}>목표 {fmt(normTarget, unitOf[name])}</span>}
                        {ind.verifyResult && (
                          <span className="muted" style={{ fontSize: 11, display: 'block' }} title="KMAC 평가기관 검증 결과 (O=통과, X=보완 요청)">
                            검증 {fmt(ind.verifiedActual, unitOf[name])} <span className={`tag ${ind.verifyResult === 'O' ? 'tag-green' : 'tag-indigo'}`} style={{ fontSize: 10 }}>{ind.verifyResult}</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {expanded === name && (
                  <tr>
                    <td colSpan={years.length + 1} style={{ background: 'var(--slate-50)', padding: '12px 16px' }}>
                      {years.map((y) => {
                        const ind = valOf(y, name);
                        if (!ind || (!ind.formula && ind.numValue == null)) return null;
                        const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
                        return (
                          <div key={y.year} style={{ marginBottom: 8, fontSize: 13 }}>
                            <strong>{y.year}</strong>
                            {ind.numValue != null && (
                              <span className="muted"> · 분자 {norm(ind.numLabel)} = {ind.numValue} / 분모 {norm(ind.denLabel)} = {ind.denValue}</span>
                            )}
                            {ind.formula && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{norm(ind.formula)}</div>}
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>지표명을 클릭하면 산출 근거를 볼 수 있습니다. 초록=목표 달성(교원 1인당 학생수처럼 낮을수록 좋은 지표는 목표 이하면 달성). 'KMAC 검증'은 평가기관(KMAC) 검증 결과로, O=통과·X=보완 요청을 뜻합니다 (2025년부터).</div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="accent-bar" />총괄 원시값 (자세히 보기)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {years.map((y) => (
              <button key={y.year} className={`btn btn-sm${y.year === activeRawYear ? ' btn-primary' : ''}`} onClick={() => setRawYear(y.year)}>{y.year}</button>
            ))}
          </div>
        </div>
        {!rawData || rawData.raws.length === 0 ? (
          <div className="empty">원시값이 없습니다.</div>
        ) : (
          <div className="table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--slate-200)', maxHeight: 420, overflow: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>항목</th><th className="center">값</th></tr></thead>
              <tbody>
                {(() => {
                  let prevKey: string | null = null;
                  const rows: React.ReactNode[] = [];
                  rawData.raws.forEach((r, idx) => {
                    const groupKey = `${r.scope} ${r.category ?? ''}`;
                    if (groupKey !== prevKey) {
                      prevKey = groupKey;
                      rows.push(
                        <tr key={`h-${idx}`}>
                          <td colSpan={2} style={{ background: 'var(--slate-50)', fontWeight: 700 }}>
                            {r.scope}{r.category ? ` · ${r.category}` : ''}
                          </td>
                        </tr>
                      );
                    }
                    rows.push(
                      <tr key={idx}>
                        <td style={{ paddingLeft: 24 }}>{r.label}</td>
                        <td className="center" style={{ fontWeight: 600 }}>{r.value ?? '-'}</td>
                      </tr>
                    );
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
