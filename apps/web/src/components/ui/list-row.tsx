import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/** 세션 완료 상태 — PRD F-12 주차 완료 체크 */
export type RowStatus = 'done' | 'todo' | 'rest';

function StatusMark({ status }: { status: RowStatus }) {
  if (status === 'rest') return <span className="text-ink-muted">—</span>;
  if (status === 'done') {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white">
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M4 10.5l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return <span className="block size-6 rounded-full border-2 border-line-strong" />;
}

export function SessionRow({
  day,
  status,
  title,
  href,
}: {
  day: string;
  status: RowStatus;
  title: ReactNode;
  href?: ComponentProps<typeof Link>['href'];
}) {
  const inner = (
    <>
      <span className="w-6 shrink-0 text-[15px] font-semibold text-ink">{day}</span>
      <span className="flex w-8 shrink-0 justify-center">
        <StatusMark status={status} />
      </span>
      <span className={`flex-1 text-[16px] ${status === 'rest' ? 'text-ink-muted' : 'text-ink'}`}>
        {title}
      </span>
      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );

  const cls = 'flex min-h-touch items-center gap-3 border-b border-line py-3 last:border-b-0';
  return href ? (
    <Link href={href} className={`${cls} pressable -mx-2 rounded-lg px-2 hover:bg-surface-sunken/50`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
