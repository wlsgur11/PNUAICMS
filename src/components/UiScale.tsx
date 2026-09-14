'use client';

import { useEffect, useState } from 'react';

/**
 * 글자 크기. 교수님이나 실장님이 보시는 화면이라 글씨가 작으면 읽히지 않는다.
 *
 * 글자만 키운다. 여백과 차트 크기는 그대로 둔다. 화면 전체를 확대하는 방식도
 * 해 봤는데, 사이드바가 화면보다 길어져 하단의 이 버튼 자체가 잘려 나가
 * 되돌릴 길이 없어졌다.
 *
 * px 로 박혀 있던 글자 크기 170 군데를 calc(Npx * var(--fs)) 로 바꿔 두었다.
 * 여기서 --fs 만 올리면 글자만 커진다. 차트 안 글씨는 SVG viewBox 안에 있어
 * 차트와 함께 비율이 유지된다.
 *
 * 고른 값은 이 브라우저에 남아 다음에 들어와도 그대로다.
 */
const STEPS = [90, 100, 110, 125, 150, 175] as const;
const DEFAULT = 100;
export const UI_SCALE_KEY = 'fontScale';

/** 유효한 단계로 맞춘다. 저장된 값이 망가져 있어도 화면이 깨지지 않게 */
export function normalizeScale(v: unknown): number {
  const n = Number(v);
  return STEPS.includes(n as (typeof STEPS)[number]) ? n : DEFAULT;
}

export default function UiScale() {
  const [pct, setPct] = useState<number>(DEFAULT);

  useEffect(() => {
    try { setPct(normalizeScale(localStorage.getItem(UI_SCALE_KEY))); } catch { /* 저장소를 막아 둔 브라우저 */ }
  }, []);

  const apply = (next: number) => {
    document.documentElement.style.setProperty('--fs', String(next / 100));
    try { localStorage.setItem(UI_SCALE_KEY, String(next)); } catch { /* 저장만 실패하고 배율은 적용된다 */ }
    setPct(next);
  };

  const i = STEPS.indexOf(pct as (typeof STEPS)[number]);
  const step = (dir: -1 | 1) => {
    const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, (i < 0 ? STEPS.indexOf(DEFAULT) : i) + dir))];
    if (next !== pct) apply(next);
  };

  return (
    <div className="ui-scale" role="group" aria-label="글자 크기">
      <button type="button" onClick={() => step(-1)} disabled={i <= 0} aria-label="글자 작게">−</button>
      {/* 숫자를 누르면 기본값으로. 되돌리는 길이 없으면 한번 키운 뒤 못 돌아온다 */}
      <button type="button" className="val" onClick={() => apply(DEFAULT)}
              disabled={pct === DEFAULT} aria-label="기본 글자 크기로">
        {pct}%
      </button>
      <button type="button" onClick={() => step(1)} disabled={i >= STEPS.length - 1} aria-label="글자 크게">+</button>
    </div>
  );
}
