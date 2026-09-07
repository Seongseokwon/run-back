/**
 * 플랜 한 건을 눈으로 확인하는 스크립트.
 * `node packages/engine/scripts/print-plan.ts`
 * 기본 케이스는 PRD §16 도그푸딩 대상 — MBN 서울 마라톤 하프, D-10주.
 */

import { generatePlan } from '../src/plan.ts';
import { formatDuration, formatPace } from '../src/units.ts';
import type { PlanInput } from '../src/types.ts';

const input: PlanInput = {
  raceDate: '2026-11-15',
  raceDistanceM: 21097.5,
  today: '2026-09-07',
  fitness: { kind: 'race', distanceM: 10000, timeSec: 50 * 60 },
  goal: { kind: 'time', targetSec: 115 * 60 },
  daysPerWeek: 4,
  currentWeeklyKm: 30,
};

const plan = generatePlan(input);
const f = plan.feasibility;

console.log(`\n판정: ${plan.verdict}  (VDOT ${plan.currentVdot} → 목표 ${f.requiredVdot}, gap ${f.gap} / capacity ${f.capacity})`);
console.log(`예상: ${formatDuration(plan.predicted.fastSec)} ~ ${formatDuration(plan.predicted.slowSec)}`);
console.log(`대안: 도전적 ${formatDuration(f.achievableTimeSec)} / 안정권 ${formatDuration(f.comfortableTimeSec)}`);
console.log(`페이스 E ${plan.paces.E.display}  M ${plan.paces.M.display}  T ${plan.paces.T.display}  I ${plan.paces.I.display}`);
console.log(`피크 주간거리 ${plan.peakWeeklyKm}km\n`);

console.log('주차 | 페이즈 | 시작일     |   km | ACWR  | 세션');
console.log('-----+--------+------------+------+-------+------------------------------------------');
for (const w of plan.weeks) {
  const s = w.sessions
    .map((x) => `${'일월화수목금토'[x.dayOfWeek]}:${x.type}${x.distanceKm}k`)
    .join(' ');
  console.log(
    `${String(w.index + 1).padStart(4)} | ${w.phase.padEnd(6)} | ${w.startDate} | ${String(w.totalKm).padStart(4)} | ${String(w.acwr).padStart(5)}${w.clamped ? '!' : ' '}| ${s}`,
  );
}

console.log('\n마지막 주 상세');
for (const x of plan.weeks[plan.weeks.length - 1]!.sessions) {
  console.log(`  ${x.date} ${'일월화수목금토'[x.dayOfWeek]} ${x.type.padEnd(14)} ${String(x.distanceKm).padStart(5)}km ${String(x.durationMin).padStart(4)}분 ${x.structure ?? ''}`);
}

console.log('\n피크 주차 상세');
const peak = plan.weeks.find((w) => w.phase === 'peak') ?? plan.weeks[0]!;
for (const x of peak.sessions) {
  console.log(`  ${x.date} ${'일월화수목금토'[x.dayOfWeek]} ${x.type.padEnd(14)} ${String(x.distanceKm).padStart(5)}km ${String(x.durationMin).padStart(4)}분 [${x.targetZone}] ${x.structure ?? ''}`);
}

console.log('\n고지');
for (const n of plan.notices) console.log(`  - ${n}`);
console.log();
