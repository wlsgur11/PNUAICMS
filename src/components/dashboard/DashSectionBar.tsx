'use client';

import { useEffect, useState } from 'react';

export type DashSection = { id: string; label: string };

/** 구역으로 부드럽게 내려가고, 도착한 구역을 잠깐 옅은 파랑으로 비춘다 */
export function goSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.classList.remove('dash-flash');
  void el.offsetWidth; // 같은 구역을 두 번 눌러도 다시 비추게 애니메이션을 처음으로 돌린다
  el.classList.add('dash-flash');
}

/**
 * 첫 띠가 화면 밖으로 나가면 위에 붙는 구역 바. 지금 보고 있는 구역에 표시가 따라오고,
 * 누르면 그 구역으로 내려간다. 연도도 여기서 바꿀 수 있어 긴 화면 아래에서 다시 올라갈 필요가 없다.
 */
export default function DashSectionBar({ sections, years, year, onYear }: {
  sections: DashSection[];
  years: number[];
  year: number;
  onYear: (y: number) => void;
}) {
  const [shown, setShown] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [present, setPresent] = useState<DashSection[]>([]);

  // 로그인 전에는 일부 구역이 없다. 화면에 실제로 있는 구역만 칩으로 만든다
  useEffect(() => {
    setPresent(sections.filter((s) => document.getElementById(s.id)));
  }, [sections]);

  useEffect(() => {
    const hero = document.querySelector('.dash-hero');
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), { rootMargin: '-60px 0px 0px 0px' });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  // 화면 위쪽 1/3 띠에 걸린 구역을 '지금 구역' 으로 본다
  useEffect(() => {
    const els = present.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setCurrent(hit.target.id);
    }, { rootMargin: '-80px 0px -66% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [present]);

  return (
    <div className={`dash-bar-sticky${shown ? ' shown' : ''}`} aria-hidden={!shown}>
      <nav className="dash-bar-chips" aria-label="대시보드 구역">
        {present.map((s) => (
          <button key={s.id} type="button" tabIndex={shown ? 0 : -1}
                  className={current === s.id ? 'on' : undefined}
                  aria-current={current === s.id ? 'true' : undefined}
                  onClick={() => goSection(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>
      {years.length > 1 && (
        <select className="dash-bar-year" value={year} tabIndex={shown ? 0 : -1}
                aria-label="연도" onChange={(e) => onYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
      )}
    </div>
  );
}
