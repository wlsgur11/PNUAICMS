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

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

/** 현재 로그인 사용자. NextAuth 세션에서 조회. */
export async function getCurrentUser(): Promise<AppUser | null> {
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
