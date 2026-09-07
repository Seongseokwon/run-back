/**
 * 캘리브레이션 확인용 출력 스크립트.
 * `node packages/engine/scripts/print-table.ts` 로 실행한다.
 * VDOT 구간별 예상 기록과 페이스표를 눈으로 검증하기 위한 것이며 테스트가 아니다.
 */

import { RACE_DISTANCE_M, formatDuration, formatPace } from '../src/units.ts';
import { predictRaceTimeSec } from '../src/daniels.ts';
import { paceTable } from '../src/zones.ts';

const vdots = [30, 35, 40, 45, 50, 55, 60, 65, 70];

console.log('\n예상 기록');
console.log('VDOT |      5K |     10K |    하프 |      풀');
console.log('-----+---------+---------+---------+---------');
for (const v of vdots) {
  const row = (['5K', '10K', 'HALF', 'FULL'] as const)
    .map((k) => formatDuration(predictRaceTimeSec(v, RACE_DISTANCE_M[k])).padStart(7))
    .join(' | ');
  console.log(`${String(v).padStart(4)} | ${row}`);
}

console.log('\n존별 목표 페이스 (분:초/km)');
console.log('VDOT |             E |     M |     T |     I |     R | R(400m)');
console.log('-----+---------------+-------+-------+-------+-------+--------');
for (const v of vdots) {
  const t = paceTable(v);
  const e = `${formatPace(t.E.fastSecPerKm)}~${formatPace(t.E.slowSecPerKm)}`.padStart(13);
  const rest = (['M', 'T', 'I', 'R'] as const)
    .map((k) => formatPace(t[k].secPerKm).padStart(5))
    .join(' | ');
  console.log(`${String(v).padStart(4)} | ${e} | ${rest} | ${t.R.per400mSec.toFixed(0).padStart(6)}s`);
}
console.log();
