'use client';

import { createContext, useContext } from 'react';
import type { Role } from '@prisma/client';

/** 현재 로그인 사용자 + 역할. 레이아웃(서버)에서 조회해 SSR 로 주입한다(추가 fetch 없음). */
export type Me = { email: string; name: string; role: Role } | null;

const MeContext = createContext<Me>(null);

export function MeProvider({ value, children }: { value: Me; children: React.ReactNode }) {
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe(): Me {
  return useContext(MeContext);
}
