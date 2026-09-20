'use client';

import { useEffect, useRef } from 'react';

/**
 * 랜딩 히어로 배경. 점 두 종류가 자석처럼 움직인다. 큰 점이 기업, 작은 점이
 * 학생이고 선은 기업과 학생 사이에만 긋는다. 기업끼리, 학생끼리는 잇지 않는다.
 * 이 시스템이 실제로 이어 두는 관계가 그것뿐이라, 그림만 봐도 무엇을 다루는지
 * 읽히게 하려는 것이다.
 *
 * 힘은 세 가지다. 기업끼리는 같은 극처럼 밀어내고, 기업과 학생은 적당한 거리를
 * 두고 당기거나 밀고, 학생끼리는 겹치지 않을 만큼만 밀어낸다. 커서를 대면 가장
 * 가까운 기업이 잡혀 걸린 학생들이 함께 밝아지고, 기업 점은 끌어서 옮길 수 있다.
 *
 * 기업명은 실제 협력 기업을 그대로 쓴다(names). 학생은 이름 없이 점으로만 둔다.
 * 학생 쪽에 그럴듯한 이름을 붙이면 없는 사람의 기록으로 읽히고, 어느 기업에
 * 누가 갔다는 주장까지 하게 된다.
 */

// 기업과 학생이 이어질 거리(px)
const LINK = 168;
// 기업과 학생이 서로 편해하는 거리. 이보다 가까우면 밀고 멀면 당긴다
const REST = 92;
// 커서가 학생을 끌어당기는 반경
const PULL = 180;
// 커서가 기업을 집어내는 반경
const FOCUS = 120;
// 기업 점을 끌기 위해 집는 반경. 점보다 넉넉해야 잡힌다
const GRAB = 22;
// 기업끼리 밀어내는 사정거리
const PUSH = 230;
// 점 개수 상한. 매 프레임 쌍을 도는 O(n²) 이라 여기서 막는다
// (100개면 5천 쌍 남짓이라 프레임에 부담이 없다)
const MAX_DOTS = 100;
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

// 힘 세기. 눈으로 맞춘 값이라 각각의 의미보다 서로의 비율이 중요하다
const K_PUSH = 0.9; // 기업끼리 밀어내기
const K_LINK = 0.0016; // 기업–학생 스프링
const K_CROWD = 0.3; // 학생끼리 겹침 방지
const K_CURSOR = 0.03; // 커서가 학생을 당기는 힘
const K_HOME = 0.0014; // 기업이 제자리로 돌아오려는 힘
const CROWD = 32; // 학생끼리 이 거리 안이면 민다
const DAMP = 0.9; // 감속. 낮을수록 빨리 멈춘다
const MAX_V = 1.3;
// 기업은 무겁다. 같은 힘에 덜 움직인다
const MASS_COMPANY = 0.4;

type Dot = {
  x: number; y: number;
  vx: number; vy: number;
  hx: number; hy: number; // 제자리(기업만 쓴다)
  company: boolean;
  name: string;
};
type Rect = { x: number; y: number; w: number; h: number };

export default function HeroNetwork({ names }: { names: string[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  // 의존성은 비워 둔다. names 는 서버에서 한 번 받아 오는 값이라 이 화면이
  // 떠 있는 동안 바뀌지 않는다
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
    let all: Dot[] = [];
    let raf = 0;
    let running = true;
    let dragging: Dot | null = null;
    const cursor = { x: -9999, y: -9999 };

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

    const short = (n: string) => (n.length > NAME_MAX ? `${n.slice(0, NAME_MAX)}…` : n);

    const seed = () => {
      const total = Math.min(MAX_DOTS, Math.max(14, Math.round((w * h) / AREA_PER_DOT)));
      const nCompany = Math.max(3, Math.round(total / (STUDENTS_PER_COMPANY + 1)));

      const make = (company: boolean, name = ''): Dot => {
        // 이름이 붙는 점은 글 영역을 피해서 자리를 잡는다
        let x = Math.random() * w;
        let y = Math.random() * h;
        for (let i = 0; name && i < 40 && blocked(x + 10, y, 90); i++) {
          x = Math.random() * w;
          y = Math.random() * h;
        }
        return { x, y, vx: 0, vy: 0, hx: x, hy: y, company, name };
      };

      // 이름은 기업마다 하나씩만 쓴다. 돌려 쓰면 같은 회사가 화면에 여러 번
      // 뜬다. 이름이 모자라는 만큼은 이름 없는 점으로 남는다
      companies = Array.from({ length: nCompany }, (_, i) =>
        make(true, i < MAX_NAMED && names[i] ? short(names[i]) : ''));
      students = Array.from({ length: total - nCompany }, () => make(false));
      all = [...companies, ...students];
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

    /** a 를 b 쪽으로, b 를 반대쪽으로. f 가 음수면 서로 밀어낸다 */
    const pull = (a: Dot, b: Dot, f: number) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.01) return;
      const ax = (dx / d) * f;
      const ay = (dy / d) * f;
      a.vx += ax * (a.company ? MASS_COMPANY : 1);
      a.vy += ay * (a.company ? MASS_COMPANY : 1);
      b.vx -= ax * (b.company ? MASS_COMPANY : 1);
      b.vy -= ay * (b.company ? MASS_COMPANY : 1);
    };

    const physics = () => {
      // 기업끼리는 같은 극처럼 밀어낸다. 가까울수록 세게
      for (let i = 0; i < companies.length; i++) {
        for (let j = i + 1; j < companies.length; j++) {
          const a = companies[i];
          const b = companies[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > PUSH) continue;
          pull(a, b, -K_PUSH * (1 - d / PUSH));
        }
      }

      // 기업과 학생은 REST 거리를 두려 한다. 멀면 당기고 가까우면 민다
      for (const c of companies) {
        for (const s of students) {
          const d = Math.hypot(c.x - s.x, c.y - s.y);
          if (d > LINK) continue;
          pull(c, s, (d - REST) * K_LINK);
        }
      }

      // 학생끼리는 겹치지 않을 만큼만
      for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
          const a = students[i];
          const b = students[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > CROWD) continue;
          pull(a, b, -K_CROWD * (1 - d / CROWD));
        }
      }

      for (const p of all) {
        if (p === dragging) { p.vx = 0; p.vy = 0; continue; }

        if (p.company) {
          // 기업은 제자리로 돌아오려 한다. 안 그러면 서로 밀어내다 벽에 붙고,
          // 빈 자리를 골라 놓은 이름표도 글 위로 밀려간다
          p.vx += (p.hx - p.x) * K_HOME;
          p.vy += (p.hy - p.y) * K_HOME;
        } else {
          // 커서는 학생만 당긴다. 기업까지 끌리면 이름표가 커서를 따라다닌다
          const dx = cursor.x - p.x;
          const dy = cursor.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < PULL && d > 1) {
            const f = (1 - d / PULL) * K_CURSOR;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }

        // 가장자리는 부드럽게 되민다. 튕기게 하면 벽에서 덜그럭거린다
        const m = 12;
        if (p.x < m) p.vx += (m - p.x) * 0.02;
        if (p.x > w - m) p.vx -= (p.x - (w - m)) * 0.02;
        if (p.y < m) p.vy += (m - p.y) * 0.02;
        if (p.y > h - m) p.vy -= (p.y - (h - m)) * 0.02;

        p.vx *= DAMP;
        p.vy *= DAMP;
        const v = Math.hypot(p.vx, p.vy);
        if (v > MAX_V) { p.vx = (p.vx / v) * MAX_V; p.vy = (p.vy / v) * MAX_V; }
        p.x += p.vx;
        p.y += p.vy;
      }
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
      physics();
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
      // 놓은 자리를 새 제자리로 삼는다. 안 그러면 손을 떼는 순간 돌아간다
      dragging.hx = dragging.x;
      dragging.hy = dragging.y;
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

    // 애니메이션을 줄여 달라는 설정이면 자리만 잡아 두고 한 번 그린 뒤 멈춘다
    if (reduced) {
      running = false;
      for (let i = 0; i < 120; i++) physics();
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
