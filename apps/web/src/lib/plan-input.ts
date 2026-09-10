/**
 * 임의의 값을 PlanInput 으로 확인한다.
 *
 * 왜 필요한가: 플랜 입력은 이제 두 경로로 들어온다 — URL(사용자가 손으로 고칠 수 있다)과
 * DB 의 JSON 컬럼(스키마가 형태를 보장하지 않는다). 둘 다 "그럴듯한 객체"일 뿐이라
 * 엔진에 넘기기 전에 실재하는 값인지 봐야 한다. 깨진 입력으로 훈련 플랜을 만드는 것보다
 * 아무것도 안 만드는 편이 안전하다.
 *
 * 경계값은 plan-url.ts 와 여기가 공유한다 — 한쪽만 느슨하면 그쪽이 구멍이 된다.
 */

import type { FitnessInput, GoalInput, PlanInput, RaceDistanceM } from '@runback/engine';

export const DISTANCES: readonly number[] = [5000, 10000, 21097.5, 42195];
export const DAYS: readonly number[] = [3, 4, 5, 6];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 형식뿐 아니라 실재하는 날짜인지도 본다. 2026-13-40 은 형식만 맞다 */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isNum(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function parseFitness(f: unknown): FitnessInput | null {
  if (typeof f !== 'object' || f === null) return null;
  const o = f as Record<string, unknown>;
  if (o['kind'] === 'race' && isNum(o['distanceM'], 800, 100_000) && isNum(o['timeSec'], 60, 12 * 3600)) {
    return { kind: 'race', distanceM: o['distanceM'], timeSec: o['timeSec'] };
  }
  if (o['kind'] === 'feel' && isNum(o['easyPaceSecPerKm'], 120, 1200) && isNum(o['weeklyKm'], 0, 300)) {
    return { kind: 'feel', easyPaceSecPerKm: o['easyPaceSecPerKm'], weeklyKm: o['weeklyKm'] };
  }
  if (o['kind'] === 'novice' && isNum(o['canRunMin'], 0, 600)) {
    return { kind: 'novice', canRunMin: o['canRunMin'] };
  }
  return null;
}

function parseGoal(g: unknown): GoalInput | null {
  if (typeof g !== 'object' || g === null) return null;
  const o = g as Record<string, unknown>;
  if (o['kind'] === 'time' && isNum(o['targetSec'], 60, 12 * 3600)) {
    return { kind: 'time', targetSec: o['targetSec'] };
  }
  if (o['kind'] === 'finish') return { kind: 'finish' };
  return null;
}

/** 조금이라도 어긋나면 null. 호출부는 반드시 이 경우를 처리해야 한다 */
export function parsePlanInput(value: unknown): PlanInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const o = value as Record<string, unknown>;

  if (!isValidDate(o['raceDate']) || !isValidDate(o['today'])) return null;
  if (typeof o['raceDistanceM'] !== 'number' || !DISTANCES.includes(o['raceDistanceM'])) return null;
  if (typeof o['daysPerWeek'] !== 'number' || !DAYS.includes(o['daysPerWeek'])) return null;

  const fitness = parseFitness(o['fitness']);
  const goal = parseGoal(o['goal']);
  if (!fitness || !goal) return null;

  const weeklyKm = o['currentWeeklyKm'];
  if (weeklyKm !== undefined && !isNum(weeklyKm, 0, 300)) return null;

  // 대회일이 생성일보다 앞서면 역산할 기간이 없다
  if (o['raceDate'] < o['today']) return null;

  return {
    raceDate: o['raceDate'],
    raceDistanceM: o['raceDistanceM'] as RaceDistanceM,
    today: o['today'],
    fitness,
    goal,
    daysPerWeek: o['daysPerWeek'] as 3 | 4 | 5 | 6,
    ...(weeklyKm !== undefined ? { currentWeeklyKm: weeklyKm as number } : {}),
  };
}
