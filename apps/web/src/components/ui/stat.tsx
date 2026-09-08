import type { ReactNode } from 'react';

/**
 * 큰 숫자. 이 제품 화면의 시각적 중심이다 (D-38, 5.0 KM).
 *
 * 화면마다 크기를 따로 정하면 위계가 흐트러져서 여기 세 단계로 고정한다.
 * `tabular` 는 숫자 폭을 맞춰 줄바꿈 때 흔들리지 않게 한다.
 */
const SIZES = {
  hero: 'text-[64px]',
  lg: 'text-[56px]',
  md: 'text-[40px]',
} as const;

export function BigStat({
  value,
  unit,
  size = 'lg',
  caption,
}: {
  value: ReactNode;
  unit?: ReactNode;
  size?: keyof typeof SIZES;
  caption?: ReactNode;
}) {
  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className={`tabular ${SIZES[size]} leading-none font-extrabold tracking-tighter text-ink`}>
          {value}
        </span>
        {unit ? <span className="text-[20px] font-bold text-ink-muted">{unit}</span> : null}
      </p>
      {caption ? (
        <p className="mt-1 text-[14px] font-medium tracking-wide text-ink-muted uppercase">{caption}</p>
      ) : null}
    </div>
  );
}
