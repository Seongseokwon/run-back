/**
 * 거리 환산 — Riegel 공식 + 보정 (PRD §7.2)
 *
 *   T2 = T1 × (D2 / D1)^e
 *
 * 보정 규칙
 *  - Riegel 은 하프까지는 잘 맞지만 하프→풀 환산에서 러너 절반 이상에게 10분 이상
 *    낙관적으로 나온다. 지수를 1.08로 올려도 레크리에이션 러너 3/4에게 여전히 낙관적이다.
 *  - 따라서 목표 거리가 30km 이상이면 지수를 1.10 으로 올린다.
 *  - 풀코스이면서 주간 거리가 부족하면(<50km) 후반 붕괴 리스크가 크므로 3% 추가 페널티.
 *
 * ⚠️ FULL_UNDERTRAINED_PENALTY 는 PRD 에 명시된 대로 **가설값**이다. 실데이터로 보정할 것.
 *
 * 정직성 원칙(§7.2): 이 모듈은 단일 숫자를 반환하지 않는다. 항상 범위다.
 */

import { MAX_DISTANCE_M, MIN_DISTANCE_M, mToKm } from './units.ts';

export const RIEGEL_EXPONENT_SHORT = 1.06;
export const RIEGEL_EXPONENT_LONG = 1.1;
/** 지수를 올리기 시작하는 목표 거리 (km) */
export const LONG_DISTANCE_THRESHOLD_KM = 30;
/** 풀코스 판정 기준 (km) */
export const FULL_DISTANCE_THRESHOLD_KM = 42;
/** 이 주간 거리 미만이면 풀코스 예측에 페널티 */
export const FULL_UNDERTRAINED_WEEKLY_KM = 50;
export const FULL_UNDERTRAINED_PENALTY = 1.03;

export function riegelExponent(targetDistanceKm: number): number {
  return targetDistanceKm >= LONG_DISTANCE_THRESHOLD_KM ? RIEGEL_EXPONENT_LONG : RIEGEL_EXPONENT_SHORT;
}

export type PredictionRange = {
  /** 빠른 쪽 경계 (초) */
  fastSec: number;
  /** 중앙값 (초). 내부 계산용이며 UI 에 단독 표시하지 않는다 */
  midSec: number;
  /** 느린 쪽 경계 (초) */
  slowSec: number;
  /** 적용된 Riegel 지수 */
  exponent: number;
  /** 적용된 보정 목록 (UI 근거 문장에 사용) */
  adjustments: string[];
};

export type ConvertArgs = {
  fromDistanceM: number;
  fromTimeSec: number;
  toDistanceM: number;
  /** 현재 주간 거리 (km). 풀코스 페널티 판정에 쓴다 */
  currentWeeklyKm?: number;
};

function assertDistance(m: number, label: string): void {
  if (!Number.isFinite(m) || m < MIN_DISTANCE_M || m > MAX_DISTANCE_M) {
    throw new RangeError(`${label}는 ${MIN_DISTANCE_M}~${MAX_DISTANCE_M}m 사이여야 합니다: ${m}`);
  }
}

/**
 * 예측 불확실성 폭.
 * 환산 배율이 클수록(=외삽이 멀수록) 넓어진다. 기본 1.5%, 로그 배율당 2%p, 상한 7%.
 */
export function uncertaintyRatio(fromDistanceM: number, toDistanceM: number): number {
  const ratio = Math.abs(Math.log(toDistanceM / fromDistanceM));
  return Math.min(0.07, 0.015 + 0.02 * ratio);
}

/** 대회 기록을 다른 거리로 환산한다. 결과는 항상 범위 */
export function convertRaceTime(args: ConvertArgs): PredictionRange {
  const { fromDistanceM, fromTimeSec, toDistanceM, currentWeeklyKm } = args;
  assertDistance(fromDistanceM, '기준 거리');
  assertDistance(toDistanceM, '목표 거리');
  if (!Number.isFinite(fromTimeSec) || fromTimeSec <= 0) {
    throw new RangeError(`기록은 0보다 커야 합니다: ${fromTimeSec}`);
  }

  const toKm = mToKm(toDistanceM);
  const exponent = riegelExponent(toKm);
  const adjustments: string[] = [];

  let mid = fromTimeSec * Math.pow(toDistanceM / fromDistanceM, exponent);
  if (exponent === RIEGEL_EXPONENT_LONG) {
    adjustments.push(`장거리 보정 지수 ${RIEGEL_EXPONENT_LONG} 적용`);
  }

  const isFull = toKm >= FULL_DISTANCE_THRESHOLD_KM;
  const undertrained = currentWeeklyKm !== undefined && currentWeeklyKm < FULL_UNDERTRAINED_WEEKLY_KM;
  if (isFull && undertrained) {
    mid *= FULL_UNDERTRAINED_PENALTY;
    adjustments.push(`주간 거리 ${FULL_UNDERTRAINED_WEEKLY_KM}km 미만 — 후반 붕괴 리스크 3% 보정`);
  }

  const u = uncertaintyRatio(fromDistanceM, toDistanceM);
  // 장거리는 오차가 느린 쪽으로 치우친다 (Riegel 낙관 편향)
  const skewFast = toKm >= LONG_DISTANCE_THRESHOLD_KM ? 0.6 : 1;
  const skewSlow = toKm >= LONG_DISTANCE_THRESHOLD_KM ? 1.4 : 1;

  return {
    fastSec: mid * (1 - u * skewFast),
    midSec: mid,
    slowSec: mid * (1 + u * skewSlow),
    exponent,
    adjustments,
  };
}
