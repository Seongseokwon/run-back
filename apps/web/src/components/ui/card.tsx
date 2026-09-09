import type { ReactNode } from 'react';

/**
 * 카드 톤.
 *
 * 목업의 카드는 전부 밝은 면이다 — 보라로 꽉 채운 카드는 없다.
 * 위계는 색이 아니라 **떠 있는 정도**로 만든다.
 *
 *   plain   기본. 정보를 담는 대부분의 카드
 *   raised  지금 봐야 할 것 하나. 흰 면 + 그림자
 *   sunken  가라앉은 면. 보조 정보·안내
 */
const TONES = {
  plain: 'border border-line bg-surface',
  raised: 'border border-line bg-surface-raised shadow-lifted',
  sunken: 'bg-surface-sunken',
} as const;

export type CardTone = keyof typeof TONES;

export function Card({
  children,
  className = '',
  tone = 'plain',
}: {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
}) {
  return <div className={`rounded-card ${TONES[tone]} ${className}`}>{children}</div>;
}

/**
 * 카드 위쪽에 붙는 작은 보라 라벨 — NEXT RACE, TODAY'S TRAINING, 오늘의 훈련.
 * 목업에서 이 라벨은 화면에서 유일하게 보라인 글자라 마커 없이 색만으로 선다.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-label font-bold tracking-[0.06em] text-brand-ink uppercase">{children}</p>
  );
}
