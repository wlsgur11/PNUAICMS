'use client';

import type { TrendPoint } from '@/lib/dashboard-shape';

/**
 * 연도별 산학, 인턴십 건수. 한 해가 한 줄이다(최근 해가 위).
 *
 * 예전엔 막대 위에 선을 얹고 값은 마우스를 올려야 보였다. 사용자 요청(2026-11-18)
 * "숫자가 직관적으로 이해됐으면" 에 따라 막대 끝에 건수와 전년 대비를 늘 적는다.
 * 막대 길이는 네 해 전체에서 가장 큰 값을 기준으로 한다. 그래야 해끼리 길이로 비교된다.
 * 올해는 아직 안 끝난 해라 옅게 칠하고 전년 대비를 적지 않는다(연중 값과 1년치를 견주면 급락으로 읽힌다).
 */
const SERIES = [
  { key: 'projects', label: '산학협력' },
  { key: 'internships', label: '인턴십' },
] as const;

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const rows = [...(data ?? [])].sort((a, b) => b.year - a.year);
  if (rows.length === 0) {
    return <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', padding: '18px 0', textAlign: 'center' }}>추이를 그릴 연도 데이터가 없습니다.</div>;
  }
  const max = Math.max(1, ...rows.flatMap((d) => [d.projects, d.internships]));
  const nowYear = new Date().getFullYear();
  const byYear = new Map(rows.map((d) => [d.year, d]));

  return (
    <div className="yr-chart" role="table" aria-label="연도별 산학협력과 인턴십 건수">
      <div className="yr-legend" aria-hidden="true">
        {SERIES.map((s) => <span key={s.key}><i className={`yr-key ${s.key}`} />{s.label}</span>)}
        <span className="yr-legend-note">막대 끝 숫자는 그해 건수, 괄호는 전년 대비</span>
      </div>
      {rows.map((d) => {
        const prev = byYear.get(d.year - 1);
        const partial = d.year === nowYear;
        return (
          <div key={d.year} className="yr-row" role="row">
            <div className="yr-year" role="rowheader">
              {d.year}
              {partial && <span className="yr-partial">진행 중</span>}
            </div>
            <div className="yr-lines">
              {SERIES.map((s) => {
                const v = d[s.key];
                const diff = prev && !partial ? v - prev[s.key] : null;
                return (
                  <div key={s.key} className={`yr-line ${s.key}`} role="cell">
                    <div className="yr-bar">
                      <span className={partial ? 'partial' : undefined} style={{ width: `${(v / max) * 100}%` }} />
                    </div>
                    <div className="yr-val">
                      <span className="sr-only">{s.label} </span>
                      <b>{v}</b>건
                      {diff != null && (
                        <em className={diff > 0 ? 'up' : diff < 0 ? 'down' : undefined}>
                          ({diff > 0 ? `+${diff}` : diff === 0 ? '변화 없음' : diff})
                        </em>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
