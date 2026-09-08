import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  /** 화면에서 지금 봐야 할 것 하나에만 쓴다. 남발하면 위계가 사라진다 */
  lifted = false,
}: {
  children: ReactNode;
  className?: string;
  lifted?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${lifted ? 'shadow-lifted' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/** 카드 위쪽에 붙는 작은 보라 라벨 — NEXT RACE, TODAY'S TRAINING */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-bold tracking-wide text-brand-ink uppercase">{children}</p>;
}
