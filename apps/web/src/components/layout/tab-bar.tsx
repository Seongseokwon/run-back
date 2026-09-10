'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 하단 탭바 — 로그인 사용자의 앱 셸에만 붙는다.
 * 공개 SEO 페이지(`/`, `/race/*`, `/plan/*`)에는 붙이지 않는다.
 * 크롤러가 매 페이지 탭바를 보게 하지 않고, 게스트가 누를 데 없는 탭을 보지 않게 하기 위함이다.
 *
 * 활성 탭은 보라로 물든다. 다만 **색만으로 표시하지는 않는다** (WCAG 1.4.1) —
 * 선 굵기와 라벨 굵기가 같이 바뀌어서 색을 못 봐도 어느 탭인지 알 수 있다.
 */

type Tab = { href: Route; label: string; path: string };

const TABS: Tab[] = [
  { href: '/today', label: '오늘', path: 'M3 10.5L12 3l9 7.5M5.5 9.5V20h13V9.5' },
  {
    href: '/races',
    label: '대회',
    path: 'M7 4h10v5a5 5 0 01-10 0V4zM7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3M12 14v4M9 21h6',
  },
  { href: '/log', label: '기록', path: 'M4 3h16v18H4zM8 8h8M8 12h8M8 16h5' },
  { href: '/me', label: '나', path: 'M12 4a4 4 0 110 8 4 4 0 010-8M4.5 21a7.5 7.5 0 0115 0' },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-line bg-canvas/95 backdrop-blur-sm"
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
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2.3 : 1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d={tab.path} />
            </svg>
            <span className={`text-micro ${active ? 'font-extrabold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
