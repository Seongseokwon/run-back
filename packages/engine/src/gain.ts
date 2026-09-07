/**
 * VDOT 향상률 모델 — PRD §7.3 `weeklyGainRate` (오픈 이슈 O2 대응)
 *
 * 결정 근거와 문헌 출처는 docs/adr/0002-vdot-gain-rate.md 참조.
 *
 * 핵심 두 가지
 *  1) PRD 의 4구간 계단 함수를 **연속 지수 감쇠**로 바꿨다.
 *     계단은 VDOT 34.99 와 35.01 에서 판정이 튀는 문제가 있다.
 *  2) 향상률을 절대 포인트가 아니라 **현재 VDOT 대비 비율(%)** 로 잡았다.
 *     문헌이 일관되게 % 단위로 보고하기 때문이다.
 *
 * 안전 계수 CONSERVATISM 은 이 모델의 단일 노브다.
 * 문헌 중앙값의 절반만 인정한다 — 이유는 ADR 참조 (VO2max 향상 ≠ VDOT 향상,
 * 연구 환경의 높은 순응도, 그리고 과대 약속의 비용이 과소 약속보다 크다).
 */

import { clamp } from './units.ts';

/** 문헌 중앙값: 좌식~입문(VDOT 30) 구간의 주당 향상률 */
export const LITERATURE_RATE_AT_30 = 0.012;
/** 문헌 중앙값: 숙련(VDOT 65) 구간의 주당 향상률 */
export const LITERATURE_RATE_AT_65 = 0.002;
/** 문헌 대비 안전 계수. 이 모델의 유일한 노브 */
export const CONSERVATISM = 0.5;

const DECAY = Math.log(LITERATURE_RATE_AT_30 / LITERATURE_RATE_AT_65) / (65 - 30);

/** 주당 훈련 일수 보정 — PRD §7.3 표 그대로 */
export const DAYS_FACTOR: Readonly<Record<3 | 4 | 5 | 6, number>> = {
  3: 0.75,
  4: 1.0,
  5: 1.15,
  6: 1.25,
};

/** novice 입력처럼 신뢰도가 낮은 추정에 곱하는 추가 보수 계수 (§7.2) */
export const LOW_CONFIDENCE_FACTOR = 0.8;

/** 현재 VDOT 기준 주당 향상률(비율). 4일 훈련 기준 */
export function weeklyGainPct(vdot: number): number {
  return CONSERVATISM * LITERATURE_RATE_AT_30 * Math.exp(-DECAY * (vdot - 30));
}

/** 주당 VDOT 향상폭(포인트) */
export function weeklyGainRate(vdot: number, daysPerWeek: 3 | 4 | 5 | 6): number {
  return vdot * weeklyGainPct(vdot) * DAYS_FACTOR[daysPerWeek];
}

/**
 * 남은 기간에 쌓을 수 있는 VDOT 총량.
 * 향상률이 VDOT 에 따라 변하므로 주 단위로 누적한다 (수확 체감 반영).
 */
export function trainingCapacity(args: {
  vdot: number;
  weeks: number;
  daysPerWeek: 3 | 4 | 5 | 6;
  /** 신뢰도 낮은 추정이면 true — 판정을 보수적으로 민다 */
  conservative?: boolean;
}): number {
  const { vdot, weeks, daysPerWeek, conservative = false } = args;
  const n = Math.max(0, Math.floor(weeks));
  let current = vdot;
  for (let i = 0; i < n; i++) {
    current += weeklyGainRate(current, daysPerWeek);
  }
  const gained = current - vdot;
  return clamp(conservative ? gained * LOW_CONFIDENCE_FACTOR : gained, 0, 30);
}
