'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import ThemeToggle from './ThemeToggle';
import { Icon, type IconName } from './icons';

type Item = { href: string; label: string };
type Group = { key: string; label: string; icon: IconName; items: Item[] };

const DASHBOARD = { href: '/', label: '대시보드', icon: 'dashboard' as IconName };

// 외부 서비스 바로가기 (패밀리 사이트). 새 탭으로 열림. hint 는 부가 안내용.
type ExternalLink = { href: string; label: string; hint?: string };
const FAMILY: ExternalLink[] = [
  { href: 'https://pnu-pcc.vercel.app/cse-trends', label: '코딩역량센터' },
  { href: 'https://code.pusan.ac.kr', label: '코드플레이스' },
  { href: 'https://pnu-emp.vercel.app', label: '정컴 취업현황' },
  { href: 'https://pnu-bootcamp-student-management.vercel.app/', label: '부트캠프 훈련생 관리' },
  { href: 'https://arise-ai.pusan.ac.kr/', label: 'Arise PNU' },
  { href: 'https://pnuai.github.io/', label: '브로슈어 협업 시스템' },
  { href: 'http://10.126.34.165:15980', label: 'AI 지식검색 (KB)', hint: '교내' },
];

const GROUPS: Group[] = [
  {
    key: 'company',
    label: '기업 관리',
    icon: 'building',
    items: [
      { href: '/companies', label: '기업 리스트' },
      { href: '/companies/new', label: '신규 기업 등록' },
      { href: '/grid', label: '엑셀 입력' },
    ],
  },
  {
    key: 'records',
    label: '산학·인턴십 실적',
    icon: 'chart',
    items: [
      { href: '/projects', label: '산학협력 현황' },
      { href: '/internships', label: '인턴십 현황' },
      { href: '/records/import', label: '실적 업로드' },
    ],
  },
  {
    key: 'swcu',
    label: 'SW중심대학 성과',
    icon: 'award',
    items: [
      { href: '/swcu', label: '성과 대시보드' },
      { href: '/swcu/import', label: '실적 엑셀 업로드' },
    ],
  },
  {
    key: 'students',
    label: '학생 이력',
    icon: 'school',
    items: [
      { href: '/students/dashboard', label: '학생 현황' },
      { href: '/students', label: '학생 목록' },
      { href: '/students/new', label: '신규 학생 등록' },
      { href: '/students/analytics', label: '통계분석' },
    ],
  },
];

type Props = {
  userEmail?: string | null;
  userName?: string | null;
  role?: Role | null;
  logoutSlot?: React.ReactNode;
  version?: string;
};

export default function Sidebar({ userEmail, userName, role, logoutSlot, version }: Props) {
  const pathname = usePathname();
  // 일반(GENERAL) 사용자는 대시보드만. 데이터 그룹 메뉴는 숨긴다.
  const isGeneral = role === 'GENERAL';

  const allHrefs = [DASHBOARD.href, ...GROUPS.flatMap((g) => g.items.map((i) => i.href))];
  const activeHref = (() => {
    let best: string | null = null;
    for (const href of allHrefs) {
      const match = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
      if (match && (!best || href.length > best.length)) best = href;
    }
    return best;
  })();

  // 아코디언: 여러 그룹을 동시에 열어둘 수 있음(직접 닫을 때까지 유지). 현재 페이지가 속한 그룹으로 시작.
  const activeGroup = GROUPS.find((g) => g.items.some((i) => i.href === activeHref))?.key ?? null;
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(activeGroup ? [activeGroup] : []));
  const [familyOpen, setFamilyOpen] = useState(false);

  // 사이드바 접힘(아이콘 레일). data-sidebar 속성/localStorage 와 동기화.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(document.documentElement.getAttribute('data-sidebar') === 'collapsed');
  }, []);
  const applyCollapsed = (next: boolean) => {
    setCollapsed(next);
    document.documentElement.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded');
    try { localStorage.setItem('sidebarCollapsed', next ? '1' : '0'); } catch {}
  };
  const toggleCollapsed = () => applyCollapsed(!collapsed);

  // 접힌 상태에서 그룹 아이콘 클릭 → 펼치면서 그 그룹 열기. 펼친 상태에서는 해당 그룹만 토글(나머지는 그대로 유지).
  const onGroup = (k: string) => {
    if (collapsed) { applyCollapsed(false); setOpenKeys((cur) => new Set(cur).add(k)); }
    else setOpenKeys((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  const onFamily = () => {
    if (collapsed) { applyCollapsed(false); setFamilyOpen(true); }
    else setFamilyOpen((o) => !o);
  };

  if (pathname === '/login') return null;

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src="/emblem.png" alt="부산대학교" width={32} height={32} />
        <div className="brand-text">
          <div className="brand-name">AI 산학협력 관리</div>
          <div className="brand-sub">부산대 AI융합교육원</div>
        </div>
      </div>
      <button
        type="button"
        className="sidebar-collapse"
        onClick={toggleCollapsed}
        aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
      >
        <Icon name="chevron" size={16} />
      </button>
      <div className="brand-divider" />

      <nav className="nav">
        <Link href={DASHBOARD.href} className={`nav-item${activeHref === DASHBOARD.href ? ' active' : ''}`} title={DASHBOARD.label}>
          <span className="nav-icon"><Icon name={DASHBOARD.icon} /></span>
          <span>{DASHBOARD.label}</span>
        </Link>

        {!isGeneral && GROUPS.map((g) => (
          <div key={g.key} className="nav-group">
            <button type="button" className={`nav-group-header${openKeys.has(g.key) ? ' open' : ''}`} onClick={() => onGroup(g.key)} title={g.label}>
              <span className="nav-icon"><Icon name={g.icon} /></span>
              <span>{g.label}</span>
              <span className="nav-caret">{openKeys.has(g.key) ? '▾' : '▸'}</span>
            </button>
            {openKeys.has(g.key) && g.items.map((it) => (
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
          onClick={onFamily}
          title="패밀리 사이트"
        >
          <span className="nav-icon"><Icon name="external" /></span>
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

      <div className="sidebar-bottom">
        <ThemeToggle />
        {userEmail && (
          <div className="sidebar-user">
            <div className="user-name">{userName || userEmail.split('@')[0]}</div>
            <div className="user-email">{userEmail}</div>
            {logoutSlot}
          </div>
        )}
        <div className="sidebar-footer">v{version ?? '0.0.0'} · 2026</div>
      </div>
    </aside>
  );
}
