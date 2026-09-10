/**
 * src/lib/a11y.ts
 * ---------------------------------------------------------
 * div·tr·td 처럼 기본 키보드 동작이 없는 요소를 클릭 컨트롤로 쓸 때
 * Enter/Space 를 클릭과 똑같이 처리한다.
 * role="button" tabIndex={0} 과 함께 쓴다.
 */
import type { KeyboardEvent } from 'react';

export function clickKeys(action: () => void) {
  return (e: KeyboardEvent) => {
    // 행 안쪽 링크·버튼에서 올라온 키 입력까지 잡으면 두 번 동작한다.
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    action();
  };
}
