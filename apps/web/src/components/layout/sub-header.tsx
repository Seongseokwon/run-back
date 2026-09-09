'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * 하위 화면 헤더 — 뒤로가기 + 제목 + 우측 액션.
 * 탭 안에서 한 단계 들어간 화면에 쓴다. 탭바는 그대로 남는다.
 */
export function SubHeader({ title, action }: { title: string; action?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-1 px-gutter pt-5 pb-3">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="뒤로"
        className="pressable -ml-3 flex size-touch shrink-0 items-center justify-center rounded-full text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className="min-w-0 flex-1 truncate text-section font-extrabold tracking-tight text-ink">
        {title}
      </h1>
      {action}
    </header>
  );
}
