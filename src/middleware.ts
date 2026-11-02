/**
 * 인증 미들웨어.
 *
 * src/auth.ts 의 authorized 콜백에 위임:
 *  - 대시보드(/)와 그 API 는 로그인 없이 열린다. 나머지 경로는 미인증이면 대시보드로
 *    callbackUrl 을 달아 돌려보내고, 거기서 로그인하면 원래 화면으로 돌아간다
 *  - 예전 로그인 주소 /login 은 대시보드로 넘긴다
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
