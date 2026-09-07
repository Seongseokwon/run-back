/**
 * 목표 타당성 판정 — PRD §7.3 ★ 핵심 차별 기능
 *
 * 불가능한 목표를 그냥 플랜으로 만들어 주는 것이 가장 무책임하다.
 * 이 모듈은 "안 된다"고 말할 수 있어야 하고, 동시에 **즉시 대안을 내놓아야** 한다.
 *
 * 엔진은 생성을 차단하지 않는다. 판정과 대안을 모두 계산해 반환하고,
 * 차단 여부는 UI 의 책임으로 둔다. 그래야 "목표를 낮추면 바로 이 플랜" 을
 * 한 화면에 보여줄 수 있다.
 */

import { predictRaceTimeSec, vdotFromRace } from './daniels.ts';
import { trainingCapacity, weeklyGainRate } from './gain.ts';
import { RACE_DISTANCE_M, clamp, round } from './units.ts';
import type { GoalInput } from './types.ts';

export type Verdict = 'safe' | 'challenging' | 'unrealistic';

/** 거리별 최소 권장 주차 — PRD §7.3 별도 게이트 */
export const MIN_WEEKS: ReadonlyArray<{ maxDistanceM: number; weeks: number }> = [
  { maxDistanceM: RACE_DISTANCE_M['5K'], weeks: 6 },
  { maxDistanceM: RACE_DISTANCE_M['10K'], weeks: 8 },
  { maxDistanceM: RACE_DISTANCE_M.HALF, weeks: 10 },
  { maxDistanceM: RACE_DISTANCE_M.FULL, weeks: 12 },
];

/** 안정권 경계 — gap 이 capacity 의 이 비율 이하면 안정권 */
export const SAFE_RATIO = 0.6;
/** 완주 목표에서 이 비율 미만이면 기간 자체가 비현실적 */
export const FINISH_MIN_RATIO = 0.6;

export function minWeeksFor(distanceM: number): number {
  for (const row of MIN_WEEKS) {
    if (distanceM <= row.maxDistanceM) return row.weeks;
  }
  return MIN_WEEKS[MIN_WEEKS.length - 1]!.weeks;
}

export type FeasibilityInput = {
  vdot: number;
  raceDistanceM: number;
  goal: GoalInput;
  weeksAvailable: number;
  daysPerWeek: 3 | 4 | 5 | 6;
  /** fitness 추정이 보수적으로 다뤄져야 하는 입력인지 (§7.2 novice) */
  conservative?: boolean;
};

export type Feasibility = {
  verdict: Verdict;
  currentVdot: number;
  /** 목표 기록에 필요한 VDOT. 완주 목표면 null */
  requiredVdot: number | null;
  /** requiredVdot - currentVdot. 완주 목표면 0 */
  gap: number;
  /** 남은 기간에 쌓을 수 있는 VDOT 총량 */
  capacity: number;
  weeklyGain: number;
  weeksAvailable: number;
  minWeeksRecommended: number;
  /** 최소 권장 주차 미달 여부 */
  durationShort: boolean;
  /** 기록 목표 입력 자체를 막아야 하는지 (풀코스 기간 미달, §7.3) */
  timeGoalBlocked: boolean;
  /** 이 판정에 따라 엔진이 실제로 사용할 목표. 차단 시 완주로 강제 전환된다 */
  effectiveGoal: GoalInput;
  /** 도전적 상한에 해당하는 대안 기록(초) */
  achievableTimeSec: number;
  achievableVdot: number;
  /** 안정권에 해당하는 대안 기록(초) */
  comfortableTimeSec: number;
  comfortableVdot: number;
  /** UI 근거 문장 키. 겁주지 말고 대안을 즉시 제시할 것 (§7.3) */
  reasons: string[];
};

export function assessFeasibility(input: FeasibilityInput): Feasibility {
  const { vdot, raceDistanceM, goal, weeksAvailable, daysPerWeek, conservative = false } = input;

  const minWeeks = minWeeksFor(raceDistanceM);
  const durationShort = weeksAvailable < minWeeks;
  const isFull = raceDistanceM >= RACE_DISTANCE_M.FULL;
  const timeGoalBlocked = durationShort && isFull;

  const capacity = trainingCapacity({ vdot, weeks: weeksAvailable, daysPerWeek, conservative });
  const weeklyGain = weeklyGainRate(vdot, daysPerWeek);

  const achievableVdot = vdot + capacity;
  const comfortableVdot = vdot + capacity * SAFE_RATIO;
  const achievableTimeSec = predictRaceTimeSec(achievableVdot, raceDistanceM);
  const comfortableTimeSec = predictRaceTimeSec(comfortableVdot, raceDistanceM);

  const reasons: string[] = [];
  if (durationShort) {
    reasons.push(`${Math.round(raceDistanceM / 1000)}km 준비에는 ${minWeeks}주를 권장하는데 ${weeksAvailable}주 남았습니다`);
  }
  if (conservative) {
    reasons.push('실력 추정 신뢰도가 낮아 판정을 보수적으로 했습니다');
  }

  // ── 완주 목표 ──────────────────────────────────────────────
  if (goal.kind === 'finish' || timeGoalBlocked) {
    if (timeGoalBlocked) {
      reasons.push('풀코스는 기간이 부족하면 기록 목표를 세우지 않습니다. 완주 목표로 전환했습니다');
    }
    const verdict: Verdict = !durationShort
      ? 'safe'
      : weeksAvailable >= minWeeks * FINISH_MIN_RATIO
        ? 'challenging'
        : 'unrealistic';
    if (verdict === 'unrealistic') {
      reasons.push('완주에 필요한 최소 적응 기간에도 못 미칩니다. 다음 대회를 목표로 잡는 편이 안전합니다');
    }
    return {
      verdict,
      currentVdot: round(vdot, 2),
      requiredVdot: null,
      gap: 0,
      capacity: round(capacity, 3),
      weeklyGain: round(weeklyGain, 4),
      weeksAvailable,
      minWeeksRecommended: minWeeks,
      durationShort,
      timeGoalBlocked,
      effectiveGoal: { kind: 'finish' },
      achievableTimeSec,
      achievableVdot: round(achievableVdot, 2),
      comfortableTimeSec,
      comfortableVdot: round(comfortableVdot, 2),
      reasons,
    };
  }

  // ── 기록 목표 ──────────────────────────────────────────────
  const requiredVdot = vdotFromRace(raceDistanceM, goal.targetSec).raw;
  const gap = requiredVdot - vdot;

  let verdict: Verdict;
  if (gap <= capacity * SAFE_RATIO) {
    verdict = 'safe';
    if (gap <= 0) {
      reasons.push('지금 실력으로도 목표 기록에 닿습니다. 목표를 조금 높여도 됩니다');
    } else {
      reasons.push('남은 기간 대비 여유가 있습니다. 목표를 높여도 됩니다');
    }
  } else if (gap <= capacity) {
    verdict = 'challenging';
    reasons.push(`빠듯합니다. 주 ${daysPerWeek}회를 지키는 게 관건입니다`);
  } else {
    verdict = 'unrealistic';
    reasons.push('남은 기간에 올릴 수 있는 실력을 넘어서는 목표입니다');
  }

  // 기간 미달이면 한 단계 하향 (풀코스는 위에서 이미 완주로 전환됨)
  if (durationShort && verdict === 'safe') verdict = 'challenging';

  return {
    verdict,
    currentVdot: round(vdot, 2),
    requiredVdot: round(requiredVdot, 2),
    gap: round(gap, 3),
    capacity: round(capacity, 3),
    weeklyGain: round(weeklyGain, 4),
    weeksAvailable,
    minWeeksRecommended: minWeeks,
    durationShort,
    timeGoalBlocked: false,
    effectiveGoal: goal,
    achievableTimeSec,
    achievableVdot: round(achievableVdot, 2),
    comfortableTimeSec,
    comfortableVdot: round(comfortableVdot, 2),
    reasons,
  };
}

/**
 * §7.5 규칙 5 — 계산된 피크 볼륨이 목표 달성에 필요한 수준에 못 미치면
 * 판정을 한 단계 하향한다. 볼륨 곡선을 만든 뒤 호출한다.
 */
export function downgradeVerdict(verdict: Verdict): Verdict {
  return verdict === 'safe' ? 'challenging' : verdict === 'challenging' ? 'unrealistic' : 'unrealistic';
}

/** 판정에 따른 볼륨 여유 계수. 비현실적이어도 완주 플랜은 만들어야 하므로 0 이 없다 */
export function verdictVolumeFactor(verdict: Verdict): number {
  return clamp(verdict === 'safe' ? 1 : verdict === 'challenging' ? 0.95 : 0.85, 0.5, 1);
}
