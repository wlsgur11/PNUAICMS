'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** 사이드바 네비게이션. 대시보드는 단독, 나머지는 도메인별 접이식 그룹. */
type Item = { href: string; label: string };
type Group = { key: string; label: string; icon: string; items: Item[] };

const DASHBOARD = { href: '/', label: '대시보드', icon: '📊' };

// 외부 서비스 바로가기 (패밀리 사이트). 새 탭으로 열림.
// hint 는 부가 안내(예: 교내망 전용)용 — 없으면 생략.
type ExternalLink = { href: string; label: string; icon: string; hint?: string };
const FAMILY: ExternalLink[] = [
  { href: 'https://pnu-pcc.vercel.app/cse-trends', label: '코딩역량센터', icon: '💻' },
  { href: 'https://code.pusan.ac.kr', label: '코드플레이스', icon: '🧩' },
  { href: 'https://pnu-emp.vercel.app', label: '정컴 취업현황', icon: '💼' },
  { href: 'https://arise-ai.pusan.ac.kr/', label: 'Arise PNU', icon: '🤖' },
  { href: 'https://pnuai.github.io/', label: '브로슈어 협업 시스템', icon: '📄' },
  { href: 'http://10.126.34.165:15980', label: 'AI 지식검색 (KB)', icon: '🔎', hint: '교내' },
];

const GROUPS: Group[] = [
  {
    key: 'company',
    label: '기업 관리',
    icon: '🏢',
    items: [
      { href: '/companies', label: '기업 리스트' },
      { href: '/companies/new', label: '신규 기업 등록' },
      { href: '/grid', label: '엑셀 입력' },
    ],
  },
  {
    key: 'records',
    label: '산학·인턴십 실적',
    icon: '📈',
    items: [
      { href: '/projects', label: '산학협력 현황' },
      { href: '/internships', label: '인턴십 현황' },
      { href: '/records/import', label: '실적 업로드' },
    ],
  },
  {
    key: 'swcu',
    label: 'SW중심대학 성과',
    icon: '🏅',
    items: [
      { href: '/swcu', label: '성과 대시보드' },
      { href: '/swcu/import', label: '실적 엑셀 업로드' },
    ],
  },
];

type Props = {
  userEmail?: string | null;
  userName?: string | null;
  logoutSlot?: React.ReactNode;
};

export default function Sidebar({ userEmail, userName, logoutSlot }: Props) {
  const pathname = usePathname();

  // 가장 구체적으로 일치하는 href 하나만 활성 처리.
  const allHrefs = [DASHBOARD.href, ...GROUPS.flatMap((g) => g.items.map((i) => i.href))];
  const activeHref = (() => {
    let best: string | null = null;
    for (const href of allHrefs) {
      const match = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
      if (match && (!best || href.length > best.length)) best = href;
    }
    return best;
  })();

  // 현재 페이지가 속한 그룹은 펼친 상태로 시작.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.key, g.items.some((i) => i.href === activeHref)])),
  );
  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));
  // 패밀리 사이트는 항목이 많아 기본 접힘 상태
  const [familyOpen, setFamilyOpen] = useState(false);

  // 로그인 페이지에는 사이드바 숨김 (전체 화면 로그인 UI)
  if (pathname === '/login') return null;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">🔲</div>
        <div className="brand-name">AI 산학협력 관리 시스템</div>
        <div className="brand-sub">부산대학교 AI융합교육원</div>
      </div>
      <div className="brand-divider" />
      <nav className="nav">
        <Link href={DASHBOARD.href} className={`nav-item${activeHref === DASHBOARD.href ? ' active' : ''}`}>
          <span className="nav-icon">{DASHBOARD.icon}</span>
          <span>{DASHBOARD.label}</span>
        </Link>

        {GROUPS.map((g) => (
          <div key={g.key} className="nav-group">
            <button type="button" className={`nav-group-header${open[g.key] ? ' open' : ''}`} onClick={() => toggle(g.key)}>
              <span className="nav-icon">{g.icon}</span>
              <span>{g.label}</span>
              <span className="nav-caret">{open[g.key] ? '▾' : '▸'}</span>
            </button>
            {open[g.key] && g.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-item nav-sub${activeHref === it.href ? ' active' : ''}`}
              >
                <span>{it.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="nav-group nav-family">
        <button
          type="button"
          className={`nav-group-header${familyOpen ? ' open' : ''}`}
          onClick={() => setFamilyOpen((o) => !o)}
        >
          <span>패밀리 사이트</span>
          <span className="nav-caret">{familyOpen ? '▾' : '▸'}</span>
        </button>
        {familyOpen && FAMILY.map((f) => (
          <a
            key={f.href}
            href={f.href}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item nav-sub nav-external"
          >
            <span>{f.label}</span>
            {f.hint && <span className="nav-hint">{f.hint}</span>}
            <span className="nav-ext-arrow">↗</span>
          </a>
        ))}
      </div>

      {userEmail && (
        <div className="sidebar-user">
          <div className="user-name">{userName || userEmail.split('@')[0]}</div>
          <div className="user-email">{userEmail}</div>
          {logoutSlot}
        </div>
      )}
      <div className="sidebar-footer">v2.1.0 © 2026</div>
    </aside>
  );
}
