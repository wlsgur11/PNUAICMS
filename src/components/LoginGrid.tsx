'use client';

import { useEffect, useState } from 'react';

const CELL = 28;

/**
 * 로그인 배경 격자. 화면 크기에 맞춰 칸(div)을 깔기만 하고,
 * "커서 올린 칸이 켜지는" 강조는 전적으로 CSS :hover가 처리한다.
 * (애니메이션 루프·캔버스·외부 의존성 없음)
 */
export default function LoginGrid() {
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });

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

  const total = grid.cols * grid.rows;
  if (!total) return null;

  return (
    <div
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
