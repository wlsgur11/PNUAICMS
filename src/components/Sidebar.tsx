'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** 사이드바 네비게이션 (교수님 시안: 다크 인디고 + 칩 로고) */
const NAV = [
  { href: '/', label: '대시보드', icon: '📊', exact: true },
  { href: '/companies', label: '기업 리스트', icon: '🏢', exact: false },
  { href: '/companies/new', label: '신규 기업 등록', icon: '＋', exact: true },
  { href: '/grid', label: '엑셀 입력', icon: '📋', exact: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">🔲</div>
        <div className="brand-name">AI Biz Connect</div>
        <div className="brand-sub">부울경 산학협력 관리망</div>
      </div>
      <div className="brand-divider" />
      <nav className="nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href, item.exact) ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">v2.0.0 © 2026</div>
    </aside>
  );
}
