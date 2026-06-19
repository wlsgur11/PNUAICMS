import type { ReactNode } from 'react';

export type IconName = 'dashboard' | 'building' | 'chart' | 'award' | 'school' | 'external' | 'chevron';

const PATHS: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M15 21V9h3a1 1 0 0 1 1 1v11" />
      <path d="M8 8h3M8 12h3M8 16h3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 5v14h16" />
      <path d="M7 15l4-4 3 2 5-6" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5L7 21l5-3 5 3-2-7.5" />
    </>
  ),
  school: (
    <>
      <path d="M22 9L12 5 2 9l10 4 10-4z" />
      <path d="M6 11v4c0 1.2 2.7 3 6 3s6-1.8 6-3v-4" />
    </>
  ),
  external: (
    <>
      <path d="M11 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      <path d="M14 4h6v6" />
      <path d="M10 14L20 4" />
    </>
  ),
  chevron: <path d="M15 6l-6 6 6 6" />,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
