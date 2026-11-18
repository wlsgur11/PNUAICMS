'use client';

import { useState } from 'react';
import useSWR from 'swr';
import PageHeader from '@/components/PageHeader';
import { clickKeys } from '@/lib/a11y';
import { formatSwcuValue } from '@/lib/swcu-format';

type Indicator = {
  area: string | null; name: string; unit: string | null;
  target: number | null; actual: number | null;
  verifiedActual: number | null; verifyResult: string | null; sortOrder: number;
  formula: string | null; numLabel: string | null; numValue: number | null;
  denLabel: string | null; denValue: number | null;
};
type Raw = { scope: string; category: string | null; label: string; value: number | null; sortOrder: number };
type YearData = { year: number; university: string | null; submittedAt: string | null; indicators: Indicator[]; raws: Raw[] };

const fmt = (n: number | null, unit: string | null) => formatSwcuValue(n, unit);

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
  return (
    <div
      className="card"
      style={{ padding: 16, height: '100%', cursor: onClick ? 'pointer' : undefined }}
      role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? clickKeys(onClick) : undefined}
      title={onClick ? '클릭하면 산출 근거' : undefined}
    >
      <div className="card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ flex: 1 }}>{title}{unit ? <span className="muted" style={{ fontWeight: 400 }}> ({unit})</span> : ''}</span>
        {latestKmac?.verifyResult && (
          <span className="muted" style={{ fontSize: 'calc(11px * var(--fs, 1))', fontWeight: 400 }} title="KMAC 평가기관 검증 결과 (O=통과, X=보완 요청)">
            검증 <span className={`tag ${latestKmac.verifyResult === 'O' ? 'tag-green' : 'tag-indigo'}`} style={{ fontSize: 'calc(11px * var(--fs, 1))' }}>{latestKmac.verifyResult}</span>
          </span>
        )}
      </div>
      {/* 한 해 한 줄(최근 해가 위). 막대는 실적, 검은 세로선은 목표, 넘으면 초록. 값과 목표를 글로 늘 적는다 */}
      <div className="yr-chart" role="table" aria-label={`${title} 연도별 실적`}>
        {[...series].reverse().map((s) => {
          const lower = LOWER_BETTER.has(indicatorName);
          const met = s.actual != null && s.target != null && (lower ? s.actual <= s.target : s.actual >= s.target);
          return (
            <div key={s.year} className="yr-row" role="row">
              <div className="yr-year" role="rowheader">{s.year}</div>
              <div className={`yr-line${met ? ' met' : ''}`} role="cell">
                <div className="yr-bar">
                  {s.actual != null && <span style={{ width: `${(s.actual / axisMax) * 100}%` }} />}
                  {s.target != null && <i className="yr-target" style={{ left: `${(s.target / axisMax) * 100}%` }} aria-hidden="true" />}
                </div>
                <div className="yr-val">
                  {s.actual == null ? <span className="muted">값 없음</span> : <b>{fmt(s.actual, unit)}</b>}
                  {s.target != null && <em className={met ? 'up' : undefined}>{met ? '달성' : `목표 ${fmt(s.target, unit)}`}</em>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginTop: 8 }}>
        막대는 실적, 검은 세로선은 목표{LOWER_BETTER.has(indicatorName) ? '(낮을수록 좋은 지표)' : ''}. 목표를 채우면 초록
      </div>
    </div>
  );
}

/** 원시값 항목 하나의 연도별 추이 막대그래프 (모달용) */
function RawTrend({ series }: { series: { year: number; value: number | null }[] }) {
  const max = Math.max(1, ...series.map((s) => s.value ?? 0));
  const fmtN = (v: number | null) => (v == null ? '-' : Number.isInteger(v) ? v.toLocaleString('ko-KR') : String(Math.round(v * 1000) / 1000));
  const byYear = new Map(series.map((s) => [s.year, s.value]));
  // 한 해 한 줄(최근 해가 위). 막대 끝에 값과 전년 대비를 적는다
  return (
    <div className="yr-chart" role="table" aria-label="연도별 값">
      {[...series].sort((a, b) => b.year - a.year).map((s) => {
        const prev = byYear.get(s.year - 1);
        const diff = s.value != null && prev != null ? Math.round((s.value - prev) * 1000) / 1000 : null;
        return (
          <div key={s.year} className="yr-row" role="row">
            <div className="yr-year" role="rowheader">{s.year}</div>
            <div className="yr-line" role="cell">
              <div className="yr-bar">{s.value != null && <span style={{ width: `${(s.value / max) * 100}%` }} />}</div>
              <div className="yr-val">
                {s.value == null ? <span className="muted">값 없음</span> : <b>{fmtN(s.value)}</b>}
                {diff != null && <em className={diff > 0 ? 'up' : diff < 0 ? 'down' : undefined}>({diff > 0 ? `+${fmtN(diff)}` : diff === 0 ? '변화 없음' : `-${fmtN(-diff)}`})</em>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
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
                  <span className="tag tag-indigo" style={{ fontSize: 'calc(13px * var(--fs, 1))' }}>{area}</span>
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
                    role="button" tabIndex={0}
                    onClick={() => setExpanded(name)}
                    onKeyDown={clickKeys(() => setExpanded(name))}
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
                        <span style={{ fontWeight: 700, color: met ? 'var(--green-600)' : 'inherit' }}>
                          {fmt(ind.actual, unitOf[name])}
                        </span>
                        {normTarget != null && <span className="muted" style={{ fontSize: 'calc(11px * var(--fs, 1))', display: 'block' }}>목표 {fmt(normTarget, unitOf[name])}</span>}
                        {ind.verifyResult && (
                          <span className="muted" style={{ fontSize: 'calc(11px * var(--fs, 1))', display: 'block' }} title="KMAC 평가기관 검증 결과 (O=통과, X=보완 요청)">
                            검증 {fmt(ind.verifiedActual, unitOf[name])} <span className={`tag ${ind.verifyResult === 'O' ? 'tag-green' : 'tag-indigo'}`} style={{ fontSize: 'calc(11px * var(--fs, 1))' }}>{ind.verifyResult}</span>
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
        <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginTop: 8 }}>지표명을 클릭하면 연도별 추이와 산출 근거를 볼 수 있습니다. 초록=목표 달성(교원 1인당 학생수처럼 낮을수록 좋은 지표는 목표 이하면 달성). 'KMAC 검증'은 평가기관(KMAC) 검증 결과로, O=통과·X=보완 요청을 뜻합니다 (2025년부터).</div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><span className="accent-bar" />총괄 원시값 (자세히 보기)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {years.map((y) => (
              <button key={y.year} className={`btn btn-sm${y.year === activeRawYear ? ' btn-on' : ''}`} onClick={() => setRawYear(y.year)}>{y.year}</button>
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
                  <div style={{ fontWeight: 700, fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--slate-700)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tag tag-indigo">{g.scope}</span>
                    {g.category || '기타'}
                    <span className="muted" style={{ fontWeight: 400, fontSize: 'calc(12px * var(--fs, 1))' }}>({g.items.length})</span>
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
                                <div key={ri} role="button" tabIndex={0}
                                  onClick={() => setRawSel(r)}
                                  onKeyDown={clickKeys(() => setRawSel(r))}
                                  title="클릭하면 연도별 추이" style={{
                                  display: 'flex', justifyContent: 'space-between', gap: 8,
                                  padding: '5px 10px', fontSize: 'calc(13px * var(--fs, 1))', cursor: 'pointer',
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
                  <div style={{ fontWeight: 700, fontSize: 'calc(16px * var(--fs, 1))' }}>{rawSel.label.replace(/\s+/g, ' ').trim()}</div>
                  <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginTop: 2 }}>{rawSel.scope} · {rawSel.category || '기타'} · 연도별 추이</div>
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
                <div style={{ fontWeight: 700, fontSize: 'calc(16px * var(--fs, 1))' }}>{name}{unitOf[name] ? <span className="muted" style={{ fontWeight: 400, fontSize: 'calc(13px * var(--fs, 1))' }}> ({unitOf[name]})</span> : ''}</div>
                <button className="btn btn-sm" onClick={() => setExpanded(null)}>닫기</button>
              </div>
              <KpiTrend title="연도별 추이" years={years} indicatorName={name} />
              <div style={{ marginTop: 12, borderTop: '1px solid var(--slate-100)', paddingTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 'calc(13px * var(--fs, 1))', marginBottom: 6 }}>산출 근거</div>
                {hasBasis ? years.map((y) => {
                  const ind = valOf(y, name);
                  if (!ind || (!ind.formula && ind.numValue == null)) return null;
                  return (
                    <div key={y.year} style={{ marginBottom: 8, fontSize: 'calc(13px * var(--fs, 1))' }}>
                      <strong>{y.year}</strong>
                      {ind.numValue != null && (
                        <span className="muted"> · 분자 {norm(ind.numLabel)} = {ind.numValue} / 분모 {norm(ind.denLabel)} = {ind.denValue}</span>
                      )}
                      {ind.formula && <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginTop: 2 }}>{norm(ind.formula)}</div>}
                    </div>
                  );
                }) : <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))' }}>산출 근거 정보가 없습니다.</div>}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
