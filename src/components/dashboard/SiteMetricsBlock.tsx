'use client';

import CountUp from '@/components/CountUp';
import { SITE_METRICS, type SiteCard, type SiteMetric } from '@/lib/site-metrics';

/**
 * 교육원 운영 사이트 실적. 사이트마다 카드 하나에 핵심 숫자를 모은다.
 * 다른 사이트 숫자는 손으로 넣은 값이라 카드마다 기준일을 적는다.
 * AICMS 카드만 이 시스템 DB 에서 바로 계산한 값이다.
 */
function SiteCardView({ site, live }: { site: SiteCard; live?: boolean }) {
  return (
    <div className="card">
      <div className="card-title"><span className="accent-bar" />{site.name}</div>
      <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))', marginTop: 4 }}>
        {site.summary}
      </div>
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', margin: '12px 0 0' }}>
        {site.metrics.map((m) => (
          <Metric key={m.label} m={m} />
        ))}
      </dl>
      <div className="muted" style={{ fontSize: 'calc(11px * var(--fs, 1))', marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <a href={site.url} target="_blank" rel="noreferrer" className="muted">{site.url.replace('https://', '')}</a>
        <span>{live ? '실시간' : site.asOf ? `${site.asOf} 기준` : '집계 전'}</span>
      </div>
    </div>
  );
}

function Metric({ m }: { m: SiteMetric }) {
  return (
    <>
      <dt className="muted" style={{ fontSize: 'calc(13px * var(--fs, 1))', alignSelf: 'center' }}>{m.label}</dt>
      <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontSize: 'calc(18px * var(--fs, 1))', fontVariantNumeric: 'tabular-nums' }}>
        {m.value == null
          ? <span className="muted" style={{ fontWeight: 400 }}>-</span>
          : <><CountUp end={m.value} /><span className="muted" style={{ fontSize: '0.7em', fontWeight: 400, marginLeft: 2 }}>{m.unit}</span></>}
      </dd>
    </>
  );
}

export default function SiteMetricsBlock({ aicms }: { aicms: SiteMetric[] }) {
  const self: SiteCard = {
    name: 'AICMS',
    url: 'https://aicms.pusan.ac.kr',
    summary: '산학협력 기업, 학생, 실적 관리',
    asOf: null,
    metrics: aicms,
  };
  return (
    <div className="dash-grid-auto">
      {SITE_METRICS.map((s) => <SiteCardView key={s.name} site={s} />)}
      <SiteCardView site={self} live />
    </div>
  );
}
