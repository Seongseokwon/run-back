/**
 * 엔진 진입점 — PlanInput → Plan (PRD §7 전체 조립)
 *
 * 순서
 *   fitness 정규화(§7.2) → 타당성 판정(§7.3) → 페이즈 배분(§7.4)
 *   → 볼륨 곡선 + ACWR(§7.5) → 판정 재조정(§7.5 규칙 5) → 세션 배치(§7.7)
 *
 * 결정론 계약: 같은 PlanInput 이면 항상 같은 Plan 이 나온다.
 * `today` 를 입력으로 받는 이유도 이것이다 — 엔진 안에서 현재 시각을 읽지 않는다.
 */

import { estimateFitness } from './fitness.ts';
import { assessFeasibility, downgradeVerdict, verdictVolumeFactor, type Feasibility, type Verdict } from './feasibility.ts';
import { allocatePhases, buildVolumeCurve, type Phase, type WeekVolume } from './periodization.ts';
import { buildWeekSessions, primaryZoneFor, type PlanSession } from './sessions.ts';
import { paceTable, type ZoneKey, type ZonePace } from './zones.ts';
import { addDays, weekStartDate, weeksAvailable } from './dates.ts';
import { convertRaceTime, type PredictionRange } from './riegel.ts';
import { predictRaceTimeSec } from './daniels.ts';
import { round } from './units.ts';
import { ENGINE_VERSION, type Confidence, type PlanInput } from './types.ts';

export type PlanWeek = {
  index: number;
  phase: Phase;
  startDate: string;
  totalKm: number;
  /** 검증용 — 개발 모드에서 노출 */
  acwr: number;
  /** ACWR 클램프 발동 여부 (§7.10 고지 트리거) */
  clamped: boolean;
  isDownWeek: boolean;
  sessions: PlanSession[];
  /** LLM 생성, 캐시됨 (§7.9). 엔진은 채우지 않는다 */
  comment?: string;
};

export type Plan = {
  engineVersion: string;
  input: PlanInput;
  verdict: Verdict;
  feasibility: Feasibility;
  currentVdot: number;
  confidence: Confidence;
  /** 예상 기록 범위 (초) */
  predicted: PredictionRange;
  paces: Record<ZoneKey, ZonePace>;
  weeks: PlanWeek[];
  peakWeeklyKm: number;
  /** 사용자에게 반드시 보여야 하는 고지 (§7.10) */
  notices: string[];
};

export const SAFETY_DISCLAIMER =
  '이 플랜은 일반적인 훈련 정보이며 의학적 조언이 아닙니다. 통증이 있으면 훈련을 중단하고 전문가와 상담하세요.';

export function generatePlan(input: PlanInput): Plan {
  const weeks = Math.max(1, weeksAvailable(input.today, input.raceDate));

  // 1. 실력 정규화 (§7.2)
  const fitness = estimateFitness(input.fitness, input.currentWeeklyKm);
  const paces = paceTable(fitness.vdot);

  // 2. 타당성 판정 (§7.3)
  const feasibility = assessFeasibility({
    vdot: fitness.vdot,
    raceDistanceM: input.raceDistanceM,
    goal: input.goal,
    weeksAvailable: weeks,
    daysPerWeek: input.daysPerWeek,
    conservative: fitness.conservative,
  });

  // 3~4. 페이즈 배분과 볼륨 곡선 (§7.4, §7.5)
  const phases = allocatePhases(weeks, input.raceDistanceM);
  const curve = buildVolumeCurve({
    phases,
    startKm: fitness.weeklyKm,
    distanceM: input.raceDistanceM,
    daysPerWeek: input.daysPerWeek,
    volumeFactor: verdictVolumeFactor(feasibility.verdict),
  });

  // 5. §7.5 규칙 5 — 피크가 목표에 못 미치면 판정을 한 단계 내린다
  const verdict: Verdict =
    curve.peakShortfall && feasibility.verdict !== 'unrealistic' ? downgradeVerdict(feasibility.verdict) : feasibility.verdict;

  // 예상 기록 — 현재 실력 기준. 대회 기록 입력이 있으면 Riegel 환산도 반영한다
  const predicted: PredictionRange =
    input.fitness.kind === 'race'
      ? convertRaceTime({
          fromDistanceM: input.fitness.distanceM,
          fromTimeSec: input.fitness.timeSec,
          toDistanceM: input.raceDistanceM,
          currentWeeklyKm: fitness.weeklyKm,
        })
      : (() => {
          const mid = predictRaceTimeSec(fitness.vdot, input.raceDistanceM);
          return { fastSec: mid * 0.96, midSec: mid, slowSec: mid * 1.06, exponent: 1, adjustments: [] };
        })();

  // 6. 세션 배치 (§7.7)
  const lastPrepPhase = [...phases].reverse().find((p): p is Exclude<Phase, 'taper'> => p !== 'taper');
  const taperZone: ZoneKey = lastPrepPhase ? primaryZoneFor(lastPrepPhase) : 'M';
  // Base 만 있는 초단기 플랜이면 테이퍼 강도를 E 로 두지 않고 M 으로 올린다
  const effectiveTaperZone: ZoneKey = taperZone === 'E' ? 'M' : taperZone;

  const planWeeks: PlanWeek[] = curve.weeks.map((v: WeekVolume) => {
    const startDate = weekStartDate(input.raceDate, weeks, v.index);
    return {
      index: v.index,
      phase: v.phase,
      startDate,
      totalKm: v.km,
      acwr: v.acwr,
      clamped: v.clamped,
      isDownWeek: v.isDownWeek,
      sessions: buildWeekSessions({
        volume: v,
        daysPerWeek: input.daysPerWeek,
        paces,
        raceDistanceM: input.raceDistanceM,
        weekStartIso: startDate,
        addDaysFn: addDays,
        taperZone: effectiveTaperZone,
        isRaceWeek: v.index === curve.weeks.length - 1,
        raceTimeSec: input.goal.kind === 'time' && verdict !== 'unrealistic' ? input.goal.targetSec : predicted.midSec,
      }),
    };
  });

  const notices: string[] = [SAFETY_DISCLAIMER, ...fitness.notes];
  if (curve.anyClamped) {
    notices.push(
      '안전한 훈련량 증가 폭(ACWR 1.3)을 넘는 주차가 있어 거리를 줄였습니다. 부상 위험을 낮추기 위한 조정입니다.',
    );
  }
  if (curve.peakShortfall) {
    notices.push(
      `현재 주간 거리에서 안전하게 도달할 수 있는 피크가 ${curve.peakKm}km 로, 목표에 필요한 ${curve.targetPeakKm}km 에 못 미칩니다. 판정을 한 단계 낮췄습니다.`,
    );
  }
  if (feasibility.timeGoalBlocked) {
    notices.push('남은 기간이 짧아 기록 목표 대신 완주 목표로 플랜을 만들었습니다.');
  }

  return {
    engineVersion: ENGINE_VERSION,
    input,
    verdict,
    feasibility,
    currentVdot: round(fitness.vdot, 2),
    confidence: fitness.confidence,
    predicted,
    paces,
    weeks: planWeeks,
    peakWeeklyKm: curve.peakKm,
    notices,
  };
}
