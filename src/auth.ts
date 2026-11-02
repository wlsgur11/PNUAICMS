/**
 * NextAuth v5 (Auth.js) 설정.
 * - Google OAuth 로 부산대(@pusan.ac.kr) 도메인만 로그인 허용
 * - 로그인 화면에서 부산대 계정만 노출 (hd 파라미터)
 * - 세션은 JWT 기반(서버 DB 세션 X) → 교내 PostgreSQL 이전해도 그대로 작동
 *
 * 운영 전 준비:
 *  AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET 환경변수 필요.
 *  자세한 발급 절차는 .env.example 참고.
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAllowedEmail } from '@/lib/access';

const ALLOWED_DOMAIN = 'pusan.ac.kr';

// 인증 우회 토글. AUTH_BYPASS=true 면 모든 경로를 미인증 상태로도 통과시킨다.
// (lib/auth.ts 의 getCurrentUser 도 같은 플래그로 더미 사용자를 반환)
const AUTH_BYPASS = process.env.AUTH_BYPASS === 'true';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          // Google 로그인 화면에서 @pusan.ac.kr 계정만 노출
          hd: ALLOWED_DOMAIN,
          // 계정 두 개 이상이면 선택 화면을 매번 띄움
          prompt: 'select_account',
        },
      },
    }),
  ],
  // 로그인 화면이 따로 없다. 대시보드가 첫 화면이자 로그인 입구이고, 실패하면 ?error= 를 달고 돌아온다
  pages: {
    signIn: '/',
    error: '/',
  },
  callbacks: {
    // 도메인 + allowlist 검증. hd 파라미터는 힌트일 뿐이라 서버에서도 한 번 더 확인.
    // (ALLOWED_EMAILS 가 설정돼 있으면 그 목록의 계정만 로그인 가능)
    async signIn({ profile }) {
      return isAllowedEmail(profile?.email);
    },
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      if (profile?.name) token.name = profile.name;
      return token;
    },
    async session({ session, token }) {
      if (token.email) session.user.email = token.email as string;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
    // middleware.ts 에서 사용. 미인증이면 signIn 페이지(/)로 callbackUrl 을 달아 돌려보낸다.
    async authorized({ auth: session, request }) {
      if (AUTH_BYPASS) return true;
      const { pathname, search } = request.nextUrl;
      // 예전 로그인 주소. 북마크와 오류 리다이렉트가 남아 있을 수 있어 대시보드로 넘긴다
      if (pathname === '/login') return Response.redirect(new URL(`/${search}`, request.url));
      // 대시보드는 로그인 없이 열린다. API 가 로그인 전에는 집계만 내려 준다(api/dashboard)
      if (pathname === '/' || pathname === '/api/dashboard') return true;
      return !!session?.user;
    },
  },
});
