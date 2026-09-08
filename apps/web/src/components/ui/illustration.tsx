import { ILLUSTRATIONS, type IllustrationName } from '@/lib/illustrations';

/**
 * 일러스트 슬롯.
 *
 * 그림이 없으면 같은 비율의 플레이스홀더를 그린다. 나중에 그림이 들어와도
 * 레이아웃이 밀리지 않는다 (PRD §10.9 CLS 방어).
 * 장식이므로 스크린리더에서는 숨긴다.
 */
export function Illustration({
  name,
  className = '',
  width,
}: {
  name: IllustrationName;
  className?: string;
  /** px. 높이는 ratio 로 계산된다 */
  width: number;
}) {
  const slot = ILLUSTRATIONS[name];
  const height = Math.round(width / slot.ratio);

  if (!slot.src) {
    return (
      <div
        aria-hidden
        style={{ width, height }}
        className={`flex shrink-0 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-sunken/60 ${className}`}
      >
        <span className="px-2 text-center text-[11px] leading-tight text-ink-muted">{slot.note}</span>
      </div>
    );
  }

  /* eslint-disable-next-line @next/next/no-img-element -- 장식용 고정 크기 이미지 */
  return (
    <img
      src={slot.src}
      alt=""
      aria-hidden
      width={width}
      height={height}
      className={`shrink-0 select-none ${className}`}
    />
  );
}
