'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

function SiteCardView({ site, live, onOpen }: { site: SiteCard; live?: boolean; onOpen: () => void }) {
  return (
    <div className="card site-card" role="button" tabIndex={0} onClick={onOpen}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
         style={{ display: 'flex', flexDirection: 'column' }}>
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
        <a href={site.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}
           onClick={(e) => e.stopPropagation()}>{site.url.replace('https://', '')} ↗</a>
        <span>{live ? '실시간' : site.asOf ? `${site.asOf} 기준` : '집계 전'} · 자세히</span>
      </div>
    </div>
  );
}

/* 카드를 누르면 뜨는 상세. 카드에서 숨긴 숫자와 상세 전용 숫자까지 모두 보여 준다 */
function SiteDetailModal({ site, live, onClose }: { site: SiteCard; live: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const all = [site.headline, ...site.metrics, ...(site.details ?? [])].filter((m) => m.value != null);
  // FadeContent 의 will-change: transform 안에서는 position: fixed 가 화면 기준이 아니라서 body 로 뺀다
  return createPortal(
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={site.name}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>{site.name}</h3>
          <span className="tag tag-slate" style={{ padding: '2px 8px', fontSize: 'calc(11px * var(--fs, 1))' }}>
            {site.since ? `${site.since}부터 운영` : '운영 중'}
          </span>
        </div>
        <div style={{ fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--text-2)', marginTop: 6, lineHeight: 1.7 }}>
          {site.description ?? site.summary}
        </div>

        {/* 숫자보다 먼저 '어떤 사업을 이 서비스로 돌렸나' 를 보여 준다 */}
        {site.programs && site.programs.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="info-label" style={{ marginBottom: 8 }}>사업별 운영 실적</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {site.programs.map((p) => (
                <div key={p.name} style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 'calc(14px * var(--fs, 1))' }}>{p.name}</span>
                    <span style={{ fontSize: small, color: 'var(--text-3)' }}>{p.period}</span>
                  </div>
                  <div style={{ fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--text-2)', marginTop: 4, lineHeight: 1.6 }}>{p.result}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 18 }}>
          {all.map((m) => (
            <div key={m.label} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              <div style={{ fontSize: small, color: 'var(--text-3)' }}>{m.label}</div>
              <div style={{ fontSize: 'calc(20px * var(--fs, 1))', fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {(m.value as number).toLocaleString()}
                <span style={{ fontSize: '0.6em', fontWeight: 400, color: 'var(--text-3)', marginLeft: 2 }}>{m.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="info-list" style={{ marginTop: 18 }}>
          {site.usedIn.length > 0 && (
            <div className="info-row"><span className="info-label">활용</span>
              <span className="info-value" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {site.usedIn.map((u) => <span key={u} className="tag tag-slate" style={{ padding: '3px 8px' }}>{u}</span>)}
              </span>
            </div>
          )}
          <div className="info-row"><span className="info-label">주요 기능</span><span className="info-value">{site.features.join(', ')}</span></div>
          <div className="info-row"><span className="info-label">기준</span><span className="info-value">{live ? '실시간 (AICMS DB)' : site.asOf ? `${site.asOf} 각 서비스 DB 기준` : '집계 전'}</span></div>
        </div>

        <div className="form-actions">
          <a className="btn" href={site.url} target="_blank" rel="noreferrer">사이트 열기 ↗</a>
          <button className="btn btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* 맨 위 가로 요약. 왼쪽에 구역 제목, 오른쪽에 숫자 셋을 세로 구분선으로 나눈다 */
function SummaryStat({ label, value, unit, note, first }: { label: string; value: number | null; unit: string; note?: string; first?: boolean }) {
  return (
    <div style={{ padding: '0 28px', borderLeft: first ? undefined : '1px solid var(--border)', minWidth: 150 }}>
      <div className="dash-metric-label">{label}</div>
      <div className="dash-metric-value"><Num m={{ label, value, unit }} size="lg" /></div>
      <div className="dash-metric-sub" style={{ marginTop: 4, minHeight: '1.5em' }}>{note}</div>
    </div>
  );
}

function SummaryBar({ services, users, usedIn }: { services: number; users: number | null; usedIn: number }) {
  return (
    <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
      <div style={{ minWidth: 260, flex: '1 1 260px' }}>
        <div style={{ fontSize: 'calc(12px * var(--fs, 1))', color: 'var(--text-3)' }}>부산대학교 AI융합교육원</div>
        <div style={{ fontSize: 'calc(22px * var(--fs, 1))', fontWeight: 700, marginTop: 4, color: 'var(--text-1)' }}>교육원 운영 서비스</div>
        <div style={{ fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--text-2)', marginTop: 6, lineHeight: 1.6 }}>
          교육원이 직접 개발하고 교내 서버에서 운영하는 서비스입니다.
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 16 }}>
        <SummaryStat first label="운영 서비스" value={services} unit="개" />
        <SummaryStat label="서비스 이용자" value={users} unit="명" note="서비스별 합계, 중복 포함" />
        <SummaryStat label="활용 교과목, 사업" value={usedIn} unit="개" />
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
  const [open, setOpen] = useState<SiteCard | null>(null);

  return (
    <>
      <SummaryBar
        services={sites.length}
        users={userValues.length ? userValues.reduce((a, b) => a + b, 0) : null}
        usedIn={usedIn.size}
      />
      <div className="dash-grid-sites">
        {sites.map((s) => <SiteCardView key={s.name} site={s} live={s === aicms} onOpen={() => setOpen(s)} />)}
      </div>
      {open && <SiteDetailModal site={open} live={open.name === aicms.name} onClose={() => setOpen(null)} />}
    </>
  );
}
