/**
 * ⚠️ 임시 데이터.
 *
 * 계정·저장(§9)이 아직 없어서 화면이 보여줄 플랜이 없다. 그래서 실제 대회로
 * 엔진을 돌려 만든 플랜을 쓴다. 화면을 채우려는 목적만이 아니라
 * **엔진 → UI 배선이 실제로 동작하는지 확인하는 역할**도 한다.
 *
 * 여기서 만들어 내는 건 "내가 등록한 대회"뿐이다. 수행 기록(실제로 뛴 거리·페이스)은
 * 지어내지 않는다 — 없는 걸 있는 것처럼 보여 주면 화면을 보고 판단을 못 한다.
 *
 * F-17(내 보관함)이 붙으면 이 파일은 지우고 저장된 플랜을 읽는다.
 */

import { generatePlan, type Plan } from '@raceback/engine';
import { findRace, type Race } from '@raceback/races';

const DEMO_RACE_SLUG = 'mbn-seoul-marathon-2026';

export type MyRace = {
  plan: Plan;
  race: Race;
  distanceKm: number;
  /** 목표 표시용. '1:55:00' 또는 '완주' */
  goalLabel: string;
};

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

/**
 * 내가 등록한 대회 목록. 지금은 데모 하나뿐이지만 배열로 두는 이유는
 * 목업이 "새로운 목표를 추가해보세요" 로 **여러 목표 동시 관리**를 전제하기 때문이다 (PRD O16).
 */
export function myRaces(today: string): MyRace[] {
  const { plan, race } = demoPlan(today);
  return [
    {
      plan,
      race,
      distanceKm: plan.input.raceDistanceM / 1000,
      goalLabel: plan.input.goal.kind === 'time' ? formatGoal(plan.input.goal.targetSec) : '완주',
    },
  ];
}

/** 내 대회 하나. 없으면 undefined — 호출부가 404 로 처리한다 */
export function findMyRace(slug: string, today: string): MyRace | undefined {
  return myRaces(today).find((r) => r.race.slug === slug);
}

/** 지금 화면의 기준이 되는 대회 — 가장 가까운 것 */
export function primaryRace(today: string): MyRace | undefined {
  return [...myRaces(today)].sort((a, b) => a.race.date.localeCompare(b.race.date))[0];
}

function formatGoal(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
