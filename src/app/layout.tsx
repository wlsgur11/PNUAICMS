import type { Metadata } from 'next';
import 'pretendard/dist/web/static/pretendard.css';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Toaster from '@/components/Toaster';
import SWRProvider from '@/components/SWRProvider';
import LogoutForm from '@/components/LogoutForm';
import { MeProvider } from '@/components/MeProvider';
import RoleGuard from '@/components/RoleGuard';
import { auth } from '@/auth';
import { getCurrentUser } from '@/lib/auth';
import pkg from '../../package.json';

export const metadata: Metadata = {
  title: 'AI 산학협력 관리 시스템',
  description: 'AI기업 인턴십·취업연계·산학협력 관리',
};

// 첫 그림 전에 테마와 글자 크기를 정한다. 나중에 적용하면 기본값으로 한 번
// 그렸다가 바뀌어서 화면이 튄다. 글자 크기는 정해 둔 단계만 받아들인다
const THEME_INIT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('theme');d.setAttribute('data-theme',(t==='dark'||t==='light')?t:'light');d.setAttribute('data-sidebar',localStorage.getItem('sidebarCollapsed')==='1'?'collapsed':'expanded');var s=Number(localStorage.getItem('fontScale'));if([90,100,110,125,150,175].indexOf(s)>=0&&s!==100){d.style.setProperty('--fs',String(s/100));}}catch(e){d.setAttribute('data-theme','light');d.setAttribute('data-sidebar','expanded');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = await getCurrentUser();
  // 미인증 상태에서 그려지는 화면은 랜딩(/login) 하나뿐이다. 나머지는 미들웨어가
  // 거기로 돌려보낸다. 사이드바 셸을 씌우면 랜딩이 그 옆 칸에 끼어 버린다.
  // (AUTH_BYPASS 로컬 개발에서는 me 가 더미 사용자라 셸이 그대로 뜬다)
  const bare = !session && !me;
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {bare ? children : (
          <SWRProvider>
            <MeProvider value={me}>
              <div className="app-shell">
                <Sidebar
                  userEmail={session?.user?.email}
                  userName={session?.user?.name}
                  role={me?.role ?? null}
                  logoutSlot={<LogoutForm />}
                  version={pkg.version}
                />
                <main className="main">{children}</main>
              </div>
              <RoleGuard />
              <Toaster />
            </MeProvider>
          </SWRProvider>
        )}
      </body>
    </html>
  );
}
