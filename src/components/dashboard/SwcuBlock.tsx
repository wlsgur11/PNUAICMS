'use client';

import Link from 'next/link';
import type { SwcuSummary, SwcuTrendPoint } from '@/lib/dashboard-shape';
import { formatSwcuValue } from '@/lib/swcu-format';

/**
 * 연도별 달성 개수. 17개 중 몇 개를 달성했는가는 그 해의 점수가 아니라 방향을
 * 봐야 하는 값이다. 전년 한 해만 비교하면 좋아지는 중인지 알 수 없다.
 *
 * 비율이 아니라 개수로 그린다. 지표 수(분모)가 해마다 달라져서 비율만 두면
 * 지표가 줄어 올라간 해와 실제로 더 달성한 해가 같아 보인다.
 */
function MetTrend({ trend, year }: { trend: SwcuTrendPoint[]; year: number }) {
  if (trend.length < 2) return null;
  const max = Math.max(1, ...trend.map((t) => t.total));
  return (
    <div style={{ marginTop: 18 }}>
      <div className="dash-metric-label" style={{ marginBottom: 10 }}>연도별 달성 개수</div>
      {/* 막대 줄과 라벨 줄을 나눈다. 라벨을 고정 높이 안에 같이 넣으면 flex 가
          막대를 눌러서, 높이를 키워도 라벨이 먹은 만큼 빼고 남은 몫만 막대가 된다 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 92 }}>
        {trend.map((t) => (
          <div key={t.year} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {/* 전체 지표 수만큼의 트랙 안에 달성분을 채운다. 트랙 높이가 그 해의
                지표 수라, 분모가 바뀐 해는 기둥 자체가 짧아져 눈에 걸린다.
                폭을 묶어 둔다. flex 로만 두면 연도가 셋일 때 한 칸이 190px 이 되어
                막대가 가로로 누운 블록으로 보인다 */}
            <div
              title={`${t.year}년 ${t.met}/${t.total} 달성`}
              style={{
                height: `${(t.total / max) * 100}%`,
                width: '100%', maxWidth: 34,
                background: 'var(--chart-track)',
                borderRadius: 2, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                outline: t.year === year ? '1px solid var(--accent)' : undefined,
                outlineOffset: 1,
              }}
            >
              <div style={{ height: `${t.total ? (t.met / t.total) * 100 : 0}%`, background: 'var(--chart-met)' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        {trend.map((t) => (
          <div key={t.year} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: 11,
              color: t.year === year ? 'var(--text-1)' : 'var(--text-2)',
              fontWeight: t.year === year ? 500 : 400,
            }}>
              {t.met}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/{t.total}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.year}</div>
          </div>
        ))}
      </div>
      <div className="dash-note" style={{ marginTop: 8 }}>
        회색 기둥 전체가 그 해 지표 수, 초록이 달성한 개수입니다.
      </div>
    </div>
  );
}

/**
 * 미달 지표의 이름과 수치를 직접 나열하는 것이 이 카드의 핵심이다.
 * "3개 미달" 만으로는 하반기에 뭘 밀지 정할 수 없고, "해외 인턴십 3/10" 이 보여야 결정이 된다.
 */
export default function SwcuBlock({ swcu, year }: { swcu: SwcuSummary; year: number }) {
  return (
    <div className="card dash-card">
      <div className="dash-head">
        <h2>SW중심대학 성과지표</h2>
        <p>목표에 못 미친 지표를 부족분이 큰 순서로 보여 드립니다.</p>
      </div>

      {swcu.total === 0 ? (
        <>
          <div className="empty" style={{ fontSize: 13 }}>
            {year}년 성과지표가 아직 등록되지 않았습니다. 위쪽 연도 버튼에서 다른 연도를 선택하세요.
          </div>
          {/* 선택 연도에 지표가 없어도 다른 해의 추이는 보여 준다. 카드가 통째로
              비면 지표를 한 번도 안 넣은 것처럼 읽힌다 */}
          <MetTrend trend={swcu.trend} year={year} />
        </>
      ) : (
        <>
          <div className="dash-metrics" style={{ marginBottom: 20 }}>
            <div>
              <div className="dash-metric-label">달성</div>
              <div className="dash-metric-value met">{swcu.met}<span style={{ fontSize: 15, color: 'var(--text-3)' }}> / {swcu.total}</span></div>
            </div>
            <div>
              <div className="dash-metric-label">미달</div>
              <div className="dash-metric-value" style={{ color: swcu.unmetCount > 0 ? 'var(--red-600)' : 'var(--text-1)' }}>
                {swcu.unmetCount}<span className="unit">개</span>
              </div>
            </div>
          </div>

          <div className="dash-metric-label" style={{ marginBottom: 2 }}>미달 지표</div>
          {swcu.unmet.length === 0 ? (
            <div className="dash-note" style={{ color: 'var(--green-600)', marginTop: 8 }}>모든 지표를 달성했습니다.</div>
          ) : (
            swcu.unmet.map((u) => (
              <div key={u.name} className="dash-list-row">
                <span className="name">{u.name}</span>
                {/* 단위가 % 인 지표는 DB 에 비율로 들어 있다. 그대로 찍으면
                    '0.01818181818181818 / 0.05%' 가 나온다 */}
                <span className="num" style={{ color: 'var(--red-600)' }}>
                  {formatSwcuValue(u.actual, u.unit)}
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {' / '}{formatSwcuValue(u.target, u.unit)}{u.unit === '%' ? '' : (u.unit ?? '')}
                  </span>
                </span>
              </div>
            ))
          )}

          <MetTrend trend={swcu.trend} year={year} />

          <div className="dash-note">
            {swcu.unmetCount > swcu.unmet.length && <>외 {swcu.unmetCount - swcu.unmet.length}개 </>}
            <Link href="/swcu" className="text-link">지표 상세와 산출근거</Link>
          </div>
        </>
      )}
    </div>
  );
}
