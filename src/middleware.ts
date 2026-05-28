/**
 * 인증 미들웨어.
 *
 * src/auth.ts 의 authorized 콜백에 위임:
 *  - 미인증 사용자가 보호된 경로 접근 시 /login 으로 리다이렉트
 *  - 이미 로그인한 사용자가 /login 방문 시 / 로 리다이렉트
 *
 * matcher 설명:
 *  - api/auth, _next 는 인증/번들 경로라 제외
 *  - .*\..*  는 확장자 있는 경로(=정적 파일, 예: /logo-pnu.png) 제외
 *    (이게 없으면 public/ 의 이미지·폰트도 401 되어 미인증 상태에서 로고가 안 뜸)
 */
export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/((?!api/auth|_next|.*\\..*).*)'],
};
