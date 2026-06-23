'use client';

import { useEffect, useState } from 'react';

type Props = {
  /** 최종 표시할 값 */
  end: number;
  /** 애니메이션 길이(ms) */
  duration?: number;
  /** 소수 자릿수 */
  decimals?: number;
};

/**
 * 숫자가 0에서 목표값까지 부드럽게 증가하는 카운트업 표시.
 * 외부 라이브러리 없이 requestAnimationFrame으로 동작하며,
 * 사용자가 모션 최소화를 켜둔 경우 즉시 최종값을 보여준다.
 */
export default function CountUp({ end, duration = 900, decimals = 0 }: Props) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || end === 0) {
      setValue(end);
      return;
    }

    let raf = 0;
    let startTs = 0;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min(1, (ts - startTs) / duration);
      setValue(end * easeOutCubic(progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(end);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return (
    <span>
      {value.toLocaleString('ko-KR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
