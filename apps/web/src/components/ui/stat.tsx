import type { ReactNode } from 'react';

/**
 * 큰 숫자. 이 제품 화면의 시각적 중심이다 (D-38, 5.0 KM).
 *
 * 크기는 활자 스케일의 figure 세 단계에 고정한다 — 화면마다 px 를 따로 정하면
 * 위계가 흐트러진다. `.figure` 가 자간·굵기·tabular-nums 를 함께 건다.
 */
const SIZES = { hero: 'text-hero', lg: 'text-figure', md: 'text-figure-sm' } as const;

const TONES = {
  ink: { value: 'text-ink', unit: 'text-ink-muted', caption: 'text-ink-muted' },
  brand: { value: 'text-brand-ink', unit: 'text-brand-ink', caption: 'text-ink-muted' },
} as const;

export function BigStat({
  value,
  unit,
  size = 'lg',
  tone = 'ink',
  caption,
}: {
  value: ReactNode;
  unit?: ReactNode;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  caption?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className={`figure ${SIZES[size]} ${t.value}`}>{value}</span>
        {unit ? <span className={`text-section font-bold ${t.unit}`}>{unit}</span> : null}
      </p>
      {caption ? (
        <p className={`mt-1.5 text-label font-semibold tracking-[0.08em] uppercase ${t.caption}`}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/** 작은 숫자 한 칸 — '나' 탭 통계처럼 여러 개를 나란히 둘 때 */
export function MiniStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="px-2 text-center">
      <p className="figure text-card text-ink">{value}</p>
      <p className="mt-1 text-micro font-semibold text-ink-muted">{label}</p>
    </div>
  );
}
