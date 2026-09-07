/**
 * fitness 입력 3경로 → VDOT 단일 지표 정규화 (PRD §7.2)
 *
 * 5개 훈련 존이 모두 VDOT 에서 파생되므로 지표를 하나로 통일한다.
 *
 * ⚠️ 이 파일의 계수 대부분은 **가설**이다. race 경로만 공개 근사식에 근거하고,
 *    feel/novice 경로는 실사용 데이터로 보정해야 한다 (PRD §18 O2 와 같은 성격).
 */

import { VDOT_MAX, VDOT_MIN, paceForIntensity, vdotFromPaceAtIntensity, vdotFromRace } from './daniels.ts';
import { E_CENTER } from './zones.ts';
import { clamp, round } from './units.ts';
import type { Confidence, FitnessInput } from './types.ts';

/** novice 프리셋 VDOT 밴드 — PRD §7.2 "30~35 구간에 매핑" */
export const NOVICE_VDOT_FLOOR = 30;
export const NOVICE_VDOT_CEIL = 35;

/**
 * 주간 거리에서 유도하는 VDOT 상한(가설).
 * 훈련량이 뒷받침하지 못하는 자기신고 페이스를 부드럽게 눌러 준다.
 */
export function vdotCeilingFromVolume(weeklyKm: number): number {
  return clamp(28 + 0.5 * weeklyKm, 30, 62);
}

/** 상한을 넘는 부분만 35%로 축소하는 소프트 클램프 */
function softCap(value: number, ceiling: number): number {
  return value <= ceiling ? value : ceiling + (value - ceiling) * 0.35;
}

export type FitnessEstimate = {
  vdot: number;
  confidence: Confidence;
  /** 입력되지 않았으면 추정한 값 */
  weeklyKm: number;
  /** weeklyKm 이 추정치인지 */
  weeklyKmEstimated: boolean;
  /** 타당성 판정을 항상 보수적으로 다뤄야 하는 입력인지 (§7.2 novice) */
  conservative: boolean;
  /** UI 근거 문장에 쓸 처리 내역 */
  notes: string[];
};

/** race 경로에서 주간 거리를 보수적으로 역추정 */
function weeklyKmFromVdot(vdot: number): number {
  return clamp(round(((vdot - 28) / 0.5) * 0.6), 10, 60);
}

export function estimateFitness(fitness: FitnessInput, currentWeeklyKm?: number): FitnessEstimate {
  const notes: string[] = [];

  switch (fitness.kind) {
    case 'race': {
      const { vdot, clamped } = vdotFromRace(fitness.distanceM, fitness.timeSec);
      if (clamped) notes.push(`VDOT를 엔진 신뢰 구간(${VDOT_MIN}~${VDOT_MAX})으로 조정했습니다`);
      const estimated = currentWeeklyKm === undefined;
      const weeklyKm = currentWeeklyKm ?? weeklyKmFromVdot(vdot);
      if (estimated) notes.push('주간 거리 미입력 — 기록 기준으로 보수적으로 추정했습니다');
      return {
        vdot: round(vdot, 2),
        confidence: 'high',
        weeklyKm,
        weeklyKmEstimated: estimated,
        conservative: false,
        notes,
      };
    }

    case 'feel': {
      const weeklyKm = currentWeeklyKm ?? fitness.weeklyKm;
      const rawVdot = vdotFromPaceAtIntensity(fitness.easyPaceSecPerKm, E_CENTER);
      const ceiling = vdotCeilingFromVolume(weeklyKm);
      const capped = softCap(rawVdot, ceiling);
      if (capped < rawVdot) {
        notes.push(`주간 ${weeklyKm}km 기준으로는 신고 페이스가 높아 추정치를 낮췄습니다`);
      }
      const vdot = clamp(capped, VDOT_MIN, VDOT_MAX);
      return {
        vdot: round(vdot, 2),
        confidence: weeklyKm >= 30 ? 'medium' : 'low',
        weeklyKm,
        weeklyKmEstimated: false,
        conservative: weeklyKm < 30,
        notes,
      };
    }

    case 'novice': {
      const minutes = clamp(fitness.canRunMin, 0, 120);
      // 0~40분을 프리셋 밴드에 선형 매핑. 40분 이상은 상한 고정
      const t = clamp(minutes / 40, 0, 1);
      const vdot = round(NOVICE_VDOT_FLOOR + (NOVICE_VDOT_CEIL - NOVICE_VDOT_FLOOR) * t, 2);
      notes.push('입문자 프리셋으로 추정했습니다. 첫 2주 기록으로 다시 맞춥니다');

      const easyPaceSecPerKm = paceForIntensity(vdot, E_CENTER);
      const sessionKm = (minutes * 60) / easyPaceSecPerKm;
      const estimatedWeekly = clamp(round(sessionKm * 3), 8, 40);
      const estimated = currentWeeklyKm === undefined;
      return {
        vdot,
        confidence: 'low',
        weeklyKm: currentWeeklyKm ?? estimatedWeekly,
        weeklyKmEstimated: estimated,
        conservative: true,
        notes,
      };
    }
  }
}
