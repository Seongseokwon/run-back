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
      <Link href="/plan/new" className="text-[15px] font-bold text-brand-ink">
        플랜 만들기
      </Link>
    </header>
  );
}

/** 공개 페이지 푸터. 방침 링크는 항상 접근 가능해야 한다 */
export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-line px-5 py-6">
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-muted">
        <Link href="/privacy" className="font-semibold text-ink">
          개인정보처리방침
        </Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/plan/new">플랜 만들기</Link>
      </nav>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
        {SITE_NAME}이 제공하는 훈련 플랜은 일반적인 훈련 정보이며 의학적 조언이 아닙니다.
      </p>
    </footer>
  );
}
