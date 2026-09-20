'use client';

import { useEffect, useRef } from 'react';

/**
 * 랜딩 히어로 배경. 점이 천천히 떠다니고 가까운 것끼리 선으로 이어진다.
 * 커서도 점 하나로 쳐서, 커서 근처 점들은 커서와도 이어지고 살짝 끌려온다.
 *
 * 헤드라인이 '잇는다' 라 배경도 잇는 그림으로 뒀다. 캔버스 하나에 직접 그리고
 * 외부 라이브러리는 안 쓴다.
 */

// 이어질 거리(px). 이보다 멀면 선을 안 긋는다
const LINK = 132;
// 커서가 끌어당기는 반경
const PULL = 190;
// 점 개수 상한. 매 프레임 쌍을 전부 도는 O(n²) 이라 여기서 막는다
// (80개면 3천 쌍 남짓이라 프레임에 부담이 없다)
const MAX_DOTS = 80;
const AREA_PER_DOT = 17000;

type Dot = { x: number; y: number; vx: number; vy: number };

export default function HeroNetwork() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let w = 0;
    let h = 0;
    let dots: Dot[] = [];
    let raf = 0;
    let running = true;
    const cursor = { x: -9999, y: -9999 };

    const seed = () => {
      const want = Math.min(MAX_DOTS, Math.max(18, Math.round((w * h) / AREA_PER_DOT)));
      dots = Array.from({ length: want }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // 점끼리 잇는 선
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > LINK) continue;
          ctx.strokeStyle = `rgba(111, 161, 243, ${(1 - d / LINK) * 0.22})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // 커서와 잇는 선. 위 선보다 진해야 어느 쪽이 커서인지 읽힌다
      for (const p of dots) {
        const d = Math.hypot(p.x - cursor.x, p.y - cursor.y);
        if (d > PULL) continue;
        ctx.strokeStyle = `rgba(143, 183, 250, ${(1 - d / PULL) * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(cursor.x, cursor.y);
        ctx.stroke();
      }

      for (const p of dots) {
        const near = Math.hypot(p.x - cursor.x, p.y - cursor.y) < PULL;
        ctx.fillStyle = near ? 'rgba(160, 195, 252, 0.85)' : 'rgba(111, 161, 243, 0.45)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, near ? 2.1 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of dots) {
        p.x += p.vx;
        p.y += p.vy;
        // 가장자리에서 반대쪽으로 넘긴다. 튕기게 하면 벽에 점이 몰린다
        if (p.x < -LINK) p.x = w + LINK;
        if (p.x > w + LINK) p.x = -LINK;
        if (p.y < -LINK) p.y = h + LINK;
        if (p.y > h + LINK) p.y = -LINK;

        // 커서 쪽으로 아주 약하게 끌어준다. 세게 당기면 한 점에 뭉쳐 버린다
        const dx = cursor.x - p.x;
        const dy = cursor.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < PULL && d > 1) {
          const f = (1 - d / PULL) * 0.035;
          p.x += (dx / d) * f * 6;
          p.y += (dy / d) * f * 6;
        }
      }
      draw();
      if (running) raf = requestAnimationFrame(step);
    };

    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      cursor.x = e.clientX - r.left;
      cursor.y = e.clientY - r.top;
    };
    const onLeave = () => {
      cursor.x = -9999;
      cursor.y = -9999;
    };
    // 탭이 뒤로 가면 프레임을 돌리지 않는다
    const onVisible = () => {
      const on = !document.hidden;
      if (on === running) return;
      running = on;
      if (on) raf = requestAnimationFrame(step);
      else cancelAnimationFrame(raf);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVisible);

    // 애니메이션을 줄여 달라는 설정이면 한 번만 그리고 멈춘다
    if (reduced) {
      running = false;
      draw();
    } else {
      raf = requestAnimationFrame(step);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <canvas ref={ref} className="lp-net" aria-hidden="true" />;
}
