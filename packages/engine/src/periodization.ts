/**
 * 페이즈 배분과 주간 볼륨 곡선 — PRD §7.4, §7.5
 *
 * 테이퍼 원칙: **강도는 절대 낮추지 않는다. 양만 줄인다.** (§7.4)
 * 안전 원칙: 모든 주차에 ACWR ≤ 1.30 하드 클램프. 클램프가 발동하면 숨기지 않고 알린다 (§7.10)
 */

import { RACE_DISTANCE_M, clamp, round } from './units.ts';

export type Phase = 'base' | 'build' | 'peak' | 'taper';

/** 거리별 테이퍼 주차 — PRD §7.4 */
export function taperWeeksFor(distanceM: number): number {
  if (distanceM <= RACE_DISTANCE_M['5K']) return 1;
  if (distanceM <= RACE_DISTANCE_M.HALF) return 2;
  return 3;
}

/**
 * 테이퍼 감량 곡선. 직전 프렙 주차 거리 대비 비율이며 마지막 원소가 레이스 주다.
 * 근거: 풀코스 3주 테이퍼가 최적이고 1주 테이퍼가 가장 나빴다 (§7.4).
 *
 * ⚠️ PRD §7.4 표와의 차이: 여기서 말하는 주간 거리는 **대회 자체를 제외한 훈련량**이다.
 * PRD 의 "레이스 주 40~50% 감량"(=0.55배)을 그대로 쓰면 풀코스 레이스 주에
 * 훈련 44km + 대회 42km 가 되어 오히려 피크 주보다 무거워진다. 그래서 레이스 주만
 * 더 내렸다. D-3주 · D-2주는 PRD 값 그대로다.
 */
export function taperCurve(distanceM: number): number[] {
  if (distanceM <= RACE_DISTANCE_M['5K']) return [0.55];
  if (distanceM <= RACE_DISTANCE_M['10K']) return [0.75, 0.5];
  if (distanceM <= RACE_DISTANCE_M.HALF) return [0.7, 0.4];
  return [0.875, 0.625, 0.3];
}

/** 거리 · 훈련 일수별 피크 주간 거리 상한 (km) — PRD §7.5 */
const PEAK_KM_RANGE: ReadonlyArray<{ maxDistanceM: number; lo: number; hi: number }> = [
  { maxDistanceM: RACE_DISTANCE_M['5K'], lo: 25, hi: 45 },
  { maxDistanceM: RACE_DISTANCE_M['10K'], lo: 35, hi: 60 },
  { maxDistanceM: RACE_DISTANCE_M.HALF, lo: 45, hi: 75 },
  { maxDistanceM: RACE_DISTANCE_M.FULL, lo: 60, hi: 100 },
];

export function peakWeeklyKmCap(distanceM: number, daysPerWeek: 3 | 4 | 5 | 6): number {
  const row = PEAK_KM_RANGE.find((r) => distanceM <= r.maxDistanceM) ?? PEAK_KM_RANGE[PEAK_KM_RANGE.length - 1]!;
  return row.lo + ((row.hi - row.lo) * (daysPerWeek - 3)) / 3;
}

/** ACWR 하드 상한 — 뉴욕 마라톤 러너 732명 추적 연구 (§7.5) */
export const ACWR_CAP = 1.3;
/** 3:1 사이클의 감량 주차 비율 (직전 주의 70~80% 중앙값) */
export const DOWN_WEEK_RATIO = 0.75;

/** 주차별 페이즈 배열. 길이는 weeksAvailable 과 같다 */
export function allocatePhases(weeksAvailable: number, distanceM: number): Phase[] {
  const total = Math.max(1, Math.floor(weeksAvailable));
  const taper = Math.min(taperWeeksFor(distanceM), Math.max(1, total - 2));
  const prep = total - taper;

  let base = Math.round(prep * 0.45);
  let build = Math.round(prep * 0.35);
  let peak = prep - base - build;

  // 반올림 누적으로 peak 가 음수가 될 수 있다. build → base 순으로 되돌린다
  while (peak < 0 && build > 0) {
    build -= 1;
    peak += 1;
  }
  while (peak < 0 && base > 0) {
    base -= 1;
    peak += 1;
  }

  return [
    ...Array<Phase>(base).fill('base'),
    ...Array<Phase>(build).fill('build'),
    ...Array<Phase>(peak).fill('peak'),
    ...Array<Phase>(taper).fill('taper'),
  ];
}

export type WeekVolume = {
  index: number;
  phase: Phase;
  km: number;
  /** 해당 주 거리 / 직전 28일 평균 주간 거리 */
  acwr: number;
  /** ACWR 상한에 걸려 깎였는지 (§7.10 고지 트리거) */
  clamped: boolean;
  isDownWeek: boolean;
};

export type VolumeCurveArgs = {
  phases: Phase[];
  startKm: number;
  distanceM: number;
  daysPerWeek: 3 | 4 | 5 | 6;
  /** 판정에 따른 여유 계수 (§7.3 → §7.5) */
  volumeFactor?: number;
};

export type VolumeCurve = {
  weeks: WeekVolume[];
  /** 실제로 도달한 피크 주간 거리 */
  peakKm: number;
  /** 목표했던 피크 주간 거리 */
  targetPeakKm: number;
  /** ACWR 클램프가 한 번이라도 발동했는지 */
  anyClamped: boolean;
  /** 클램프 때문에 목표 피크에 못 미쳤는지 — §7.5 규칙 5의 판정 하향 트리거 */
  peakShortfall: boolean;
};

export function buildVolumeCurve(args: VolumeCurveArgs): VolumeCurve {
  const { phases, startKm, distanceM, daysPerWeek, volumeFactor = 1 } = args;
  const start = clamp(startKm, 5, 200);
  const targetPeakKm = Math.max(start, peakWeeklyKmCap(distanceM, daysPerWeek) * volumeFactor);

  const prepCount = phases.filter((p) => p !== 'taper').length;
  const weeks: WeekVolume[] = [];

  // 직전 28일 = 4주. 시작 시점에는 이력이 없으므로 현재 주간 거리로 시드한다
  const history: number[] = [start, start, start, start];
  const chronic = (): number => history.slice(-4).reduce((a, b) => a + b, 0) / 4;

  let lastKm = start;
  let peakReached = start;

  for (let i = 0; i < prepCount; i++) {
    const progress = prepCount > 1 ? i / (prepCount - 1) : 1;
    const isDownWeek = i % 4 === 3 && i !== prepCount - 1;
    const target = isDownWeek ? lastKm * DOWN_WEEK_RATIO : start + (targetPeakKm - start) * progress;

    const c = chronic();
    const cap = c * ACWR_CAP;
    const clamped = target > cap;
    const km = clamped ? cap : target;

    history.push(km);
    lastKm = km;
    peakReached = Math.max(peakReached, km);
    weeks.push({
      index: i,
      phase: phases[i]!,
      km: round(km, 1),
      acwr: round(km / c, 3),
      clamped,
      isDownWeek,
    });
  }

  // 테이퍼 — 강도는 유지하고 양만 줄인다 (§7.4)
  const taperCount = phases.length - prepCount;
  const curve = taperCurve(distanceM).slice(-Math.max(taperCount, 1));
  const taperBase = lastKm;
  for (let t = 0; t < taperCount; t++) {
    const ratio = curve[Math.min(t, curve.length - 1)] ?? 0.55;
    const km = taperBase * ratio;
    const c = chronic();
    history.push(km);
    weeks.push({
      index: prepCount + t,
      phase: 'taper',
      km: round(km, 1),
      acwr: round(km / c, 3),
      clamped: false,
      isDownWeek: false,
    });
  }

  return {
    weeks,
    peakKm: round(peakReached, 1),
    targetPeakKm: round(targetPeakKm, 1),
    anyClamped: weeks.some((w) => w.clamped),
    peakShortfall: peakReached < targetPeakKm * 0.9,
  };
}
