'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * 공개 첫 화면(대시보드)에만 쓰는 움직임. 안쪽 관리 화면은 조용하게 둔다(2026-11-18 사용자 결정).
 *
 * - 첫 띠: 열 때 면이 펼쳐지고 제목, 한 줄, 숫자가 차례로 올라온다. 스크롤하면 띠 안 글자가 천천히 밀려 올라간다
 * - 구역 제목과 카드: 화면에 들어올 때 한 번 아래에서 올라온다
 * - 막대: 화면에 들어올 때 왼쪽에서 차오른다
 * - 연도별 차트: 막대가 바닥에서 자라고 선이 왼쪽부터 그려진다
 * - AI대학, 트랙 그림: 스크롤에 따라 틀 안에서 살짝 움직인다
 *
 * 움직임 줄이기 설정이면 아무것도 하지 않는다. 모든 트윈과 ScrollTrigger 는 useGSAP 가 정리한다.
 */
export default function DashMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ease = 'power3.out';

      // ── 첫 띠 ──
      const hero = root.current?.querySelector<HTMLElement>('.dash-hero');
      if (hero) {
        const tl = gsap.timeline({ defaults: { ease } });
        tl.from(hero, { clipPath: 'inset(0 0 100% 0 round 8px)', duration: 0.7, ease: 'power4.inOut' })
          .from(hero.querySelectorAll('.dash-hero-title, .dash-hero-finding'), { y: 24, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.25')
          .from(hero.querySelector('.dash-hero-years'), { y: -8, opacity: 0, duration: 0.4 }, '<0.1')
          .from(hero.querySelectorAll('.dash-hero-fig'), { y: 28, opacity: 0, duration: 0.6, stagger: 0.09 }, '-=0.35');

        // 띠가 화면 밖으로 나가는 동안 안쪽 글자가 조금 늦게 따라 올라간다(시차)
        gsap.to(hero.querySelector('.dash-hero-top'), {
          yPercent: -18, opacity: 0.4, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.4 },
        });
      }

      // ── 구역 제목: 왼쪽에서 살짝 밀려 들어온다 ──
      gsap.utils.toArray<HTMLElement>('.dash-section', root.current).forEach((el) => {
        gsap.from(el, { x: -16, opacity: 0, duration: 0.5, ease, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });

      // ── 카드: 같은 순간 들어온 카드끼리 묶어 차례로 올린다 ──
      const cards = gsap.utils.toArray<HTMLElement>('.card', root.current).filter((c) => !c.closest('.dash-hero'));
      gsap.set(cards, { y: 32, opacity: 0 });
      ScrollTrigger.batch(cards, {
        start: 'top 92%',
        once: true,
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.7, ease, stagger: 0.08, overwrite: true }),
      });

      // ── 막대: 왼쪽에서 차오른다 ──
      gsap.utils.toArray<HTMLElement>('.dash-fill, .dash-bar > span', root.current).forEach((bar) => {
        gsap.from(bar, {
          scaleX: 0, transformOrigin: 'left center', duration: 0.9, ease: 'power2.out',
          scrollTrigger: { trigger: bar, start: 'top 92%', once: true },
        });
      });

      // ── 연도별 차트: 막대가 자라고, 선이 그려지고, 점이 찍힌다 ──
      gsap.utils.toArray<SVGSVGElement>('svg', root.current).forEach((svg) => {
        const bars = svg.querySelectorAll<SVGRectElement>('rect[data-bar]');
        if (!bars.length) return;
        const lines = svg.querySelectorAll<SVGPolylineElement>('polyline[data-line]');
        const dots = svg.querySelectorAll('circle[data-dot]');
        const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
        tl.from(bars, { scaleY: 0, transformOrigin: '50% 100%', duration: 0.6, ease: 'power2.out', stagger: 0.05 });
        lines.forEach((ln) => {
          const len = ln.getTotalLength();
          tl.fromTo(ln, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }, '-=0.3');
        });
        tl.from(dots, { scale: 0, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.04, ease: 'back.out(2)' }, '-=0.4');
      });

      // ── AI대학, 트랙 그림: 틀 안에서 스크롤에 따라 위아래로 조금 움직인다 ──
      gsap.utils.toArray<HTMLImageElement>('.site-card img', root.current).forEach((img) => {
        gsap.fromTo(img, { yPercent: 4, scale: 1.08 }, {
          yPercent: -4, scale: 1.08, ease: 'none',
          scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        });
      });
    });
  }, { scope: root });

  return <div ref={root} className="dash-motion">{children}</div>;
}
