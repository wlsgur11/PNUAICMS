'use client';

import { useEffect, useRef } from 'react';

type Direction = 'diagonal' | 'up' | 'down' | 'left' | 'right';

type Props = {
  /** 격자가 흐르는 방향 */
  direction?: Direction;
  /** 흐르는 속도(px/frame). 낮을수록 은은함 */
  speed?: number;
  /** 격자선 색 (옅게) */
  borderColor?: string;
  /** 한 칸 크기(px) */
  squareSize?: number;
  /** 마우스가 올라간 칸을 채우는 색 (아주 옅게) */
  hoverFillColor?: string;
};

/**
 * react bits "Squares" 배경을 우리 톤(밝은/어두운 슬레이트)에 맞춰 옮긴 컴포넌트.
 * 캔버스에 옅은 격자를 그려 천천히 흐르게 한다. 외부 의존성 없음.
 * 모션 최소화 설정 시 움직이지 않고 정적 격자만 그린다.
 */
export default function Squares({
  direction = 'diagonal',
  speed = 0.4,
  borderColor = 'rgba(100, 116, 139, 0.10)',
  squareSize = 32,
  hoverFillColor = 'rgba(47, 107, 209, 0.06)',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const offset = useRef({ x: 0, y: 0 });
  const hovered = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const startX = Math.floor(offset.current.x / squareSize) * squareSize;
      const startY = Math.floor(offset.current.y / squareSize) * squareSize;

      for (let x = startX; x < canvas.width + squareSize; x += squareSize) {
        for (let y = startY; y < canvas.height + squareSize; y += squareSize) {
          const sx = x - (offset.current.x % squareSize);
          const sy = y - (offset.current.y % squareSize);

          if (
            hovered.current &&
            Math.floor((x - startX) / squareSize) === hovered.current.x &&
            Math.floor((y - startY) / squareSize) === hovered.current.y
          ) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(sx, sy, squareSize, squareSize);
          }
          ctx.strokeStyle = borderColor;
          ctx.strokeRect(sx, sy, squareSize, squareSize);
        }
      }
    };

    const tick = () => {
      const s = Math.max(speed, 0.1);
      switch (direction) {
        case 'right':
          offset.current.x = (offset.current.x - s + squareSize) % squareSize;
          break;
        case 'left':
          offset.current.x = (offset.current.x + s + squareSize) % squareSize;
          break;
        case 'up':
          offset.current.y = (offset.current.y + s + squareSize) % squareSize;
          break;
        case 'down':
          offset.current.y = (offset.current.y - s + squareSize) % squareSize;
          break;
        case 'diagonal':
          offset.current.x = (offset.current.x - s + squareSize) % squareSize;
          offset.current.y = (offset.current.y - s + squareSize) % squareSize;
          break;
      }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const startX = Math.floor(offset.current.x / squareSize) * squareSize;
      const startY = Math.floor(offset.current.y / squareSize) * squareSize;
      hovered.current = {
        x: Math.floor((mx + offset.current.x - startX) / squareSize),
        y: Math.floor((my + offset.current.y - startY) / squareSize),
      };
    };
    const onLeave = () => {
      hovered.current = null;
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    if (prefersReduced) {
      draw();
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [direction, speed, borderColor, squareSize, hoverFillColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}
    />
  );
}
