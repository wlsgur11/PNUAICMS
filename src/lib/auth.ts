/**
 * src/lib/auth.ts
 * ---------------------------------------------------------
 * [데모용 인증 스텁]
 *
 * 지금은 로그인 없이 .env 의 DEMO_USER_* 값을 "현재 사용자"로 반환한다.
 *
 * ▶ 교내 배포(운영) 전환 시 교체 방법:
 *   1) NextAuth(@auth/core) + Google Provider 설치
 *   2) signIn 콜백에서 profile.email 도메인이 @pusan.ac.kr 인지 검사 → 아니면 거부
 *   3) 아래 getCurrentUser() 를 NextAuth 세션 조회로 바꾸고,
 *      requireUser() 는 그대로 두면 나머지 코드는 수정 불필요.
 *
 * 이렇게 "현재 사용자 조회"를 이 파일 한 곳으로 모아두었기 때문에,
 * 화면/API 코드는 인증 방식이 바뀌어도 손댈 필요가 없다. (이식성 확보)
 */

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

/** 현재 로그인 사용자. (데모: 환경변수 고정값) */
export async function getCurrentUser(): Promise<AppUser | null> {
  const email = process.env.DEMO_USER_EMAIL || 'demo@pusan.ac.kr';
  const name = process.env.DEMO_USER_NAME || '데모 사용자';
  return { email, name };
}

/** 인증 필수 지점에서 사용. 데모에서는 항상 통과. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  return user;
}
