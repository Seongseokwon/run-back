import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/config';

/** 앱 셸 상단 — 로고와 알림 */
export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-gutter pt-5 pb-3">
      <Link href="/today" className="text-card font-extrabold tracking-tight text-ink">
        {SITE_NAME}
      </Link>
      <button
        type="button"
        aria-label="알림"
        className="pressable -mr-2 flex size-touch items-center justify-center rounded-full text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
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

/**
 * 제목형 앱 헤더 — 로고 대신 화면 제목이 서는 탭.
 *
 * '나' 탭은 로고를 다시 보여 줄 이유가 없다. 목업도 여기서만 로고를 빼고
 * 제목을 헤더로 올린다 — 화면이 짧아 제목이 본문에 또 있으면 같은 말이 두 번 나온다.
 */
export function TitleHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-2 px-gutter pt-5 pb-3">
      <h1 className="min-w-0 truncate text-title font-extrabold tracking-tight text-ink">{title}</h1>
      {action}
    </header>
  );
}

/** 공개 페이지 상단 — 로고와 플랜 만들기 진입 */
export function PublicHeader() {
  return (
    /* 링크가 곧 터치 타깃이다. 글자 높이(24~28px)로 두면 모바일에서 정확히 못 누른다 */
    <header className="flex items-center justify-between px-gutter py-1">
      <Link
        href="/"
        className="flex min-h-touch items-center text-card font-extrabold tracking-tight text-ink"
      >
        {SITE_NAME}
      </Link>
      <Link
        href="/plan/new"
        className="flex min-h-touch items-center text-body font-bold text-brand-ink hover:text-brand-strong"
      >
        플랜 만들기
      </Link>
    </header>
  );
}

/** 공개 페이지 푸터. 방침 링크는 항상 접근 가능해야 한다 */
export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-line px-gutter py-6">
      {/* 푸터 링크도 44px 규칙을 지킨다. 줄 간격이 아니라 링크 자체가 타깃이다 */}
      <nav className="-my-2 flex flex-wrap gap-x-4 text-label text-ink-muted">
        <Link href="/privacy" className="flex min-h-touch items-center font-semibold text-ink">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="flex min-h-touch items-center">
          이용약관
        </Link>
        <Link href="/race" className="flex min-h-touch items-center">
          대회 일정
        </Link>
        <Link href="/plan/new" className="flex min-h-touch items-center">
          플랜 만들기
        </Link>
        <Link href="/tools/pace" className="flex min-h-touch items-center">
          페이스 계산기
        </Link>
        <Link href="/tools/vdot" className="flex min-h-touch items-center">
          VDOT 계산기
        </Link>
      </nav>
      <p className="mt-3 text-micro text-ink-muted">
        {SITE_NAME}이 제공하는 훈련 플랜은 일반적인 훈련 정보이며 의학적 조언이 아닙니다.
      </p>
    </footer>
  );
}
