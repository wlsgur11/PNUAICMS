'use client';

import { useEffect, useRef } from 'react';

/**
 * 랜딩 히어로 위쪽 배경. 점 두 종류가 떠다닌다. 큰 점이 기업, 작은 점이 학생이고
 * 선은 기업과 학생 사이에만 긋는다. 기업끼리, 학생끼리는 잇지 않는다.
 * 이 시스템이 실제로 이어 두는 관계가 그것뿐이라, 그림만 봐도 무엇을 다루는지
 * 읽히게 하려는 것이다.
 *
 * 커서를 대면 가장 가까운 기업이 잡히고, 그 기업에 걸린 학생들이 함께 밝아진다.
 * 기업 점은 끌어서 옮길 수 있다. 옮기면 걸리는 학생도 따라 바뀐다.
 *
 * 기업명은 실제 협력 기업을 그대로 쓴다(names). 학생은 이름 없이 점으로만 둔다.
 * 학생 쪽에 그럴듯한 이름을 붙이면 없는 사람의 기록으로 읽히고, 어느 기업에
 * 누가 갔다는 주장까지 하게 된다.
 */

// 기업과 학생이 이어질 거리(px)
const LINK = 168;
// 커서가 끌어당기는 반경
const PULL = 180;
// 커서가 기업을 집어내는 반경
const FOCUS = 120;
// 기업 점을 끌기 위해 집는 반경. 점보다 넉넉해야 잡힌다
const GRAB = 22;
// 점 개수 상한. 선은 기업×학생만 도니 이 상한이면 프레임당 수백 쌍이다
const MAX_DOTS = 96;
const AREA_PER_DOT = 10500;
// 학생 몇 명에 기업 하나꼴로 둘지
const STUDENTS_PER_COMPANY = 2;
// 범례와 기업명을 넣을 만큼 폭이 있는지. 좁으면 헤드라인 위로 올라탄다
const LEGEND_MIN_W = 560;
// 기업명이 글 영역과 이만큼 떨어져야 그린다
const SAFE_PAD = 10;
// 기업명이 이보다 길면 줄인다. 긴 법인명이 배경에서 줄을 다 차지한다
const NAME_MAX = 12;
// 이름을 붙일 기업 수 상한. 점은 많아도 되지만 글자는 많으면 배경이 시끄럽다
const MAX_NAMED = 10;

type Dot = { x: number; y: number; vx: number; vy: number; company: boolean; name: string };
type Rect = { x: number; y: number; w: number; h: number };

export default function HeroNetwork({ names }: { names: string[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  // 의존성은 비워 둔다. names 는 서버에서 한 번 받아 오는 값이라 이 화면이
  // 떠 있는 동안 바뀌지 않는다. 배열을 의존성에 넣으면 렌더마다 참조가
  // 달라져 캔버스를 처음부터 다시 만든다
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
    let dragging: Dot | null = null;
    const cursor = { x: -9999, y: -9999 };

    const short = (n: string) => (n.length > NAME_MAX ? `${n.slice(0, NAME_MAX)}…` : n);

    const seed = () => {
      const total = Math.min(MAX_DOTS, Math.max(14, Math.round((w * h) / AREA_PER_DOT)));
      const nCompany = Math.max(3, Math.round(total / (STUDENTS_PER_COMPANY + 1)));
      // 기업은 학생보다 느리게 움직인다. 학생이 기업 주위를 도는 것처럼 보인다
      const make = (company: boolean, name = ''): Dot => {
        // 이름이 붙는 점은 글 영역을 피해서 놓는다. 기업 점은 느리게 움직여서
        // 한번 열린 자리에 놓이면 그 근처에 머문다
        let x = Math.random() * w;
        let y = Math.random() * h;
        for (let i = 0; name && i < 40 && blocked(x + 10, y, 90); i++) {
          x = Math.random() * w;
          y = Math.random() * h;
        }
        // 기업은 제자리에 박아 둔다. 움직이면 이름표가 같이 떠다녀서 읽기
        // 나쁘고, 빈 자리를 골라 놓은 것도 금방 글 위로 밀려간다
        return {
          x,
          y,
          vx: company ? 0 : (Math.random() - 0.5) * 0.26,
          vy: company ? 0 : (Math.random() - 0.5) * 0.26,
          company,
          name,
        };
      };
      // 이름은 기업마다 하나씩만 쓴다. 돌려 쓰면 같은 회사가 화면에 여러 번
      // 뜬다. 이름이 모자라는 만큼은 이름 없는 점으로 남는다
      companies = Array.from({ length: nCompany }, (_, i) =>
        make(true, i < MAX_NAMED && names[i] ? short(names[i]) : ''));
      students = Array.from({ length: total - nCompany }, () => make(false));
    };

    // 헤드라인, 본문, 로그인 카드가 놓인 자리. 여기에 걸리는 기업명은 안 그린다.
    // 글 위에 이름이 겹치면 배경이 아니라 오류로 보인다
    let safe: Rect[] = [];
    const measureSafe = () => {
      const hostRect = host.getBoundingClientRect();
      safe = ['.lp-hero-copy', '.lp-signin']
        .map((sel) => document.querySelector(sel)?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r)
        .map((r) => ({ x: r.left - hostRect.left, y: r.top - hostRect.top, w: r.width, h: r.height }));
    };
    const blocked = (x: number, y: number, tw: number) => {
      // 범례는 캔버스에 직접 그리는 것이라 DOM 에 없다. 사각형을 손으로 넣는다
      const zones = w >= LEGEND_MIN_W ? [...safe, { x: w - 142, y: 12, w: 142, h: 28 }] : safe;
      return zones.some((r) => x + tw > r.x - SAFE_PAD && x < r.x + r.w + SAFE_PAD
        && y + 6 > r.y - SAFE_PAD && y - 6 < r.y + r.h + SAFE_PAD);
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
      measureSafe();
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

      ctx.font = '600 11px Pretendard, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
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
        if (!c.name || w < LEGEND_MIN_W) continue;
        const tx = c.x + (on ? 14 : 10);
        const tw = ctx.measureText(c.name).width;
        // 끌고 있는 동안은 글 위에 겹치더라도 보여 준다. 잡은 게 무엇인지
        // 안 보이면 끌 수가 없다. 놓으면 원래 규칙으로 돌아간다
        if (c !== dragging && (tx + tw > w - 8 || blocked(tx, c.y, tw))) continue;
        ctx.fillStyle = on ? 'rgba(222, 232, 250, 0.95)' : 'rgba(200, 214, 238, 0.34)';
        ctx.fillText(c.name, tx, c.y);
      }

      // 범례. 점 옆에 라벨을 띄우면 헤드라인, 본문 글자 위에 겹쳐서
      // 자리가 비어 있는 오른쪽 위에 고정으로 둔다
      if (w >= LEGEND_MIN_W) {
        const x = w - 132;
        const y = 26;
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
        if (p === dragging) continue;
        p.x += p.vx;
        p.y += p.vy;
        // 가장자리에서 반대쪽으로 넘긴다. 튕기게 하면 벽에 점이 몰린다
        if (p.x < -LINK) p.x = w + LINK;
        if (p.x > w + LINK) p.x = -LINK;
        if (p.y < -LINK) p.y = h + LINK;
        if (p.y > h + LINK) p.y = -LINK;

        // 학생만 커서 쪽으로 아주 약하게 끌린다. 세게 당기면 한 점에 뭉치고,
        // 기업까지 끌리면 이름표가 커서를 따라다닌다
        if (p.company) continue;
        const dx = cursor.x - p.x;
        const dy = cursor.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < PULL && d > 1) {
          const f = (1 - d / PULL) * 0.22;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }
      draw();
      if (running) raf = requestAnimationFrame(step);
    };

    const at = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    /** 집을 수 있는 기업. 없으면 null */
    const grabbable = (x: number, y: number) =>
      companies.find((c) => Math.hypot(c.x - x, c.y - y) <= GRAB) ?? null;

    const onMove = (e: MouseEvent) => {
      const p = at(e);
      cursor.x = p.x;
      cursor.y = p.y;
      if (!dragging) canvas.style.cursor = grabbable(p.x, p.y) ? 'grab' : '';
    };
    const onLeave = () => {
      if (dragging) return;
      cursor.x = -9999;
      cursor.y = -9999;
    };
    const onDown = (e: MouseEvent) => {
      const p = at(e);
      const hit = grabbable(p.x, p.y);
      if (!hit) return;
      dragging = hit;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    };
    // 끄는 동안은 창 전체에서 받는다. 로그인 카드 위를 지나가도 놓치지 않는다
    const onDragMove = (e: MouseEvent) => {
      if (!dragging) return;
      const p = at(e);
      dragging.x = Math.max(0, Math.min(w, p.x));
      dragging.y = Math.max(0, Math.min(h, p.y));
      cursor.x = p.x;
      cursor.y = p.y;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = null;
      canvas.style.cursor = '';
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
    host.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onUp);
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
      host.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onDragMove);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className="lp-net" aria-hidden="true" />;
}
