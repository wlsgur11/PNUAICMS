'use client';

import { useEffect, useRef } from 'react';

/**
 * 랜딩 히어로 배경. 점 두 종류가 자석처럼 떠 있고, 기업에서 학생 쪽으로 뿌리가
 * 자란다. 큰 점이 기업, 작은 점이 학생이다. 선은 기업과 학생 사이에만 생긴다.
 * 이 시스템이 실제로 이어 두는 관계가 그것뿐이라, 그림만 봐도 무엇을 다루는지
 * 읽히게 하려는 것이다.
 *
 * 뿌리는 곧게 뻗지 않는다. 끝이 좌우로 더듬으며 나아가고, 닿고 나면 그 구불한
 * 길이 그대로 남는다. 직선 길이만 늘리면 옅은 선에서는 그냥 나타나는 것처럼
 * 보여서 '자란다' 가 읽히지 않는다.
 *
 * 기업 하나가 동시에 뻗는 뿌리는 몇 개로 묶는다. 거리 안에 든 쌍을 전부 이으면
 * 그물이 되어 한 가닥이 어디로 가는지 안 보인다.
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
const K_PUSH = 0.9;
const K_LINK = 0.0016;
const K_CROWD = 0.3;
const K_CURSOR = 0.03;
const K_HOME = 0.0014;
const CROWD = 32;
const DAMP = 0.9;
const MAX_V = 1.3;
const DRAG_EASE = 0.16;
const MASS_COMPANY = 0.4;

// ── 뿌리 ──
// 기업 하나가 동시에 들고 있는 뿌리 수
const MAX_ROOTS = 3;
// 1초에 나아가는 정도(0=기업, 1=학생). 0.5 면 닿는 데 2초
const ROOT_SPEED = 0.5;
// 되감기는 조금 빠르게
const ROOT_BACK = 0.9;
// 경로 점을 이 간격마다 찍는다. 작을수록 곡선이 곱지만 점이 많아진다
const SAMPLE = 0.045;
// 끝이 좌우로 흔들리는 세기와 한계(px). 약하면 직선과 구분이 안 된다.
// 이 값으로 휨의 중앙값이 선 길이의 16% 쯤 된다(WANDER=4 였을 때는 8% 라
// 옅은 선에서 직선으로 보였다)
const WANDER = 7;
// 흔들림이 얼마나 이어지는지. 높을수록 한쪽으로 길게 휜다
const WANDER_KEEP = 0.9;
const WANDER_MAX = 44;
// 다 닿은 뿌리가 버티는 시간(초). 지나면 되감고 다른 학생에게 다시 뻗는다.
// 안 그러면 처음 2초만 자라고 그 뒤로는 멈춘 그림이 된다
const LIFE_MIN = 6;
const LIFE_MAX = 15;
// 목표가 이 배수보다 멀어지면 되감는다. 다시 가까워지면 이어서 자란다
const GIVE_UP = 1.2;
const RESUME = 0.92;

type Dot = {
  x: number; y: number;
  vx: number; vy: number;
  hx: number; hy: number; // 제자리(기업만 쓴다)
  company: boolean;
  name: string;
};
type Rect = { x: number; y: number; w: number; h: number };

/**
 * 뿌리 하나. 경로는 화면 좌표가 아니라 기업→학생 벡터 기준으로 (t, off) 로 적는다.
 * t 는 0(기업)에서 1(학생)까지, off 는 그 직선에서 옆으로 벗어난 거리다.
 * 이렇게 두면 양 끝 점이 떠다녀도 지나온 길이 같이 따라 휜다. 화면 좌표로 적으면
 * 점이 움직이는 순간 길만 제자리에 남는다.
 */
type Root = {
  si: number;
  pts: { t: number; off: number }[];
  t: number;
  off: number;
  ov: number;
  back: boolean;
  age: number; // 다 닿은 뒤 지난 시간(초)
  life: number; // 이만큼 지나면 되감는다
};

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
    let roots: Root[][] = []; // roots[기업 index]
    let raf = 0;
    let running = true;
    let dragging: Dot | null = null;
    const dragTo = { x: 0, y: 0 };
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
    /** 뿌리마다 조금씩 다른 속도. 난수를 저장하지 않고 번호에서 뽑는다 */
    const jitter = (ci: number, si: number) => 0.65 + (((ci * 7919 + si * 104729) % 97) / 97) * 0.7;

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

      // 이름은 기업마다 하나씩만 쓴다. 돌려 쓰면 같은 회사가 화면에 여러 번 뜬다
      companies = Array.from({ length: nCompany }, (_, i) =>
        make(true, i < MAX_NAMED && names[i] ? short(names[i]) : ''));
      students = Array.from({ length: total - nCompany }, () => make(false));
      all = [...companies, ...students];
      roots = companies.map(() => []);
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
        if (p === dragging) {
          // 커서에 딱 붙이면 가볍다. 남은 거리의 일부씩만 따라가게 두면
          // 손에 끌려오는 느낌이 난다
          p.x += (dragTo.x - p.x) * DRAG_EASE;
          p.y += (dragTo.y - p.y) * DRAG_EASE;
          p.vx = 0;
          p.vy = 0;
          continue;
        }

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

    /** 뿌리를 자라게 하고, 끊긴 자리에 새로 심는다. dt 는 초 */
    const growRoots = (dt: number) => {
      for (let ci = 0; ci < companies.length; ci++) {
        const c = companies[ci];
        const rs = roots[ci];

        for (let k = rs.length - 1; k >= 0; k--) {
          const r = rs[k];
          const s = students[r.si];
          const d = Math.hypot(c.x - s.x, c.y - s.y);
          // 멀어지면 되감고, 다시 가까워지면 이어서 자란다
          if (d > LINK * GIVE_UP) r.back = true;
          else if (d < LINK * RESUME && r.age <= r.life) r.back = false;

          if (r.back) {
            r.t -= ROOT_BACK * dt;
            while (r.pts.length > 1 && r.pts[r.pts.length - 1].t > r.t) r.pts.pop();
            if (r.t <= 0) rs.splice(k, 1);
            continue;
          }
          if (r.t >= 1) {
            // 다 닿았으면 수명을 센다. 수명이 다하면 되감기 시작
            r.age += dt;
            if (r.age > r.life) r.back = true;
            continue;
          }

          r.t = Math.min(1, r.t + ROOT_SPEED * jitter(ci, r.si) * dt);
          // 끝이 좌우로 더듬으며 나아간다. 양 끝에서는 흔들림을 0 으로 좁혀서
          // 기업과 학생 점에 정확히 붙게 한다
          let guard = 0;
          while (r.pts[r.pts.length - 1].t + SAMPLE <= r.t && guard++ < 8) {
            const nt = r.pts[r.pts.length - 1].t + SAMPLE;
            r.ov += (Math.random() - 0.5) * WANDER;
            r.ov *= WANDER_KEEP;
            r.off += r.ov;
            if (Math.abs(r.off) > WANDER_MAX) {
              r.off = Math.sign(r.off) * WANDER_MAX;
              r.ov *= -0.4;
            }
            r.pts.push({ t: nt, off: r.off * Math.sin(Math.PI * nt) });
          }
          if (r.t >= 1 && r.pts[r.pts.length - 1].t < 1) r.pts.push({ t: 1, off: 0 });
        }

        // 빈 자리가 있으면 가장 가까운 학생에게 새로 심는다
        if (rs.length >= MAX_ROOTS) continue;
        let bestSi = -1;
        let bestD = LINK;
        for (let si = 0; si < students.length; si++) {
          if (rs.some((r) => r.si === si)) continue;
          const s = students[si];
          const d = Math.hypot(c.x - s.x, c.y - s.y);
          if (d < bestD) { bestD = d; bestSi = si; }
        }
        if (bestSi >= 0) {
          rs.push({
            si: bestSi, pts: [{ t: 0, off: 0 }], t: 0, off: 0, ov: 0, back: false,
            age: 0, life: LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN),
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const hit = focused();
      const linked = new Set<Dot>();
      const tips: { x: number; y: number; on: boolean }[] = [];

      for (let ci = 0; ci < companies.length; ci++) {
        const c = companies[ci];
        const on = c === hit;
        for (const r of roots[ci]) {
          const s = students[r.si];
          const dx = s.x - c.x;
          const dy = s.y - c.y;
          const len = Math.hypot(dx, dy) || 1;
          // 직선에 수직인 방향. off 를 여기에 실어서 길이 휜다
          const nx = -dy / len;
          const ny = dx / len;
          // 다 닿은 뿌리만 '이어졌다' 로 친다
          if (on && r.t >= 1) linked.add(s);

          const fade = Math.max(0, 1 - len / (LINK * GIVE_UP));
          ctx.strokeStyle = on
            ? `rgba(143, 183, 250, ${0.3 + fade * 0.5})`
            : `rgba(111, 161, 243, ${0.14 + fade * 0.3})`;
          ctx.lineWidth = on ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          let lx = c.x;
          let ly = c.y;
          for (const p of r.pts) {
            lx = c.x + dx * p.t + nx * p.off;
            ly = c.y + dy * p.t + ny * p.off;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
          if (r.t < 1) tips.push({ x: lx, y: ly, on });
        }
      }

      // 뻗는 중인 끝에만 점을 찍는다. 어디로 가고 있는지가 보인다
      for (const p of tips) {
        ctx.fillStyle = p.on ? 'rgba(178, 205, 253, 0.85)' : 'rgba(126, 169, 246, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
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

    // 힘 계산은 프레임 단위 그대로 두고(감속이 그 전제로 맞춰져 있다),
    // 뿌리가 자라는 속도만 시간으로 잰다. 프레임 단위면 120Hz 화면에서
    // 두 배로 빨리 자란다
    let last = performance.now();
    const step = (now: number) => {
      // 탭이 잠깐 멈췄다 돌아와도 한 번에 다 뻗지 않게 막는다
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      physics();
      growRoots(dt);
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
      dragTo.x = hit.x;
      dragTo.y = hit.y;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    };
    // 끄는 동안은 창 전체에서 받는다. 로그인 카드 위를 지나가도 놓치지 않는다
    const onDragMove = (e: MouseEvent) => {
      if (!dragging) return;
      const p = at(e);
      dragTo.x = Math.max(0, Math.min(w, p.x));
      dragTo.y = Math.max(0, Math.min(h, p.y));
      cursor.x = p.x;
      cursor.y = p.y;
    };
    const onUp = () => {
      if (!dragging) return;
      // 놓은 자리를 새 제자리로 삼는다. 안 그러면 손을 떼는 순간 돌아간다
      dragging.hx = dragTo.x;
      dragging.hy = dragTo.y;
      dragging = null;
      canvas.style.cursor = '';
    };
    // 탭이 뒤로 가면 프레임을 돌리지 않는다
    const onVisible = () => {
      const on = !document.hidden;
      if (on === running || reduced) return;
      running = on;
      if (on) { last = performance.now(); raf = requestAnimationFrame(step); }
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

    // 애니메이션을 줄여 달라는 설정이면 다 자란 모습만 한 번 그리고 멈춘다
    if (reduced) {
      running = false;
      for (let i = 0; i < 260; i++) { physics(); growRoots(1 / 60); }
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
