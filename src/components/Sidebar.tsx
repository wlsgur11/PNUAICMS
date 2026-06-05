'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** 사이드바 네비게이션. */
const NAV = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/companies', label: '기업 리스트', icon: '🏢' },
  { href: '/companies/new', label: '신규 기업 등록', icon: '＋' },
  { href: '/grid', label: '엑셀 입력', icon: '📋' },
  { href: '/records/import', label: '실적 업로드', icon: '📥' },
];

type Props = {
  userEmail?: string | null;
  userName?: string | null;
  logoutSlot?: React.ReactNode;
};

export default function Sidebar({ userEmail, userName, logoutSlot }: Props) {
  const pathname = usePathname();

  // 로그인 페이지에는 사이드바 숨김 (전체 화면 로그인 UI)
  if (pathname === '/login') return null;

  // 가장 길게(가장 구체적으로) 일치하는 항목 하나만 활성 처리.
  const activeHref = (() => {
    let best: string | null = null;
    for (const item of NAV) {
      const match = item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(item.href + '/');
      if (match && (!best || item.href.length > best.length)) best = item.href;
    }
    return best;
  })();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">🔲</div>
        <div className="brand-name">AI 산학협력 관리 시스템</div>
        <div className="brand-sub">부산대학교 AI융합교육원</div>
      </div>
      <div className="brand-divider" />
      <nav className="nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${activeHref === item.href ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      {userEmail && (
        <div className="sidebar-user">
          <div className="user-name">{userName || userEmail.split('@')[0]}</div>
          <div className="user-email">{userEmail}</div>
          {logoutSlot}
        </div>
      )}
      <div className="sidebar-footer">v2.0.0 © 2026</div>
    </aside>
  );
}
