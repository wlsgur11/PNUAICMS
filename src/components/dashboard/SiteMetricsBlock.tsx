'use client';

import CountUp from '@/components/CountUp';
import { SITE_METRICS, type SiteCard, type SiteMetric } from '@/lib/site-metrics';

/**
 * 교육원 운영 서비스. 맨 위에 서비스 수와 이용자 합계를 두고, 아래에 서비스마다
 * 카드 하나씩 대표 숫자, 세부 숫자, 활용처, 주요 기능을 모은다.
 * 다른 사이트 숫자는 손으로 넣은 값이라 카드마다 기준일을 적고, AICMS 만 실시간이다.
 */
const small = 'calc(12px * var(--fs, 1))';

function Num({ m, size }: { m: SiteMetric; size?: 'lg' }) {
  if (m.value == null) return <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>-</span>;
  return (
    <>
      <CountUp end={m.value} />
      <span className={size === 'lg' ? 'unit' : undefined}
            style={size === 'lg' ? undefined : { fontSize: '0.7em', fontWeight: 400, color: 'var(--text-3)', marginLeft: 2 }}>
        {m.unit}
      </span>
    </>
  );
}

function SiteCardView({ site, live }: { site: SiteCard; live?: boolean }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div className="card-title" style={{ margin: 0 }}><span className="accent-bar" />{site.name}</div>
        <span className="tag tag-slate" style={{ padding: '2px 8px', fontSize: 'calc(11px * var(--fs, 1))' }}>
          {site.since ? `${site.since}부터 운영` : '운영 중'}
        </span>
      </div>
      <div style={{ fontSize: small, color: 'var(--text-2)', marginTop: 4 }}>{site.summary}</div>

      <div style={{ marginTop: 16 }}>
        <div className="dash-metric-label">{site.headline.label}</div>
        <div className="dash-metric-value"><Num m={site.headline} size="lg" /></div>
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        {/* 아직 못 뽑은 세부 숫자는 '-' 로 두면 미완성처럼 보여서 숨긴다. 대표 숫자는 늘 보인다 */}
        {site.metrics.filter((m) => m.value != null).map((m) => (
          <div key={m.label} style={{ display: 'contents' }}>
            <dt style={{ fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--text-2)' }}>{m.label}</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontWeight: 600, fontSize: 'calc(15px * var(--fs, 1))', fontVariantNumeric: 'tabular-nums' }}>
              <Num m={m} />
            </dd>
          </div>
        ))}
      </dl>

      {site.usedIn.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: small, color: 'var(--text-3)', marginBottom: 6 }}>활용</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {site.usedIn.map((u) => (
              <span key={u} className="tag tag-slate" style={{ padding: '3px 8px', fontWeight: 500 }}>{u}</span>
            ))}
          </div>
        </div>
      )}

      {site.features.length > 0 && (
        <div style={{ marginTop: 12, fontSize: small, color: 'var(--text-2)', lineHeight: 1.6 }}>
          <span style={{ color: 'var(--text-3)', marginRight: 6 }}>주요 기능</span>
          {site.features.join(', ')}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'calc(11px * var(--fs, 1))', color: 'var(--text-3)' }}>
        <a href={site.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{site.url.replace('https://', '')}</a>
        <span>{live ? '실시간' : site.asOf ? `${site.asOf} 기준` : '집계 전'}</span>
      </div>
    </div>
  );
}

/* 요약 칸. 사이드바와 같은 짙은 바탕으로 그리드 첫 칸에 둔다. 새 색을 들이지 않고
   구역의 시작을 알리려는 것이라, 글자는 흰색과 그 투명도 단계만 쓴다 */
const dim = 'rgba(255, 255, 255, 0.62)';
const line = 'rgba(255, 255, 255, 0.12)';

function SummaryRow({ label, value, unit, note }: { label: string; value: number | null; unit: string; note?: string }) {
  return (
    <div style={{ padding: '14px 0', borderTop: `1px solid ${line}` }}>
      <div style={{ fontSize: 'calc(12px * var(--fs, 1))', color: dim }}>{label}</div>
      <div style={{ fontSize: 'calc(34px * var(--fs, 1))', fontWeight: 600, lineHeight: 1.1, marginTop: 4, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value == null ? '-' : <CountUp end={value} />}
        <span style={{ fontSize: '0.5em', fontWeight: 400, color: dim, marginLeft: 3 }}>{unit}</span>
      </div>
      {note && <div style={{ fontSize: 'calc(11px * var(--fs, 1))', color: dim, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function SummaryCard({ services, users, usedIn }: { services: number; users: number | null; usedIn: number }) {
  return (
    <div className="card" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 'calc(12px * var(--fs, 1))', color: dim, letterSpacing: '0.02em' }}>부산대학교 AI융합교육원</div>
      <div style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 700, marginTop: 6 }}>교육원 운영 서비스</div>
      <div style={{ fontSize: 'calc(13px * var(--fs, 1))', color: dim, marginTop: 8, lineHeight: 1.6 }}>
        교육원이 직접 개발하고 교내 서버에서 운영하는 서비스입니다.
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <SummaryRow label="운영 서비스" value={services} unit="개" />
        <SummaryRow label="서비스 이용자" value={users} unit="명" note="서비스별 합계, 중복 포함" />
        <SummaryRow label="활용 교과목, 사업" value={usedIn} unit="개" />
      </div>
    </div>
  );
}

export default function SiteMetricsBlock({ aicms }: { aicms: SiteCard }) {
  const sites = [...SITE_METRICS, aicms];
  const userValues = sites
    .flatMap((s) => [s.headline, ...s.metrics])
    .filter((m) => m.users && m.value != null)
    .map((m) => m.value as number);
  const usedIn = new Set(sites.flatMap((s) => s.usedIn));

  // 요약 칸 1 + 사이트 5 = 6칸이라 3열에서 두 줄이 꽉 찬다
  return (
    <div className="dash-grid-auto">
      <SummaryCard
        services={sites.length}
        users={userValues.length ? userValues.reduce((a, b) => a + b, 0) : null}
        usedIn={usedIn.size}
      />
      {sites.map((s) => <SiteCardView key={s.name} site={s} live={s === aicms} />)}
    </div>
  );
}
