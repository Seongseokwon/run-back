/** 엔진 공개 입력 타입 — PRD §7.1 */

export type RaceDistanceM = 5000 | 10000 | 21097.5 | 42195;

export type FitnessInput =
  /** 최근 대회 기록 */
  | { kind: 'race'; distanceM: number; timeSec: number }
  /** 편한 페이스 + 주간 거리 */
  | { kind: 'feel'; easyPaceSecPerKm: number; weeklyKm: number }
  /** 잘 모름 — 쉬지 않고 뛸 수 있는 시간(분)만 안다 */
  | { kind: 'novice'; canRunMin: number };

export type GoalInput = { kind: 'time'; targetSec: number } | { kind: 'finish' };

export type PlanInput = {
  /** ISO date (KST 기준) */
  raceDate: string;
  raceDistanceM: RaceDistanceM;
  /** ISO date (KST 기준) */
  today: string;
  fitness: FitnessInput;
  goal: GoalInput;
  daysPerWeek: 3 | 4 | 5 | 6;
  /** 미입력 시 fitness 에서 보수적으로 추정 */
  currentWeeklyKm?: number;
};

/** 추정 신뢰도. 타당성 판정을 얼마나 보수적으로 할지 결정한다 */
export type Confidence = 'low' | 'medium' | 'high';

/**
 * 엔진 버전. 저장된 플랜을 이 버전으로 고정 렌더링한다 (PRD §9.7, §17 R11).
 * 계수·규칙을 바꾸면 반드시 올린다.
 */
export const ENGINE_VERSION = '0.1.0';
