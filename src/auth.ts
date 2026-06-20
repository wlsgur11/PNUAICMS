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
  pages: {
    signIn: '/login',
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
    // middleware.ts 에서 사용. 미인증 시 signIn 페이지로 리다이렉트.
    async authorized({ auth: session, request }) {
      if (AUTH_BYPASS) return true;
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;
      // /login 은 미인증 상태에서 접근 가능. 이미 로그인했으면 홈으로.
      if (pathname === '/login') {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', request.url));
        }
        return true;
      }
      return isLoggedIn;
    },
  },
});
