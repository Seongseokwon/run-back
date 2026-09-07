/**
 * VDOT 향상률 모델 확인용 출력. `node packages/engine/scripts/print-gain.ts`
 * PRD §7.3 초기값(계단 함수)과 ADR-0002 모델(연속 감쇠)을 나란히 본다.
 */

import { trainingCapacity, weeklyGainPct, weeklyGainRate } from '../src/gain.ts';

/** PRD v1.1 §7.3 초기 가설값 (4일 기준) */
function prdRate(vdot: number): number {
  if (vdot < 35) return 0.2;
  if (vdot < 45) return 0.13;
  if (vdot < 55) return 0.08;
  return 0.04;
}

console.log('\nVDOT | %/주   | pts/주(4일) | 12주 capacity | PRD 초기값(12주)');
console.log('-----+--------+-------------+---------------+-----------------');
for (const v of [30, 32, 35, 40, 45, 50, 55, 60, 65, 70]) {
  console.log(
    [
      String(v).padStart(4),
      (weeklyGainPct(v) * 100).toFixed(3).padStart(6),
      weeklyGainRate(v, 4).toFixed(3).padStart(11),
      trainingCapacity({ vdot: v, weeks: 12, daysPerWeek: 4 }).toFixed(2).padStart(13),
      (prdRate(v) * 12).toFixed(2).padStart(16),
    ].join(' | '),
  );
}
console.log();
