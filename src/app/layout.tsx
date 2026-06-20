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

const THEME_INIT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('theme');d.setAttribute('data-theme',(t==='dark'||t==='light')?t:'light');d.setAttribute('data-sidebar',localStorage.getItem('sidebarCollapsed')==='1'?'collapsed':'expanded');}catch(e){d.setAttribute('data-theme','light');d.setAttribute('data-sidebar','expanded');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const me = await getCurrentUser();
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
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
      </body>
    </html>
  );
}
