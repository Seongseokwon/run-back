'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * 하단 탭바 — 로그인 사용자의 앱 셸에만 붙는다.
 * 공개 SEO 페이지(`/`, `/race/*`, `/plan/*`)에는 붙이지 않는다.
 * 크롤러가 매 페이지 탭바를 보게 하지 않고, 게스트가 누를 데 없는 탭을 보지 않게 하기 위함이다.
 */

type Tab = { href: string; label: string; icon: ReactNode };

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const TABS: Tab[] = [
  {
    href: '/today',
    label: '오늘',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M3 10.5L12 3l9 7.5M5.5 9.5V20h13V9.5" />
      </svg>
    ),
  },
  {
    href: '/races',
    label: '대회',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M7 4h10v5a5 5 0 01-10 0V4zM7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3M12 14v4M9 21h6" />
      </svg>
    ),
  },
  {
    href: '/log',
    label: '기록',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: '/me',
    label: '나',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0115 0" />
      </svg>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-line bg-canvas"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`pressable flex h-tabbar flex-1 flex-col items-center justify-center gap-1 ${
              active ? 'text-brand-ink' : 'text-ink'
            }`}
          >
            {tab.icon}
            <span className="text-[11px] font-semibold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
