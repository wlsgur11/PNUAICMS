'use client';

import { useEffect, useRef } from 'react';

/**
 * 랜딩 히어로 위쪽 배경. 점 두 종류가 떠다닌다. 큰 점이 기업, 작은 점이 학생이고
 * 선은 기업과 학생 사이에만 긋는다. 기업끼리, 학생끼리는 잇지 않는다.
 * 이 시스템이 실제로 이어 두는 관계가 그것뿐이라, 그림만 봐도 무엇을 다루는지
 * 읽히게 하려는 것이다.
 *
 * 커서를 대면 가장 가까운 기업이 잡히고, 그 기업에 걸린 학생들이 함께 밝아진다.
 * 이름과 숫자는 안 적는다. 배경에 그럴듯한 값을 적으면 실제 데이터로 읽힌다.
 */

// 기업과 학생이 이어질 거리(px)
const LINK = 168;
// 커서가 끌어당기는 반경
const PULL = 180;
// 커서가 기업을 집어내는 반경
const FOCUS = 120;
// 점 개수 상한. 선은 기업×학생만 도니 이 상한이면 프레임당 수백 쌍이다
const MAX_DOTS = 96;
const AREA_PER_DOT = 10500;
// 학생 몇 명에 기업 하나꼴로 둘지
const STUDENTS_PER_COMPANY = 4;
// 범례를 넣을 만큼 폭이 있는지. 좁으면 헤드라인 위로 올라탄다
const LEGEND_MIN_W = 560;

type Dot = { x: number; y: number; vx: number; vy: number; company: boolean };

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
    let companies: Dot[] = [];
    let students: Dot[] = [];
    let raf = 0;
    let running = true;
    const cursor = { x: -9999, y: -9999 };

    const seed = () => {
      const total = Math.min(MAX_DOTS, Math.max(14, Math.round((w * h) / AREA_PER_DOT)));
      const nCompany = Math.max(3, Math.round(total / (STUDENTS_PER_COMPANY + 1)));
      // 기업은 학생보다 느리게 움직인다. 학생이 기업 주위를 도는 것처럼 보인다
      const make = (company: boolean): Dot => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * (company ? 0.1 : 0.26),
        vy: (Math.random() - 0.5) * (company ? 0.1 : 0.26),
        company,
      });
      companies = Array.from({ length: nCompany }, () => make(true));
      students = Array.from({ length: total - nCompany }, () => make(false));
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

    /** 커서가 집어낸 기업. 없으면 null */
    const focused = (): Dot | null => {
      let best: Dot | null = null;
      let bestD = FOCUS;
      for (const c of companies) {
        const d = Math.hypot(c.x - cursor.x, c.y - cursor.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      return best;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const hit = focused();
      const linked = new Set<Dot>();

      // 기업–학생 선. 잡힌 기업의 선만 진하게 긋는다
      for (const c of companies) {
        const on = c === hit;
        for (const s of students) {
          const d = Math.hypot(c.x - s.x, c.y - s.y);
          if (d > LINK) continue;
          if (on) linked.add(s);
          const fade = 1 - d / LINK;
          ctx.strokeStyle = on
            ? `rgba(143, 183, 250, ${0.25 + fade * 0.55})`
            : `rgba(111, 161, 243, ${fade * 0.2})`;
          ctx.lineWidth = on ? 1.4 : 1;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
      }

      for (const s of students) {
        const on = linked.has(s);
        ctx.fillStyle = on ? 'rgba(178, 205, 253, 0.9)' : 'rgba(154, 165, 182, 0.4)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, on ? 2.2 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const c of companies) {
        const on = c === hit;
        ctx.fillStyle = on ? 'rgba(143, 183, 250, 1)' : 'rgba(111, 161, 243, 0.55)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, on ? 4.6 : 3.4, 0, Math.PI * 2);
        ctx.fill();
        if (on) {
          ctx.strokeStyle = 'rgba(143, 183, 250, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 범례. 점 옆에 라벨을 띄우면 헤드라인, 본문 글자 위에 겹쳐서
      // 자리가 비어 있는 오른쪽 위에 고정으로 둔다
      if (w >= LEGEND_MIN_W) {
        const x = w - 132;
        const y = 26;
        ctx.font = '600 11px Pretendard, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgba(111, 161, 243, 0.75)';
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 214, 238, 0.7)';
        ctx.fillText('기업', x + 10, y + 0.5);

        ctx.fillStyle = 'rgba(154, 165, 182, 0.6)';
        ctx.beginPath();
        ctx.arc(x + 62, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 214, 238, 0.7)';
        ctx.fillText('학생', x + 72, y + 0.5);
      }
    };

    const step = () => {
      for (const p of [...companies, ...students]) {
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
          const f = (1 - d / PULL) * (p.company ? 0.1 : 0.22);
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
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
      if (on === running || reduced) return;
      running = on;
      if (on) raf = requestAnimationFrame(step);
      else cancelAnimationFrame(raf);
    };

    resize();
    const ro = new ResizeObserver(() => { resize(); draw(); });
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
