import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Toaster from '@/components/Toaster';

export const metadata: Metadata = {
  title: '부울경 AI기업 관리 시스템',
  description: '부산·울산·경남 AI기업 인턴십·취업연계·산학협력 관리',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
