'use client';

import { useEffect, useState } from 'react';

/**
 * 화면 배율. 교수님이나 실장님이 보시는 화면이라 글씨가 작으면 읽히지 않는다.
 *
 * 글씨만 키우지 않는다. 이 앱은 글자 크기가 px 로 168 군데에 박혀 있고 차트
 * 높이, 카드 여백, 사이드바 폭도 px 고정이라, 글씨만 키우면 고정 높이 상자
 * 안에서 글이 넘치고 잘린다. 글씨와 간격이 같이 커져야 레이아웃이 버틴다.
 *
 * 브라우저의 Ctrl + 와 같은 동작이지만 화면 안에 버튼으로 두면 찾기 쉽다.
 * 고른 값은 이 브라우저에 남아 다음에 들어와도 그대로다.
 */
const STEPS = [90, 100, 110, 125, 150, 175] as const;
const DEFAULT = 100;
export const UI_SCALE_KEY = 'uiScale';

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
    document.documentElement.style.setProperty('--ui-scale', String(next / 100));
    try { localStorage.setItem(UI_SCALE_KEY, String(next)); } catch { /* 저장만 실패하고 배율은 적용된다 */ }
    setPct(next);
  };

  const i = STEPS.indexOf(pct as (typeof STEPS)[number]);
  const step = (dir: -1 | 1) => {
    const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, (i < 0 ? STEPS.indexOf(DEFAULT) : i) + dir))];
    if (next !== pct) apply(next);
  };

  return (
    <div className="ui-scale" role="group" aria-label="화면 배율">
      <button type="button" onClick={() => step(-1)} disabled={i <= 0} aria-label="화면 작게">−</button>
      {/* 숫자를 누르면 기본값으로. 되돌리는 길이 없으면 한번 키운 뒤 못 돌아온다 */}
      <button type="button" className="val" onClick={() => apply(DEFAULT)}
              disabled={pct === DEFAULT} aria-label="기본 배율로">
        {pct}%
      </button>
      <button type="button" onClick={() => step(1)} disabled={i >= STEPS.length - 1} aria-label="화면 크게">+</button>
    </div>
  );
}
