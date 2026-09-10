'use client';

import { RACE_DISTANCE_M } from '@runback/engine';

/**
 * 거리 선택 — 표준 4종 + 직접 입력.
 *
 * `Segmented` 를 쓰지 않는 이유: 저건 `flex-1` 로 3개 이하일 때를 전제한 컴포넌트라
 * 5칸을 넣으면 모바일에서 라벨이 줄바꿈된다. 여기서는 격자로 접는다.
 */

export const CUSTOM = 'custom' as const;

export type DistanceChoice = keyof typeof RACE_DISTANCE_M | typeof CUSTOM;

const OPTIONS: readonly { value: DistanceChoice; label: string }[] = [
  { value: '5K', label: '5K' },
  { value: '10K', label: '10K' },
  { value: 'HALF', label: '하프' },
  { value: 'FULL', label: '풀' },
  { value: CUSTOM, label: '직접' },
];

/** 선택값을 미터로. 직접 입력이면 km 값을 쓴다 */
export function distanceMeters(choice: DistanceChoice, customKm: number): number {
  return choice === CUSTOM ? customKm * 1000 : RACE_DISTANCE_M[choice];
}

export function DistancePicker({
  value,
  onChange,
}: {
  value: DistanceChoice;
  onChange: (value: DistanceChoice) => void;
}) {
  return (
    <div role="radiogroup" aria-label="거리" className="grid grid-cols-5 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`h-11 rounded-control border text-body font-semibold transition-colors ${
            value === opt.value
              ? 'border-brand bg-brand-soft text-brand-ink'
              : 'border-line-strong bg-surface text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
