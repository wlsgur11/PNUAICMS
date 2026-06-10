'use client';

import { useState } from 'react';
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

/** 지표 하나의 연도별 추이 막대 (목표선 포함). onClick 시 클릭 가능, showKmac 시 최신 검증 배지. */
function KpiTrend({ title, years, indicatorName, onClick, showKmac }: { title: string; years: YearData[]; indicatorName: string; onClick?: () => void; showKmac?: boolean }) {
  const series = years.map((y) => {
    const ind = y.indicators.find((i) => i.name === indicatorName);
    const rawT = ind?.target ?? null;
    const target = ind?.unit === '점' && rawT != null && rawT > 0 && rawT < 1 ? rawT * 100 : rawT;
    return { year: y.year, actual: ind?.actual ?? null, target, unit: ind?.unit ?? null };
  });
  const unit = series.find((s) => s.unit)?.unit ?? null;
  // 최신 연도 KMAC 검증 결과 (있으면 배지로 표시)
  const latestKmac = showKmac
    ? [...years].reverse().map((y) => y.indicators.find((i) => i.name === indicatorName)).find((i) => i?.verifyResult) ?? null
    : null;
  const vals = series.flatMap((s) => [s.actual ?? 0, s.target ?? 0]);
  const axisMax = Math.max(0.0001, ...vals) * 1.18;
  const W = 360, H = 200, padL = 40, padR = 12, padT = 16, padB = 46;
  const plotW = W - padL - padR, plotH = H - padT - padB, baseY = padT + plotH;
  const gw = plotW / Math.max(1, series.length);
  const bw = Math.min(48, gw - 24);
  const yOf = (v: number) => padT + plotH * (1 - v / axisMax);
  return (
    <div
      className="card"
      style={{ padding: 16, height: '100%', cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
      title={onClick ? '클릭하면 산출 근거' : undefined}
    >
      <div className="card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="accent-bar" />
        <span style={{ flex: 1 }}>{title}{unit ? <span className="muted" style={{ fontWeight: 400 }}> ({unit})</span> : ''}</span>
        {latestKmac?.verifyResult && (
          <span className="muted" style={{ fontSize: 11, fontWeight: 400 }} title="KMAC 평가기관 검증 결과 (O=통과, X=보완 요청)">
            검증 <span className={`tag ${latestKmac.verifyResult === 'O' ? 'tag-green' : 'tag-indigo'}`} style={{ fontSize: 10 }}>{latestKmac.verifyResult}</span>
          </span>
        )}
      </div>
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
              {s.target != null && <line x1={x - 4} y1={yOf(s.target)} x2={x + bw + 4} y2={yOf(s.target)} stroke="#1f2937" strokeWidth={1.5} strokeDasharray="4 3" />}
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={barColor}>{fmt(s.actual, unit)}</text>
              <text x={x + bw / 2} y={baseY + 16} textAnchor="middle" fontSize={12} fill="var(--slate-600)">{s.year}</text>
              {s.target != null && <text x={x + bw / 2} y={baseY + 32} textAnchor="middle" fontSize={10} fill="var(--slate-400)">목표 {fmt(s.target, unit)}</text>}
            </g>
          );
        })}
      </svg>
      <div className="muted" style={{ fontSize: 12 }}>막대=실적(초록=목표 달성), 가는 검정선=목표</div>
    </div>
  );
}

/** 원시값 항목 하나의 연도별 추이 막대그래프 (모달용) */
function RawTrend({ series }: { series: { year: number; value: number | null }[] }) {
  const vals = series.map((s) => s.value ?? 0);
  const axisMax = Math.max(1, ...vals) * 1.2;
  const W = 380, H = 200, padL = 16, padR = 16, padT = 24, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB, baseY = padT + plotH;
  const gw = plotW / Math.max(1, series.length);
  const bw = Math.min(64, gw - 28);
  const yOf = (v: number) => padT + plotH * (1 - v / axisMax);
  const fmtN = (v: number | null) => (v == null ? '-' : Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke="var(--slate-200)" />
      {series.map((s, i) => {
        const x = padL + i * gw + (gw - bw) / 2;
        const y = s.value == null ? baseY : yOf(s.value);
        return (
          <g key={s.year}>
            <rect x={x} y={y} width={bw} height={baseY - y} rx={3} fill="var(--indigo-600)" />
            <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--indigo-600)">{fmtN(s.value)}</text>
            <text x={x + bw / 2} y={baseY + 18} textAnchor="middle" fontSize={12} fill="var(--slate-600)">{s.year}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SwcuDashboardPage() {
  const { data, error } = useSWR<YearData[]>('/api/swcu');
  const [rawYear, setRawYear] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rawSel, setRawSel] = useState<Raw | null>(null);

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

      {(() => {
        // 전체 지표를 영역(area)별로 묶어 추이 그래프를 항상 펼쳐서 표시 (영역 등장 순서 유지).
        // 영역 셀은 엑셀에서 세로 병합이라 그룹 첫 행에만 값이 있고 나머지는 숫자(미해결 병합셀 인덱스)/공백 →
        // sortOrder(=nameOrder) 순서로 직전 유효 영역명을 승계해 보정한다.
        const isValidArea = (a: string | null | undefined) => !!a && isNaN(Number(a));
        const areaByName: Record<string, string> = {};
        let curArea = '기타';
        for (const name of nameOrder) {
          if (isValidArea(areaOf[name])) curArea = (areaOf[name] as string).replace(/\s+/g, ' ').trim();
          areaByName[name] = curArea;
        }
        const areaOrder: string[] = [];
        const byArea: Record<string, string[]> = {};
        for (const name of nameOrder) {
          const area = areaByName[name];
          if (!(area in byArea)) { areaOrder.push(area); byArea[area] = []; }
          byArea[area].push(name);
        }
        return (
          <div style={{ marginBottom: 16 }}>
            {areaOrder.map((area) => (
              <div key={area} style={{ marginBottom: 18 }}>
                <div style={{ margin: '4px 2px 10px' }}>
                  <span className="tag tag-indigo" style={{ fontSize: 13 }}>{area}</span>
                </div>
                <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                  {byArea[area].map((name) => (
                    <KpiTrend key={name} title={name} years={years} indicatorName={name} onClick={() => setExpanded(name)} showKmac />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

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
                <tr key={name}>
                  <td
                    onClick={() => setExpanded(name)}
                    title="클릭하면 연도별 추이·산출 근거"
                    style={{ position: 'sticky', left: 0, background: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <span className="muted" style={{ fontWeight: 400, marginRight: 4 }}>▸</span>
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
              ))}
            </tbody>
          </table>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>지표명을 클릭하면 연도별 추이와 산출 근거를 볼 수 있습니다. 초록=목표 달성(교원 1인당 학생수처럼 낮을수록 좋은 지표는 목표 이하면 달성). 'KMAC 검증'은 평가기관(KMAC) 검증 결과로, O=통과·X=보완 요청을 뜻합니다 (2025년부터).</div>
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
          <div style={{ maxHeight: 520, overflow: 'auto', paddingRight: 4 }}>
            {(() => {
              type G = { key: string; scope: string; category: string | null; items: Raw[] };
              const groups: G[] = [];
              for (const r of rawData.raws) {
                const last = groups[groups.length - 1];
                if (last && last.scope === r.scope && (last.category ?? '') === (r.category ?? '')) last.items.push(r);
                else groups.push({ key: `${r.scope}|${r.category ?? ''}|${groups.length}`, scope: r.scope, category: r.category, items: [r] });
              }
              return groups.map((g) => (
                <div key={g.key} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--slate-700)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tag tag-indigo">{g.scope}</span>
                    {g.category || '기타'}
                    <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({g.items.length})</span>
                  </div>
                  {(() => {
                    const isSum = (label: string) => { const n = label.replace(/\s+/g, ''); return n === '계' || /^계\(/.test(n); };
                    const fmtVal = (v: number | null) => v == null ? '-' : (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));
                    const allBlocks: Raw[][] = [];
                    let cur: Raw[] = [];
                    for (const it of g.items) {
                      cur.push(it);
                      if (isSum(it.label)) { allBlocks.push(cur); cur = []; }
                    }
                    if (cur.length) allBlocks.push(cur);
                    const blocks = allBlocks.filter(b => !(b.length === 1 && isSum(b[0].label)));
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                        {blocks.map((blk, bi) => (
                          <div key={bi} style={{ border: '1px solid var(--slate-200)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {blk.map((r, ri) => {
                              const sum = isSum(r.label);
                              return (
                                <div key={ri} onClick={() => setRawSel(r)} title="클릭하면 연도별 추이" style={{
                                  display: 'flex', justifyContent: 'space-between', gap: 8,
                                  padding: '5px 10px', fontSize: 13, cursor: 'pointer',
                                  background: sum ? 'var(--slate-50)' : '#fff',
                                  borderTop: sum ? '1px solid var(--slate-200)' : 'none',
                                  fontWeight: sum ? 700 : 400,
                                  marginTop: sum ? 'auto' : undefined,
                                }}>
                                  <span className={sum ? '' : 'muted'} title={r.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label.replace(/\s+/g, ' ').trim()}</span>
                                  <span title={r.value != null ? `정확한 값: ${r.value}` : undefined} style={{ flexShrink: 0, fontWeight: sum ? 700 : 600, cursor: r.value != null && !Number.isInteger(r.value) ? 'help' : undefined }}>{fmtVal(r.value)}</span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {rawSel && (() => {
        const series = years.map((y) => {
          const m = y.raws.find((x) => x.scope === rawSel.scope && x.sortOrder === rawSel.sortOrder && x.label === rawSel.label);
          return { year: y.year, value: m?.value ?? null };
        });
        return (
          <div onClick={() => setRawSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: 440, maxWidth: '92vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{rawSel.label.replace(/\s+/g, ' ').trim()}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{rawSel.scope} · {rawSel.category || '기타'} · 연도별 추이</div>
                </div>
                <button className="btn btn-sm" onClick={() => setRawSel(null)}>닫기</button>
              </div>
              <div style={{ marginTop: 12 }}><RawTrend series={series} /></div>
            </div>
          </div>
        );
      })()}

      {expanded && (() => {
        const name = expanded;
        const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
        const hasBasis = years.some((y) => { const ind = valOf(y, name); return ind && (ind.formula || ind.numValue != null); });
        return (
          <div onClick={() => setExpanded(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 480, maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{name}{unitOf[name] ? <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> ({unitOf[name]})</span> : ''}</div>
                <button className="btn btn-sm" onClick={() => setExpanded(null)}>닫기</button>
              </div>
              <KpiTrend title="연도별 추이" years={years} indicatorName={name} />
              <div style={{ marginTop: 12, borderTop: '1px solid var(--slate-100)', paddingTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>산출 근거</div>
                {hasBasis ? years.map((y) => {
                  const ind = valOf(y, name);
                  if (!ind || (!ind.formula && ind.numValue == null)) return null;
                  return (
                    <div key={y.year} style={{ marginBottom: 8, fontSize: 13 }}>
                      <strong>{y.year}</strong>
                      {ind.numValue != null && (
                        <span className="muted"> · 분자 {norm(ind.numLabel)} = {ind.numValue} / 분모 {norm(ind.denLabel)} = {ind.denValue}</span>
                      )}
                      {ind.formula && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{norm(ind.formula)}</div>}
                    </div>
                  );
                }) : <div className="muted" style={{ fontSize: 12 }}>산출 근거 정보가 없습니다.</div>}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
