'use client';

import { useEffect, useRef } from 'react';

/**
 * 랜딩 히어로 배경. 대시보드 화면을 아주 옅게 깐 것처럼 눈금선, 막대, 추세선을
 * 그리고 천천히 흘려보낸다. 커서를 대면 실제 차트처럼 세로 기준선이 붙고
 * 그 지점의 값에 점이 찍힌다.
 *
 * 숫자와 축 이름은 일부러 안 적는다. 배경에 그럴듯한 수치를 적으면 실제 실적으로
 * 읽힌다. 여기서 보여 줄 것은 '지표를 보는 화면' 이라는 인상까지다.
 */

// 추세선 표본 수. 오른쪽에서 들어와 왼쪽으로 빠진다
const POINTS = 56;
// 한 표본이 왼쪽으로 한 칸 밀리는 데 걸리는 시간(ms)
const TICK = 260;
const BARS = 16;
// 눈금선 개수
const GRID = 4;

type Series = { values: number[]; line: string; fill: string | null };

/** 0..1 안에서 천천히 걷는 다음 값. 방향을 유지해야 톱니처럼 안 튄다 */
function nextValue(prev: number, drift: number) {
  const v = prev + drift;
  return v < 0.08 || v > 0.95 ? prev - drift : v;
}

export default function HeroChart() {
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
    let raf = 0;
    let running = true;
    let last = performance.now();
    let acc = 0; // 다음 칸까지 진행도 0..1
    const cursor = { x: -9999, on: false };

    const seedSeries = (start: number, step: number): number[] => {
      const out: number[] = [];
      let v = start;
      for (let i = 0; i < POINTS + 2; i++) {
        v = nextValue(v, (Math.random() - 0.42) * step);
        out.push(v);
      }
      return out;
    };

    // 두 계열. 진한 쪽이 주 계열(산학협력), 연한 쪽이 보조(인턴십) 느낌
    const series: Series[] = [
      { values: seedSeries(0.45, 0.085), line: 'rgba(111, 161, 243, 0.55)', fill: 'rgba(111, 161, 243, 0.11)' },
      { values: seedSeries(0.3, 0.06), line: 'rgba(154, 165, 182, 0.28)', fill: null },
    ];
    const bars = Array.from({ length: BARS }, () => 0.25 + Math.random() * 0.6);
    const barTargets = bars.slice();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // 차트 영역. 세로 위치는 바깥 밴드(.lp-band-bottom)가 잡으므로
    // 여기서는 캔버스를 거의 꽉 쓴다
    const box = () => ({ top: h * 0.14, bottom: h * 0.88, left: -w * 0.04, width: w * 1.08 });

    /** 표본 i 의 화면 좌표. acc 만큼 왼쪽으로 밀어 흐르게 한다 */
    const px = (i: number) => {
      const b = box();
      return b.left + ((i - acc) * b.width) / (POINTS - 1);
    };
    const py = (v: number) => {
      const b = box();
      return b.bottom - v * (b.bottom - b.top);
    };

    const drawSeries = (s: Series) => {
      const b = box();
      ctx.beginPath();
      ctx.moveTo(px(0), py(s.values[0]));
      // 표본 사이를 이차 곡선으로 이어 준다. 직선으로 꺾으면 배경치고 시끄럽다
      for (let i = 1; i < s.values.length; i++) {
        const cx = (px(i - 1) + px(i)) / 2;
        ctx.quadraticCurveTo(px(i - 1), py(s.values[i - 1]), cx, (py(s.values[i - 1]) + py(s.values[i])) / 2);
      }
      ctx.lineTo(px(s.values.length - 1), py(s.values[s.values.length - 1]));

      if (s.fill) {
        ctx.save();
        ctx.lineTo(px(s.values.length - 1), b.bottom);
        ctx.lineTo(px(0), b.bottom);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, b.top, 0, b.bottom);
        g.addColorStop(0, s.fill);
        g.addColorStop(1, 'rgba(111, 161, 243, 0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        // 채움 때문에 경로가 닫혔으니 선은 다시 긋는다
        ctx.beginPath();
        ctx.moveTo(px(0), py(s.values[0]));
        for (let i = 1; i < s.values.length; i++) {
          const cx = (px(i - 1) + px(i)) / 2;
          ctx.quadraticCurveTo(px(i - 1), py(s.values[i - 1]), cx, (py(s.values[i - 1]) + py(s.values[i])) / 2);
        }
        ctx.lineTo(px(s.values.length - 1), py(s.values[s.values.length - 1]));
      }

      ctx.strokeStyle = s.line;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };

    /** 커서 x 에 해당하는 표본 구간을 찾아 값을 선형 보간 */
    const valueAt = (s: Series, x: number) => {
      const b = box();
      const t = ((x - b.left) / b.width) * (POINTS - 1) + acc;
      const i = Math.max(0, Math.min(s.values.length - 2, Math.floor(t)));
      const f = Math.max(0, Math.min(1, t - i));
      return s.values[i] + (s.values[i + 1] - s.values[i]) * f;
    };

    const draw = () => {
      const b = box();
      ctx.clearRect(0, 0, w, h);

      // 눈금선
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID; i++) {
        const y = Math.round(b.top + ((b.bottom - b.top) * i) / GRID) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 막대
      const slot = w / BARS;
      const bw = slot * 0.36;
      ctx.fillStyle = 'rgba(111, 161, 243, 0.085)';
      for (let i = 0; i < BARS; i++) {
        const bh = bars[i] * (b.bottom - b.top) * 0.55;
        ctx.fillRect(slot * i + (slot - bw) / 2, b.bottom - bh, bw, bh);
      }

      for (const s of series) drawSeries(s);

      // 커서 기준선. 실제 차트에서 값을 짚을 때와 같은 모양
      if (cursor.on && cursor.x >= 0 && cursor.x <= w) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(cursor.x) + 0.5, b.top - h * 0.06);
        ctx.lineTo(Math.round(cursor.x) + 0.5, b.bottom);
        ctx.stroke();

        for (const s of series) {
          const y = py(valueAt(s, cursor.x));
          ctx.beginPath();
          ctx.arc(cursor.x, y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(20, 26, 36, 0.9)';
          ctx.fill();
          ctx.strokeStyle = s.line.replace(/[\d.]+\)$/, '0.95)');
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    };

    const step = (now: number) => {
      const dt = Math.min(now - last, 80); // 탭이 멈췄다 돌아와도 한 번에 안 튀게
      last = now;
      acc += dt / TICK;
      while (acc >= 1) {
        acc -= 1;
        for (const s of series) {
          s.values.shift();
          s.values.push(nextValue(s.values[s.values.length - 1], (Math.random() - 0.42) * 0.09));
        }
        // 막대는 가끔 목표만 바꾸고, 실제 높이는 아래에서 천천히 따라간다
        const k = Math.floor(Math.random() * BARS);
        barTargets[k] = 0.2 + Math.random() * 0.7;
      }
      for (let i = 0; i < BARS; i++) bars[i] += (barTargets[i] - bars[i]) * 0.04;

      draw();
      if (running) raf = requestAnimationFrame(step);
    };

    const onMove = (e: MouseEvent) => {
      cursor.x = e.clientX - host.getBoundingClientRect().left;
      cursor.on = true;
    };
    const onLeave = () => { cursor.on = false; };
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
    document.addEventListener('visibilitychange', onVisible);

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
