'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CountUp from '@/components/CountUp';

/**
 * SW중심대학 현장평가 발표자료(2026-11-12 판) 5쪽, 21쪽을 대시보드에 옮긴 카드 두 장.
 * 카드에는 슬라이드 그림만 두고, 누르면 숫자와 구성을 펼친다.
 * 숫자는 발표자료에 적힌 값을 손으로 옮긴 것이라 자료가 바뀌면 여기도 고친다.
 */
type Stat = { label: string; value: number; unit: string };
type Group = { label: string; items: string[] };
type Slide = {
  title: string;
  summary: string;
  image: string;
  stats: Stat[];
  groups: Group[];
};

const SLIDES: Slide[] = [
  {
    title: 'AI대학 2027년 출범',
    summary: '3개 단과대학에 흩어진 AI 학문단위를 ADP+X 구조로 통합하고, 학부 개편과 대학원 연계를 함께 추진합니다.',
    image: '/swcu/ai-college.jpg',
    stats: [
      { label: '학부 입학정원', value: 424, unit: '명' },
      { label: '재학생', value: 1599, unit: '명' },
      { label: '대학원 정원', value: 270, unit: '명' },
      { label: '교원 확보', value: 100, unit: '명 이상' },
    ],
    groups: [
      { label: 'AI · AI컴퓨터공학부', items: ['컴퓨터공학', '인공지능', '인터렉티브컴퓨팅', 'AI컴퓨팅자율'] },
      { label: 'DATA · 데이터사이언스학부', items: ['데이터사이언스', '첨단바이오공학', '통계학과'] },
      { label: 'Process · 산업공학부', items: ['산업공학', '산업AI'] },
      { label: 'AX · AX융합학부', items: ['스마트시티', '산업인공지능융합', '지능형로봇AI융합', '첨단바이오신약'] },
      { label: '대학원', items: ['AI특화대학원', '데이터사이언스대학원', 'AX특화대학원'] },
      { label: '통합 대상', items: ['정보의생명공학대학', '자연과학대학', '공과대학'] },
    ],
  },
  {
    title: '8대 신기술 특화 트랙',
    summary: '컴퓨터공학, 인공지능, 데이터사이언스, 인터랙티브컴퓨팅 4개 SW전공을 바탕으로 신기술 특화 트랙 8개를 운영합니다.',
    image: '/swcu/tracks.jpg',
    stats: [
      { label: '특화 트랙', value: 8, unit: '개' },
      { label: '기반 SW전공', value: 4, unit: '개' },
    ],
    groups: [
      { label: '기반 SW전공', items: ['컴퓨터공학', '인공지능', '데이터사이언스', '인터랙티브컴퓨팅'] },
      {
        label: '특화 트랙',
        items: ['클라우드AI (기존 클라우드)', 'AI융합보안 (기존 융합보안)', '피지컬AI (기존 지능형IoT)', '공간컴퓨팅 (기존 메타버스)',
          '생성AI', '인공지능응용', '의생명빅데이터통계', '인터랙티브컴퓨팅 (기존 디자인테크)'],
      },
      {
        label: '운영, 지원',
        items: ['4개 SW전공 교과목과 연계한 심화 교육', '산업체 전문가와 교육과정 개발 (교과과정혁신위원회, 트랙소위원회)',
          '전공기초 개편 (수학 과목 전진 배치, 신설)'],
      },
    ],
  },
];

const small = 'calc(12px * var(--fs, 1))';
// 슬라이드 그림은 흰 바탕이라 다크 테마에서도 흰 판 위에 올린다
const frame = { background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', padding: 8 };

function SlideCard({ s, onOpen }: { s: Slide; onOpen: () => void }) {
  return (
    <div className="card site-card" role="button" tabIndex={0} onClick={onOpen}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
         style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-title" style={{ margin: 0 }}><span className="accent-bar" />{s.title}</div>
      <div style={{ fontSize: small, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.6 }}>{s.summary}</div>
      {/* 두 슬라이드 그림의 가로세로 비가 달라 칸 비율을 맞춰 두 카드 높이를 같게 한다 */}
      <div style={{ ...frame, marginTop: 14 }}>
        <img src={s.image} alt={s.title} style={{ display: 'block', width: '100%', aspectRatio: '2.25', objectFit: 'contain' }} />
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 12, textAlign: 'right', fontSize: 'calc(11px * var(--fs, 1))', color: 'var(--text-3)' }}>
        눌러서 숫자 보기
      </div>
    </div>
  );
}

function SlideModal({ s, onClose }: { s: Slide; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // FadeContent 의 will-change: transform 안에서는 position: fixed 가 화면 기준이 아니라서 body 로 뺀다
  return createPortal(
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={s.title} style={{ width: 960 }}>
        <h3 className="modal-title" style={{ margin: 0 }}>{s.title}</h3>
        <div style={{ fontSize: 'calc(13px * var(--fs, 1))', color: 'var(--text-2)', marginTop: 6, lineHeight: 1.7 }}>{s.summary}</div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`, gap: 10, marginTop: 18 }}>
          {s.stats.map((m) => (
            <div key={m.label} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
              <div style={{ fontSize: small, color: 'var(--text-3)' }}>{m.label}</div>
              <div style={{ fontSize: 'calc(26px * var(--fs, 1))', fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                <CountUp end={m.value} />
                <span style={{ fontSize: '0.55em', fontWeight: 400, color: 'var(--text-3)', marginLeft: 3 }}>{m.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...frame, marginTop: 18 }}>
          <img src={s.image} alt={s.title} style={{ display: 'block', width: '100%', height: 'auto' }} />
        </div>

        <div className="info-list" style={{ marginTop: 18 }}>
          {s.groups.map((g) => (
            <div key={g.label} className="info-row">
              <span className="info-label">{g.label}</span>
              <span className="info-value" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {g.items.map((i) => <span key={i} className="tag tag-slate" style={{ padding: '3px 8px' }}>{i}</span>)}
              </span>
            </div>
          ))}
          <div className="info-row"><span className="info-label">출처</span><span className="info-value">2026 SW중심대학 현장평가 발표자료</span></div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SwcuSlidesBlock() {
  const [open, setOpen] = useState<Slide | null>(null);
  return (
    <>
      <div className="dash-grid-2">
        {SLIDES.map((s) => <SlideCard key={s.title} s={s} onOpen={() => setOpen(s)} />)}
      </div>
      {open && <SlideModal s={open} onClose={() => setOpen(null)} />}
    </>
  );
}
