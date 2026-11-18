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
 * - 연도별 줄 차트: 최근 해부터 막대가 차오르고 숫자가 따라 나온다
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
        gsap.from(el, { x: -12, opacity: 0, duration: 0.35, ease, scrollTrigger: { trigger: el, start: 'top bottom', once: true } });
      });

      // ── 카드: 같은 순간 들어온 카드끼리 묶어 차례로 올린다 ──
      const cards = gsap.utils.toArray<HTMLElement>('.card', root.current).filter((c) => !c.closest('.dash-hero'));
      // 빠르게(2026-11-18 사용자 요청): 화면 아래 끝에 닿자마자 시작, 짧게 올라온다
      gsap.set(cards, { y: 18, opacity: 0 });
      ScrollTrigger.batch(cards, {
        start: 'top bottom',
        interval: 0.05,
        once: true,
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.04, overwrite: true }),
      });

      // ── 막대: 왼쪽에서 차오른다 ──
      gsap.utils.toArray<HTMLElement>('.dash-fill, .dash-bar > span, .split-bar > span', root.current).forEach((bar) => {
        gsap.from(bar, {
          scaleX: 0, transformOrigin: 'left center', duration: 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: bar, start: 'top 95%', once: true },
        });
      });

      // ── 연도별 줄 차트: 최근 해부터 막대가 차례로 차오르고 숫자가 따라 나온다 ──
      gsap.utils.toArray<HTMLElement>('.yr-chart', root.current).forEach((chart) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: chart, start: 'top 90%', once: true } });
        tl.from(chart.querySelectorAll('.yr-bar > span'), { scaleX: 0, duration: 0.6, ease: 'power2.out', stagger: 0.06 })
          .from(chart.querySelectorAll('.yr-val, .yr-target'), { opacity: 0, x: -6, duration: 0.3, stagger: 0.04 }, 0.2);
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
