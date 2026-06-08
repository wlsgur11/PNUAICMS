/**
 * 현재 사용자 조회 헬퍼.
 *
 * NextAuth v5 세션을 한 곳에서 감싸 export 한다.
 * 13개 API 라우트가 이 모듈의 시그니처(getCurrentUser/requireUser)에 의존하므로
 * 인증 백엔드가 바뀌어도 이 파일만 손대면 된다.
 */
import { auth } from '@/auth';

export type AppUser = {
  email: string;
  name: string;
};

const ALLOWED_DOMAINS = ['pusan.ac.kr'];

/**
 * 인증 우회 토글. AUTH_BYPASS=true 면 로그인 없이 더미 사용자로 통과한다.
 * 테스트·시연용 임시 스위치. 운영 배포에서는 절대 켜두지 말 것.
 * (middleware authorized 콜백은 src/auth.ts 에서 같은 플래그를 본다.)
 */
export const AUTH_BYPASS = process.env.AUTH_BYPASS === 'true';

const BYPASS_USER: AppUser = {
  email: 'test@pusan.ac.kr',
  name: '테스트 계정',
};

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

/** 현재 로그인 사용자. NextAuth 세션에서 조회. */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (AUTH_BYPASS) return BYPASS_USER;
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAllowedEmail(email)) return null;
  return {
    email,
    name: session?.user?.name || email,
  };
}

/** 인증 필수 지점에서 사용. 미인증이면 예외 던짐. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  return user;
}
