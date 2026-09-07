/**
 * 단위 변환 및 포맷 유틸.
 *
 * 엔진 내부 표준 단위
 * - 거리: 미터 (m)
 * - 시간: 초 (s)
 * - 속도: 분당 미터 (m/min)  ← Daniels-Gilbert 식이 이 단위를 쓴다
 * - 페이스: km당 초 (sec/km)
 */

/** 표준 대회 거리 (m). PRD §7.1 raceDistance 와 대응 */
export const RACE_DISTANCE_M = {
  '5K': 5000,
  '10K': 10000,
  HALF: 21097.5,
  FULL: 42195,
} as const;

export type RaceDistanceKey = keyof typeof RACE_DISTANCE_M;

/** 엔진이 다루는 거리 하한/상한. 이 밖의 입력은 거부한다. */
export const MIN_DISTANCE_M = 800;
export const MAX_DISTANCE_M = 100_000;

export function kmToM(km: number): number {
  return km * 1000;
}

export function mToKm(m: number): number {
  return m / 1000;
}

/** 페이스(sec/km) → 속도(m/min) */
export function velocityFromPace(secPerKm: number): number {
  if (!(secPerKm > 0)) throw new RangeError(`페이스는 0보다 커야 합니다: ${secPerKm}`);
  return 60_000 / secPerKm;
}

/** 속도(m/min) → 페이스(sec/km) */
export function paceFromVelocity(mPerMin: number): number {
  if (!(mPerMin > 0)) throw new RangeError(`속도는 0보다 커야 합니다: ${mPerMin}`);
  return 60_000 / mPerMin;
}

/** 거리(m)와 기록(s)에서 속도(m/min) */
export function velocityFromRace(distanceM: number, timeSec: number): number {
  if (!(distanceM > 0)) throw new RangeError(`거리는 0보다 커야 합니다: ${distanceM}`);
  if (!(timeSec > 0)) throw new RangeError(`기록은 0보다 커야 합니다: ${timeSec}`);
  return distanceM / (timeSec / 60);
}

/** "5:26" 형태. 소수점 없이 초 반올림 */
export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

/** "3:21:07" 또는 "48:20". 1시간 미만이면 시간 자리를 생략한다 */
export function formatDuration(totalSec: number): string {
  const total = Math.round(totalSec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** 400m 트랙 한 바퀴 환산. R존 표기에 쓴다 */
export function per400m(secPerKm: number): number {
  return (secPerKm * 400) / 1000;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 부동소수 누적 오차를 UI 경계에서 잘라내기 위한 반올림 */
export function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
