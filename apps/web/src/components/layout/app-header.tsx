import Link from 'next/link';
import { SITE_NAME } from '@/lib/config';

/** 앱 셸 상단 — 로고와 알림 */
export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-2">
      <Link href="/today" className="text-[26px] font-extrabold tracking-tight text-ink">
        {SITE_NAME}
      </Link>
      <button type="button" aria-label="알림" className="p-1 text-ink">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path
            d="M18 8a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7M13.7 21a2 2 0 01-3.4 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </header>
  );
}

/** 공개 페이지 상단 — 로고와 플랜 만들기 진입 */
export function PublicHeader() {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      <Link href="/" className="text-[22px] font-extrabold tracking-tight text-ink">
        {SITE_NAME}
      </Link>
      <Link href="/plan/new" className="text-[15px] font-bold text-brand">
        플랜 만들기
      </Link>
    </header>
  );
}
