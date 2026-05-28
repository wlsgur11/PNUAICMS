import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Toaster from '@/components/Toaster';
import SWRProvider from '@/components/SWRProvider';
import LogoutForm from '@/components/LogoutForm';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: '부울경 AI기업 관리 시스템',
  description: '부산·울산·경남 AI기업 인턴십·취업연계·산학협력 관리',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="ko">
      <body>
        <SWRProvider>
          <div className="app-shell">
            <Sidebar
              userEmail={session?.user?.email}
              userName={session?.user?.name}
              logoutSlot={<LogoutForm />}
            />
            <main className="main">{children}</main>
          </div>
          <Toaster />
        </SWRProvider>
      </body>
    </html>
  );
}
