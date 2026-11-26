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

/**
 * ICEx 흐름에서 서비스마다 맡는 단계. 인프라 다이어그램 세션(2026-11-10)의 슬라이드와 같은 순서다:
 * 실습(코드플레이스) → 개발(피클) → 프로젝트(AIPMS) → 역량 인정(AI 역량지원시스템) → 산학 연계(AICMS).
 * 처음엔 고리 그림이었는데 크기를 줄이려고 박스 한 줄로 바꿨다(2026-11-26).
 */
const FLOW: { name: string; stage: string; does: string }[] = [
  { name: '코드플레이스', stage: '실습', does: '교과목 코딩 실습, 자동 채점, AI 조교' },
  { name: '피클', stage: '개발', does: '실습 VM 과 LLM API 키를 내어 줌' },
  { name: 'AIPMS', stage: '프로젝트', does: '팀 프로젝트 등록부터 결과물 공개까지' },
  { name: 'AI 역량지원시스템', stage: '역량 인정', does: '실적 신청, 이수 판정, 진로 추천' },
  { name: 'AICMS', stage: '산학 연계', does: '협력 기업, 산학 과제, 인턴십, 학생 상담' },
];

function Step({ n, site, stage, does, onOpen }: { n: number; site: SiteCard; stage: string; does: string; onOpen: () => void }) {
  return (
    <li className="icex-step">
      <button type="button" className="icex-card" onClick={onOpen} aria-label={`${site.name} 자세히`}>
        <span className="icex-stage">{n}. {stage}</span>
        <span className="icex-name">{site.name}</span>
        <span className="icex-does">{does}</span>
        <span className="icex-num"><Num m={site.headline} size="lg" /></span>
        <span className="icex-label">{site.headline.label}</span>
        <span className="icex-more" aria-hidden="true">자세히 →</span>
      </button>
    </li>
  );
}

export default function SiteMetricsBlock({ aicms }: { aicms: SiteCard }) {
  const sites = [...SITE_METRICS, aicms];
  const userValues = sites
    .flatMap((s) => [s.headline, ...s.metrics])
    .filter((m) => m.users && m.value != null)
    .map((m) => m.value as number);
  const users = userValues.length ? userValues.reduce((a, b) => a + b, 0) : null;
  const usedIn = new Set(sites.flatMap((s) => s.usedIn)).size;
  const [open, setOpen] = useState<SiteCard | null>(null);
  const flow = FLOW.map((f) => ({ ...f, site: sites.find((s) => s.name === f.name) })).filter((f) => f.site);

  return (
    <section className="icex" aria-labelledby="icex-title">
      <header className="icex-head">
        <div>
          <h2 id="icex-title">PNU ICEx 교육 플랫폼</h2>
          <p>실습에서 역량 인정, 산학 연계까지 이어지는 교육원 서비스 다섯 개입니다. 모두 교내 DevCloud 서버실에서 운영합니다.</p>
        </div>
        <dl className="icex-sum">
          <div><dt>서비스</dt><dd>{sites.length}개</dd></div>
          {users != null && <div><dt>이용자 합계</dt><dd>{users.toLocaleString('ko-KR')}명</dd></div>}
          <div><dt>활용 교과목, 사업</dt><dd>{usedIn}개</dd></div>
        </dl>
      </header>

      {/* 고리 그림을 걷고 박스 한 줄로 돌렸다(2026-11-26 사용자 결정). 고리 모양을 지키면서는
          크기를 줄일 수 없었다. 흐름 순서는 단계 번호로 보인다 */}
      <ol className="icex-flow">
        {flow.map((f, i) => <Step key={f.name} n={i + 1} site={f.site!} stage={f.stage} does={f.does} onOpen={() => setOpen(f.site!)} />)}
      </ol>

      {open && <SiteDetailModal site={open} live={open.name === aicms.name} onClose={() => setOpen(null)} />}
    </section>
  );
}
