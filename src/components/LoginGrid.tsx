'use client';

import { useEffect, useRef, useState } from 'react';

const CELL = 28;
const RADIUS = 2; // 커서 칸 주변 몇 칸까지 강조할지 (5x5)

/**
 * 로그인 배경 격자. 칸(div)을 화면에 깔고, 커서 근처 칸을 거리별로 강조한다.
 * 커서가 놓인 칸이 가장 진하고(lvl0) 멀어질수록 연해져(lvl1, lvl2) 마우스 위치를 알려준다.
 * 강조 색은 CSS(.lvl0~2)가 담당하고, 여기서는 커서 근처 칸에만 클래스를 붙인다.
 * mousemove는 rAF로 스로틀하며 근처 칸만 갱신해 가볍다. 캔버스·애니메이션 루프·외부 의존성 없음.
 */
export default function LoginGrid() {
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const calc = () =>
      setGrid({
        cols: Math.ceil(window.innerWidth / CELL) + 1,
        rows: Math.ceil(window.innerHeight / CELL) + 1,
      });
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !grid.cols) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const clear = () => {
      activeRef.current.forEach((c) => c.classList.remove('lvl0', 'lvl1', 'lvl2'));
      activeRef.current = [];
    };

    const apply = (col: number, row: number) => {
      clear();
      const next: HTMLElement[] = [];
      for (let dr = -RADIUS; dr <= RADIUS; dr++) {
        for (let dc = -RADIUS; dc <= RADIUS; dc++) {
          const c = col + dc;
          const r = row + dr;
          if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) continue;
          const cell = el.children[r * grid.cols + c] as HTMLElement | undefined;
          if (!cell) continue;
          const dist = Math.max(Math.abs(dc), Math.abs(dr));
          cell.classList.add(dist === 0 ? 'lvl0' : dist === 1 ? 'lvl1' : 'lvl2');
          next.push(cell);
        }
      }
      activeRef.current = next;
    };

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / CELL);
      const row = Math.floor((e.clientY - rect.top) / CELL);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => apply(col, row));
    };
    const onLeave = () => {
      cancelAnimationFrame(rafRef.current);
      clear();
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      clear();
    };
  }, [grid.cols, grid.rows]);

  const total = grid.cols * grid.rows;
  if (!total) return null;

  return (
    <div
      ref={containerRef}
      className="login-grid"
      aria-hidden="true"
      style={{
        gridTemplateColumns: `repeat(${grid.cols}, ${CELL}px)`,
        gridAutoRows: `${CELL}px`,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="login-grid-cell" />
      ))}
    </div>
  );
}
