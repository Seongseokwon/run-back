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
import { allocatePhases, buildVolumeCurve } from './periodization.ts';
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

/**
 * 🔴 비현실적 경계. gap 이 capacity 의 이 배수를 넘어야 비로소 '불가능'이라고 말한다.
 *
 * **왜 1.0 이 아닌가.** capacity 는 향상률 모델에서 나오는데, PRD §7.3 이 그 값을
 * "가설 — 실데이터 확보 후 반드시 보정"이라고 못 박아 뒀고 ADR-0002 가 안전계수 0.5 를
 * 이미 곱해 둔 값이다. 그렇게 보수적인 추정치를 **3초 차이로 넘었다고 "불가능"**이라
 * 선언하면 모델이 가진 불확실성보다 판정이 더 단정적이게 된다.
 *
 * 실제로 하프 1:50 러너가 14주에 1:45 를 목표로 하면 달성가능 예측이 1:45:03 이었다.
 * 3초 모자란 것을 🔴(생성 차단)로 처리하는 것은 과신이다. 그 구간은 🟡 도전적이 맞다.
 *
 * 🔴 는 "대안을 제시하며 목표를 바꾸라"고 말하는 자리다. 그만큼 확신이 있을 때만 쓴다.
 */
export const UNREALISTIC_MARGIN = 1.15;

/**
 * 완주에 필요한 **대회 시점의 주간 거리(km)**.
 *
 * 하프·풀 완주는 속도가 아니라 **지구력**의 문제다. VDOT 가 높아도 주간 거리가 없으면
 * 그 거리를 견디지 못한다. 반대로 이미 충분히 뛰고 있으면 기간이 짧아도 완주는 한다.
 * 그래서 판정을 달력이 아니라 여기서 낸다.
 *
 * 값은 통상적인 코칭 지침 범위의 **하한**이다 — 이 아래면 완주 자체가 위험하다는 선이지,
 * 권장량이 아니다.
 */
export const FINISH_WEEKLY_KM: ReadonlyArray<{ maxDistanceM: number; km: number }> = [
  { maxDistanceM: RACE_DISTANCE_M['5K'], km: 15 },
  { maxDistanceM: RACE_DISTANCE_M['10K'], km: 20 },
  { maxDistanceM: RACE_DISTANCE_M.HALF, km: 30 },
  { maxDistanceM: RACE_DISTANCE_M.FULL, km: 45 },
];

/** 대회 시점 예상 주간 거리가 필요량의 이 비율 미만이면 완주 자체가 무리 */
export const FINISH_READY_MIN = 0.75;

export function minWeeksFor(distanceM: number): number {
  for (const row of MIN_WEEKS) {
    if (distanceM <= row.maxDistanceM) return row.weeks;
  }
  return MIN_WEEKS[MIN_WEEKS.length - 1]!.weeks;
}

export function finishWeeklyKmFor(distanceM: number): number {
  for (const row of FINISH_WEEKLY_KM) {
    if (distanceM <= row.maxDistanceM) return row.km;
  }
  return FINISH_WEEKLY_KM[FINISH_WEEKLY_KM.length - 1]!.km;
}

export type Endurance = {
  /** 완주에 필요한 대회 시점 주간 거리 */
  requiredWeeklyKm: number;
  /** 이 플랜이 실제로 도달할 주간 거리 피크 (볼륨 곡선 기준) */
  projectedWeeklyKm: number;
  /** projected / required */
  ratio: number;
  verdict: Verdict;
};

/**
 * 완주 준비도 — **이 거리를 견딜 몸이 되는가**.
 *
 * 기록 목표든 완주 목표든 이 판정보다 좋아질 수 없다 (§7.3). 속도는 있는데 거리를
 * 못 뛰는 사람에게 "안정권"이라고 말하면 §7.10 안전 규칙과 정면으로 어긋난다.
 */
export function assessEndurance(args: {
  weeklyKm: number;
  raceDistanceM: number;
  weeksAvailable: number;
  daysPerWeek: 3 | 4 | 5 | 6;
  conservative?: boolean;
}): Endurance {
  const { weeklyKm, raceDistanceM, weeksAvailable, daysPerWeek, conservative = false } = args;

  const requiredWeeklyKm = finishWeeklyKmFor(raceDistanceM);

  /*
   * 증가율을 지어내지 않는다. **엔진이 실제로 만들 볼륨 곡선의 피크**를 그대로 쓴다.
   *
   * 그 곡선은 이미 ACWR 1.30 하드 클램프와 4주 중 1회 감량 주차를 반영하고 있어서
   * "몇 주 뒤에 주 몇 km 를 뛰고 있을까"에 대한 가장 정직한 답이다.
   * 별도 상수를 두면 곡선이 바뀔 때 판정만 조용히 어긋난다.
   *
   * `volumeFactor` 는 1 로 둔다 — 판정 결과에 따라 볼륨을 줄이는 건 이 판정 **다음** 일이라,
   * 여기서 쓰면 순환이 된다. 묻는 것은 "정상적인 플랜이 완주 준비를 시켜 주는가"다.
   */
  const weeks = Math.max(1, Math.floor(weeksAvailable));
  const curve = buildVolumeCurve({
    phases: allocatePhases(weeks, raceDistanceM),
    startKm: Math.max(0, weeklyKm),
    distanceM: raceDistanceM,
    daysPerWeek,
  });

  // 추정 신뢰도가 낮으면 도달 볼륨을 덜 인정한다 (§7.2 novice)
  const projected = curve.peakKm * (conservative ? 0.85 : 1);
  const ratio = requiredWeeklyKm === 0 ? 1 : projected / requiredWeeklyKm;

  const verdict: Verdict = ratio >= 1 ? 'safe' : ratio >= FINISH_READY_MIN ? 'challenging' : 'unrealistic';

  return {
    requiredWeeklyKm,
    projectedWeeklyKm: round(projected, 1),
    ratio: round(ratio, 3),
    verdict,
  };
}

/** 둘 중 나쁜 판정. 어떤 근거로도 안전 쪽으로 올라가지 않는다 */
export function worseVerdict(a: Verdict, b: Verdict): Verdict {
  const rank: Record<Verdict, number> = { safe: 0, challenging: 1, unrealistic: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export type FeasibilityInput = {
  vdot: number;
  raceDistanceM: number;
  goal: GoalInput;
  weeksAvailable: number;
  daysPerWeek: 3 | 4 | 5 | 6;
  /**
   * 현재 주간 거리(km). **완주 준비도 판정에 쓴다** — 하프·풀은 속도가 아니라
   * 지구력이 완주를 가른다. 없으면 VDOT 에서 추정한 값이 들어온다 (§7.2).
   */
  weeklyKm: number;
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
  /** 최소 권장 주차 미달 여부. **이것만으로 비현실적이 되지는 않는다** */
  durationShort: boolean;
  /** 완주 준비도 (§7.3 지구력 게이트) */
  endurance: Endurance;
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
  const { vdot, raceDistanceM, goal, weeksAvailable, daysPerWeek, weeklyKm, conservative = false } = input;

  const minWeeks = minWeeksFor(raceDistanceM);
  const durationShort = weeksAvailable < minWeeks;
  const isFull = raceDistanceM >= RACE_DISTANCE_M.FULL;
  const timeGoalBlocked = durationShort && isFull;

  const endurance = assessEndurance({ weeklyKm, raceDistanceM, weeksAvailable, daysPerWeek, conservative });
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
    /*
     * 판정은 **지구력**에서 나온다. 기간은 한 단계 낮추기만 한다.
     *
     * 예전에는 `weeksAvailable >= minWeeks * 0.6` 이라는 달력 규칙 하나로 판정했는데,
     * 그러면 실력을 전혀 보지 않아서 **하프를 1:38 에 뛰는 사람과 10K 를 70분에 뛰는
     * 사람이 똑같이 '비현실적'** 이 됐다. 더 나쁜 건, 같은 사람이 기록 목표를 고르면
     * '도전적'인데 **더 쉬운 완주 목표를 고르면 '비현실적'** 이 되는 역전이었다.
     * PRD §7.3 도 기간 미달은 '전환'이라고만 적어 두었지 판정이라고 하지 않는다.
     */
    let verdict: Verdict = endurance.verdict;
    if (durationShort) verdict = downgradeVerdict(verdict);

    if (endurance.verdict === 'unrealistic') {
      reasons.push(
        `완주에는 주 ${endurance.requiredWeeklyKm}km 정도가 필요한데, 지금 페이스로 늘려도 대회 때 ` +
          `주 ${endurance.projectedWeeklyKm}km 입니다. 다음 대회를 목표로 잡는 편이 안전합니다`,
      );
    } else if (endurance.verdict === 'challenging') {
      reasons.push(`완주 거리를 견디려면 주간 거리를 ${endurance.requiredWeeklyKm}km 가까이 올려야 합니다`);
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
      endurance,
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
  } else if (gap <= capacity * UNREALISTIC_MARGIN) {
    verdict = 'challenging';
    reasons.push(`빠듯합니다. 주 ${daysPerWeek}회를 지키는 게 관건입니다`);
  } else {
    verdict = 'unrealistic';
    reasons.push('남은 기간에 올릴 수 있는 실력을 넘어서는 목표입니다');
  }

  // 기간 미달이면 한 단계 하향 (풀코스는 위에서 이미 완주로 전환됨)
  if (durationShort && verdict === 'safe') verdict = 'challenging';

  /*
   * 지구력 상한. 기록 목표라도 **그 거리를 견딜 몸이 아니면** 안정권일 수 없다.
   * 속도는 있는데 주간 거리가 없는 사람에게 🟢 를 주면 §7.10 안전 규칙과 정면으로 어긋난다.
   */
  verdict = worseVerdict(verdict, endurance.verdict);
  if (endurance.verdict !== 'safe') {
    reasons.push(
      `이 거리를 견디려면 주 ${endurance.requiredWeeklyKm}km 정도가 필요합니다 ` +
        `(대회 때 예상 주 ${endurance.projectedWeeklyKm}km)`,
    );
  }

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
    endurance,
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
