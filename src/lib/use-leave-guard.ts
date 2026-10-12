'use client';

/**
 * src/lib/use-leave-guard.ts
 * ---------------------------------------------------------
 * 적던 내용이 저장되지 않았을 때 화면을 떠나기 전에 한 번 묻는다.
 *
 * 새로고침과 탭 닫기는 beforeunload 로, 사이드바 같은 링크 이동은 링크 클릭을 가로채서 막는다.
 * 화면 안에서 router.push 로 움직이는 버튼은 링크가 아니라서 confirmLeave() 를 먼저 부른다.
 * 상담 내용을 길게 적다가 다른 버튼을 눌러 통째로 날린 일이 있었다.
 */
import { useEffect } from 'react';

const MSG = '작성 중인 내용이 저장되지 않았습니다. 이 화면을 떠날까요?';
let dirtyCount = 0;

/** 저장 안 된 내용이 있으면 물어보고, 떠나도 되면 true */
export function confirmLeave(): boolean {
  return dirtyCount === 0 || window.confirm(MSG);
}

export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    dirtyCount++;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    // 캡처 단계라 Next 의 Link 처리보다 먼저 돈다. 새 탭으로 여는 클릭은 화면을 떠나지 않으니 그냥 둔다
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (!window.confirm(MSG)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      dirtyCount--;
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}
