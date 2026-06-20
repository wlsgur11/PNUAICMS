'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMe } from './MeProvider';

/** 일반(GENERAL) 사용자가 접근 가능한 경로. 그 외는 대시보드로 돌려보낸다. */
const GENERAL_ALLOWED = new Set(['/', '/login']);

/**
 * 클라이언트 측 라우트 가드(사용성용). 일반 사용자가 데이터 페이지로 직접 이동하면
 * 대시보드로 리다이렉트한다. 진짜 보안 경계는 서버 requireRole 이다.
 */
export default function RoleGuard() {
  const me = useMe();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (me?.role === 'GENERAL' && !GENERAL_ALLOWED.has(pathname)) {
      router.replace('/');
    }
  }, [me?.role, pathname, router]);

  return null;
}
