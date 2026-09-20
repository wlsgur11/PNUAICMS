'use client';

import { useEffect } from 'react';

/**
 * 랜딩 본문이 스크롤에 맞춰 떠오르게 한다. 한 번에 다 보여 주면 훑고 지나가는데,
 * 구역마다 조금 늦게 올라오면 읽는 속도에 맞춰 따라온다.
 *
 * 숨기는 클래스는 자바스크립트가 붙인다. CSS 에만 두면 스크립트가 막힌
 * 브라우저에서 본문이 숨은 채로 남는다.
 *
 * IntersectionObserver 대신 스크롤에서 직접 잰다. 본문을 숨겨 놓고 콜백이
 * 오기를 기다리는 구조라, 콜백이 안 오는 상황이 하나라도 있으면 그 사람에게는
 * 페이지가 비어 보인다. 실제로 탭이 가려져 있으면 옵저버도 rAF 도 멈춘다.
 * 재는 대상이 다섯 개뿐이라 스크롤마다 바로 재도 부담이 없다.
 */
const TARGETS = '.lp-sec, .lp-family, .lp-closing';
// 화면 아래쪽 이 지점을 넘어오면 올린다. 1 이면 딱 걸칠 때라 늦게 올라온다
const TRIGGER = 0.88;

export default function LandingReveal() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let pending = Array.from(document.querySelectorAll<HTMLElement>(TARGETS));
    if (!pending.length) return;
    pending.forEach((el) => el.classList.add('lp-reveal'));

    const check = () => {
      const line = window.innerHeight * TRIGGER;
      pending = pending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top > line || r.bottom < 0) return true;
        // 한 번 올라온 구역은 다시 숨기지 않는다. 위로 올라갈 때마다
        // 사라졌다 나타나면 읽던 자리를 잃는다
        el.classList.add('is-in');
        return false;
      });
      if (!pending.length) stop();
    };
    const stop = () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      document.removeEventListener('visibilitychange', check);
    };

    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    // 가려진 채로 열어 두었다가 돌아오는 경우. 스크롤을 안 해도 올라와야 한다
    document.addEventListener('visibilitychange', check);
    check(); // 처음부터 화면에 걸쳐 있는 구역은 바로 올린다

    return stop;
  }, []);

  return null;
}
