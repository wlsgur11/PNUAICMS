'use client';

import { useEffect, useState } from 'react';

type Props = {
  children: React.ReactNode;
  /** 등장 지연(ms) — 여러 섹션을 순차로 떠오르게 할 때 */
  delay?: number;
  /** 떠오르는 거리(px) */
  distance?: number;
  /** 지속(ms) */
  duration?: number;
  className?: string;
};

/**
 * 자식 요소가 마운트될 때 살짝 아래에서 떠오르며 페이드인.
 * 외부 라이브러리 없이 CSS transition으로 동작하며,
 * 모션 최소화 설정 시 애니메이션 없이 즉시 표시한다.
 */
export default function FadeContent({
  children,
  delay = 0,
  distance = 8,
  duration = 320,
  className,
}: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setShown(true);
      return;
    }

    const id = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
