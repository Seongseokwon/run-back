import type { ReactNode } from 'react';

/**
 * 작은 라벨 조각.
 *
 * 색만으로 뜻을 전하지 않는다 (WCAG 1.4.1) — 배지에는 항상 글자가 들어 있고,
 * 색은 그 글자를 거드는 역할만 한다.
 */
const TONES = {
  neutral: 'bg-surface-sunken text-ink-muted',
  brand: 'bg-brand-soft text-brand-ink',
  outline: 'border border-line-strong text-ink-muted',
} as const;

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-micro font-bold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const ZONE_NAME: Record<string, string> = {
  E: '이지',
  M: '마라톤',
  T: '역치',
  I: '인터벌',
  R: '리피티션',
};

/**
 * 페이스 존 배지 (E/M/T/I/R).
 *
 * 존마다 색을 다르게 주고 싶은 유혹이 있지만, 크림 배경에서 5색을 전부
 * 4.5:1 로 맞추면 색이 탁해져 오히려 구분이 안 된다. 글자가 곧 구분이다.
 */
export function ZoneBadge({ zone }: { zone: string }) {
  return (
    <span
      className="tabular inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-soft text-micro font-extrabold text-brand-ink"
      title={ZONE_NAME[zone] ? `${ZONE_NAME[zone]} 존` : undefined}
    >
      {zone}
      <span className="sr-only">{ZONE_NAME[zone] ? ` ${ZONE_NAME[zone]} 존` : ' 존'}</span>
    </span>
  );
}
