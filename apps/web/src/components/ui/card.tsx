import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface ${className}`}>{children}</div>
  );
}

/** 카드 위쪽에 붙는 작은 보라 라벨 — NEXT RACE, TODAY'S TRAINING */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] font-bold tracking-wide text-brand uppercase">{children}</p>
  );
}
