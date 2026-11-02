'use server';

import { signIn } from '@/auth';

/**
 * 구글 로그인 시작. 로그인 버튼이 사이드바와 대시보드(클라이언트 컴포넌트)에 있어서
 * 서버 액션을 여기 따로 둔다. 미들웨어는 callbackUrl 을 전체 주소로 주는데, 돌아갈 곳은
 * 경로만 떼어 이 사이트 안으로 고정한다(다른 도메인 주소가 와도 밖으로 안 나간다).
 */
export async function signInWithGoogle(formData: FormData) {
  let redirectTo = '/';
  try {
    const u = new URL(String(formData.get('callbackUrl') ?? '/'), 'http://local');
    redirectTo = u.pathname + u.search;
  } catch { /* 잘못된 값이면 대시보드로 */ }
  await signIn('google', { redirectTo });
}
