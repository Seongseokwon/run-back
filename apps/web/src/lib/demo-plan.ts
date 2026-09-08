/**
 * ⚠️ 임시 데이터.
 *
 * 계정·저장(§9)이 아직 없어서 `/today` 가 보여줄 플랜이 없다. 그래서 실제 대회 하나로
 * 엔진을 돌려 만든 플랜을 쓴다. 화면을 채우려는 목적만이 아니라
 * **엔진 → UI 배선이 실제로 동작하는지 확인하는 역할**도 한다.
 *
 * F-17(내 보관함)이 붙으면 이 파일은 지운다.
 */

import { generatePlan, type Plan } from '@raceback/engine';
import { findRace, type Race } from '@raceback/races';

const DEMO_RACE_SLUG = 'mbn-seoul-marathon-2026';

export function demoPlan(today: string): { plan: Plan; race: Race } {
  const race = findRace(DEMO_RACE_SLUG);
  if (!race) throw new Error(`데모 대회를 찾을 수 없습니다: ${DEMO_RACE_SLUG}`);

  const plan = generatePlan({
    raceDate: race.date,
    raceDistanceM: 21097.5,
    today,
    fitness: { kind: 'race', distanceM: 10000, timeSec: 50 * 60 },
    goal: { kind: 'time', targetSec: 115 * 60 },
    daysPerWeek: 4,
    currentWeeklyKm: 30,
  });

  return { plan, race };
}
