import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';

/**
 * 화면·섹션의 리듬을 잡는 레이아웃 원자.
 *
 * 이전에는 화면마다 space-y-4/5/6/7 이 제각각이라 같은 앱의 다른 탭이
 * 서로 다른 밀도로 보였다. 간격을 화면이 고르지 않고 여기서 고정한다.
 */

/** 한 화면의 세로 리듬. 탭 화면은 전부 이걸 쓴다 */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="space-y-7 pb-2">{children}</div>;
}

/** 화면 제목. 화면당 하나 */
export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header>
      <h1 className="text-title font-extrabold tracking-tight text-ink">{children}</h1>
      {sub ? <p className="mt-1 text-body text-ink-muted">{sub}</p> : null}
    </header>
  );
}

/**
 * 섹션 하나 — 제목 + (선택)더보기 링크 + 본문.
 * 제목 크기·간격을 여기서만 정한다.
 */
export function Section({
  title,
  description,
  action,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  /** 제목 오른쪽 링크. <SectionAction> 를 넘긴다 */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      {title ? (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-section font-bold tracking-tight text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      {description ? <p className="mt-1 text-body text-ink-muted">{description}</p> : null}
      <div className={title || description ? 'mt-3' : ''}>{children}</div>
    </section>
  );
}

export function SectionAction({
  href,
  children,
}: {
  href: ComponentProps<typeof Link>['href'];
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="shrink-0 text-body font-bold text-brand-ink hover:text-brand-strong"
    >
      {children}
    </Link>
  );
}

/**
 * 안내 문단. 엔진이 조용히 줄인 걸 알리는 자리에 쓴다 (PRD §7.10).
 * 배경을 깔아 본문과 구분하되, 경고처럼 붉게 칠하지는 않는다 — 조정은 사고가 아니다.
 */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-control bg-surface-sunken px-4 py-3 text-label text-ink-muted">{children}</p>
  );
}
