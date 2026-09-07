/**
 * VDOT 코어 — Daniels-Gilbert 공개 근사식 기반 자체 구현.
 *
 * ⚠️ PRD §18 O3 대응
 * Jack Daniels 의 *VDOT 대응표* 자체는 저작물(편집저작물)로 볼 여지가 있으므로 복제하지 않는다.
 * 대신 Daniels & Gilbert 가 1979년 공개한 **두 개의 회귀식**만 사용해 값을 매번 계산한다.
 * 수학식은 저작권 보호 대상이 아니며, 이 파일에는 표에서 옮겨 온 숫자가 한 개도 없다.
 * 결정 근거는 docs/adr/0001-vdot-model.md 참조.
 *
 * 식 1) 평지 러닝의 산소 요구량 (VO2 demand, ml/kg/min) — 속도 v (m/min)
 *   VO2(v) = -4.60 + 0.182258·v + 0.000104·v²
 *
 * 식 2) 지속 시간 t (분) 동안 유지 가능한 VO2max 비율
 *   f(t) = 0.8 + 0.1894393·e^(-0.012778·t) + 0.2989558·e^(-0.1932605·t)
 *
 * VDOT = VO2(v) / f(t) — 즉 "이 기록을 내려면 필요한 유효 VO2max".
 * 실험실 VO2max 가 아니라 러닝 퍼포먼스 지표이므로 이름을 VDOT 로 구분해 쓴다.
 */

import { MAX_DISTANCE_M, MIN_DISTANCE_M, clamp, paceFromVelocity, velocityFromRace } from './units.ts';

/** 식 1 계수 */
const VO2_A = -4.6;
const VO2_B = 0.182258;
const VO2_C = 0.000104;

/** 식 2 계수 */
const F_BASE = 0.8;
const F_A1 = 0.1894393;
const F_K1 = 0.012778;
const F_A2 = 0.2989558;
const F_K2 = 0.1932605;

/** 엔진이 신뢰하는 VDOT 범위. 밖으로 나가면 클램프하고 플래그를 세운다 */
export const VDOT_MIN = 25;
export const VDOT_MAX = 85;

/** 속도(m/min)에서 산소 요구량(ml/kg/min) */
export function oxygenCost(mPerMin: number): number {
  if (!(mPerMin > 0)) throw new RangeError(`속도는 0보다 커야 합니다: ${mPerMin}`);
  return VO2_A + VO2_B * mPerMin + VO2_C * mPerMin * mPerMin;
}

/** 산소 요구량에서 속도(m/min) — 식 1의 역함수(이차방정식 양근) */
export function velocityForOxygenCost(vo2: number): number {
  const disc = VO2_B * VO2_B + 4 * VO2_C * (vo2 - VO2_A);
  if (disc <= 0) throw new RangeError(`역산 불가능한 산소 요구량입니다: ${vo2}`);
  return (-VO2_B + Math.sqrt(disc)) / (2 * VO2_C);
}

/** 지속 시간 t(분) 동안 유지 가능한 VO2max 비율. t→∞ 에서 0.8 로 수렴 */
export function sustainableFraction(durationMin: number): number {
  if (!(durationMin > 0)) throw new RangeError(`지속 시간은 0보다 커야 합니다: ${durationMin}`);
  return F_BASE + F_A1 * Math.exp(-F_K1 * durationMin) + F_A2 * Math.exp(-F_K2 * durationMin);
}

function assertRaceInput(distanceM: number, timeSec: number): void {
  if (!Number.isFinite(distanceM) || distanceM < MIN_DISTANCE_M || distanceM > MAX_DISTANCE_M) {
    throw new RangeError(`거리는 ${MIN_DISTANCE_M}~${MAX_DISTANCE_M}m 사이여야 합니다: ${distanceM}`);
  }
  if (!Number.isFinite(timeSec) || timeSec <= 0) {
    throw new RangeError(`기록은 0보다 커야 합니다: ${timeSec}`);
  }
}

export type VdotFromRace = {
  /** 클램프된 값. 플랜 생성에 쓰는 값 */
  vdot: number;
  /** 클램프 전 원값. 검증·디버깅용 */
  raw: number;
  /** VDOT_MIN/MAX 를 벗어나 클램프했는지 */
  clamped: boolean;
};

/** 대회 기록 → VDOT */
export function vdotFromRace(distanceM: number, timeSec: number): VdotFromRace {
  assertRaceInput(distanceM, timeSec);
  const v = velocityFromRace(distanceM, timeSec);
  const raw = oxygenCost(v) / sustainableFraction(timeSec / 60);
  const vdot = clamp(raw, VDOT_MIN, VDOT_MAX);
  return { vdot, raw, clamped: vdot !== raw };
}

/**
 * VDOT → 해당 거리의 예상 기록(초).
 * 식 1·2를 동시에 만족하는 t 를 이분 탐색으로 찾는다.
 * g(t) = VO2(distance/t) - VDOT·f(t) 는 t 에 대해 단조 감소하므로 해가 유일하다.
 */
export function predictRaceTimeSec(vdot: number, distanceM: number): number {
  if (!Number.isFinite(vdot) || vdot <= 0) throw new RangeError(`VDOT는 0보다 커야 합니다: ${vdot}`);
  if (!Number.isFinite(distanceM) || distanceM < MIN_DISTANCE_M || distanceM > MAX_DISTANCE_M) {
    throw new RangeError(`거리는 ${MIN_DISTANCE_M}~${MAX_DISTANCE_M}m 사이여야 합니다: ${distanceM}`);
  }

  const g = (tMin: number): number => oxygenCost(distanceM / tMin) - vdot * sustainableFraction(tMin);

  let lo = 0.5;
  let hi = 24 * 60;
  if (g(lo) < 0) return lo * 60; // 이론상 도달 불가 — 방어
  if (g(hi) > 0) return hi * 60;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-9) break;
  }
  return ((lo + hi) / 2) * 60;
}

/**
 * VDOT 와 강도 계수(VDOT 대비 비율) → 목표 페이스(sec/km).
 * 계수의 의미와 캘리브레이션 근거는 zones.ts 상단 주석 참조.
 */
export function paceForIntensity(vdot: number, fraction: number): number {
  if (!Number.isFinite(vdot) || vdot <= 0) throw new RangeError(`VDOT는 0보다 커야 합니다: ${vdot}`);
  if (!(fraction > 0)) throw new RangeError(`강도 계수는 0보다 커야 합니다: ${fraction}`);
  return paceFromVelocity(velocityForOxygenCost(vdot * fraction));
}

/** 페이스(sec/km)를 특정 강도로 달린다고 볼 때의 VDOT 역산 */
export function vdotFromPaceAtIntensity(secPerKm: number, fraction: number): number {
  if (!(fraction > 0)) throw new RangeError(`강도 계수는 0보다 커야 합니다: ${fraction}`);
  const v = 60_000 / secPerKm;
  return oxygenCost(v) / fraction;
}
