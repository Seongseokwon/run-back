/**
 * 주간 세션 배치 — PRD §7.7
 *
 * 하드 제약 (§7.6, §11.3 테스트로 강제)
 *  - 존별 주간 거리 상한: M 20% / T 10% / I 8% / R 5%
 *  - 고강도(T·I·R) 세션 사이 최소 이틀
 *  - Long run ≤ 주간 거리의 30%, 단일 런 ≤ 2.5시간, 풀코스 Long run ≤ 32km
 *  - Long run 다음 날은 Easy 또는 휴식 (월요일은 항상 휴식으로 비운다)
 *
 * 상한 계산에서 **올림을 쓰지 않는다.** 반복 개수를 반올림하면 8% 상한이
 * 8.03% 가 되는 식으로 조용히 새는데, 안전 제약에서는 그게 곧 버그다.
 */

import { RACE_DISTANCE_M, clamp, round } from './units.ts';
import { ZONE_WEEKLY_SHARE_CAP, type ZoneKey, type ZonePace } from './zones.ts';
import { dayOfWeek, offsetForDayOfWeek } from './dates.ts';
import type { Phase, WeekVolume } from './periodization.ts';

export type SessionType =
  | 'rest'
  | 'easy'
  | 'long'
  | 'tempo'
  | 'interval'
  | 'repetition'
  | 'marathon-pace'
  /** PRD §8 타입에 추가. 플랜에 대회 자체가 없으면 역산 플랜이 아니다 */
  | 'race';

export type PlanSession = {
  date: string;
  /** 0=일 … 6=토 */
  dayOfWeek: number;
  type: SessionType;
  /** 워밍업·쿨다운을 포함한 세션 총 거리 */
  distanceKm: number;
  /**
   * 이 중 실제로 targetZone 강도로 달리는 거리.
   * 존별 주간 거리 상한(§7.6)은 distanceKm 이 아니라 이 값으로 계산한다 —
   * 템포 8km 세션의 T존 거리는 워밍업을 뺀 2km 일 수 있다.
   */
  zoneKm: number;
  durationMin: number;
  structure?: string;
  targetZone: ZoneKey;
};

/** 강도 서열. 테이퍼가 직전 페이즈보다 약해지지 않았는지 검사할 때 쓴다 (§11.3) */
export const ZONE_RANK: Readonly<Record<ZoneKey, number>> = { E: 0, M: 1, T: 2, I: 3, R: 4 };

/** 고강도로 취급해 간격 제약을 거는 세션 타입 */
export const HARD_TYPES: ReadonlySet<SessionType> = new Set(['tempo', 'interval', 'repetition']);

/** 페이즈별 주 퀄리티 존 — 스트라이드(R)는 신경근 자극이라 여기에 넣지 않는다 */
export function primaryZoneFor(phase: Exclude<Phase, 'taper'>): ZoneKey {
  return phase === 'base' ? 'E' : phase === 'build' ? 'T' : 'I';
}

/** 단일 Easy/Long 런 상한 (분) — §7.6 */
export const SINGLE_RUN_CAP_MIN = 150;

/**
 * 세션 하나의 최소 거리 (km).
 * 주간 거리가 아주 작으면(주 5km 러너의 초단기 플랜 등) 세션 수를 맞추기 위해
 * 이 하한이 주간 계획량을 넘어설 수 있다. 그런 입력은 §7.3 판정에서 이미
 * '비현실적'으로 걸러지므로, 여기서는 플랜이 깨지지 않는 것만 보장한다.
 */
export const MIN_SESSION_KM = 1.5;

/** 거리별 Long run 절대 상한 (km). 풀코스 32km 는 §7.7 명시 */
export function longRunCapKm(distanceM: number): number {
  if (distanceM <= RACE_DISTANCE_M['5K']) return 14;
  if (distanceM <= RACE_DISTANCE_M['10K']) return 20;
  if (distanceM <= RACE_DISTANCE_M.HALF) return 26;
  return 32;
}

type SlotRole = 'q1' | 'q2' | 'easy' | 'long';
type Slot = { dow: number; role: SlotRole };

/** 요일 슬롯 (0=일 … 6=토). Long 은 일요일, 월요일은 비운다 */
const LAYOUT: Readonly<Record<3 | 4 | 5 | 6, readonly Slot[]>> = {
  3: [
    { dow: 2, role: 'q1' },
    { dow: 4, role: 'easy' },
    { dow: 0, role: 'long' },
  ],
  4: [
    { dow: 2, role: 'q1' },
    { dow: 3, role: 'easy' },
    { dow: 5, role: 'easy' },
    { dow: 0, role: 'long' },
  ],
  5: [
    { dow: 2, role: 'q1' },
    { dow: 3, role: 'easy' },
    { dow: 5, role: 'q2' },
    { dow: 6, role: 'easy' },
    { dow: 0, role: 'long' },
  ],
  6: [
    { dow: 2, role: 'q1' },
    { dow: 3, role: 'easy' },
    { dow: 4, role: 'easy' },
    { dow: 5, role: 'q2' },
    { dow: 6, role: 'easy' },
    { dow: 0, role: 'long' },
  ],
};

function repMinutes(repM: number, paceSecPerKm: number): number {
  return ((repM / 1000) * paceSecPerKm) / 60;
}

function fmtRep(repM: number): string {
  return repM >= 1000 ? `${repM / 1000}km` : `${repM}m`;
}

type QualitySpec = {
  zone: ZoneKey;
  /** 해당 존으로 달리는 순수 거리. 워밍업·쿨다운은 포함하지 않는다 */
  zoneKm: number;
  structure: string;
  type: SessionType;
};

/** 퀄리티 세션이 아니라 이지런 + 스트라이드로 처리한다 */
function stridesSpec(weekKm: number): QualitySpec {
  const budget = Math.min(ZONE_WEEKLY_SHARE_CAP.R * weekKm, 0.8);
  const reps = clamp(Math.floor(budget / 0.1), 4, 8);
  return { zone: 'E', zoneKm: 0, type: 'easy', structure: `이지런 후 스트라이드 20초 × ${reps}` };
}

/**
 * 존별 세션이 성립하기 위한 최소 존 거리 (km).
 * 이보다 예산이 작으면 그 존의 세션을 만들지 않는다.
 */
export const MINIMAL_ZONE_KM: Readonly<Record<Exclude<ZoneKey, 'E'>, number>> = {
  M: 1,
  T: 1,
  I: 0.6,
  R: 0.8,
};

/**
 * 존별 퀄리티 세션 스펙. `capScale` 은 주간 예산이 모자랄 때 축소용이며,
 * 상한은 언제나 ZONE_WEEKLY_SHARE_CAP 이하로 유지된다.
 *
 * `minimal` 은 레이스 주 샤프너용이다. 짧고 날카롭게만 만들면 되므로
 * 일반 주차의 최소 크기 기준을 낮춘다 — 테이퍼에서 강도를 떨어뜨리지 않기 위한 장치다 (§7.4).
 */
export function buildQuality(
  zone: ZoneKey,
  weekKm: number,
  paces: Record<ZoneKey, ZonePace>,
  capScale = 1,
  minimal = false,
): QualitySpec {
  if (zone === 'E') return stridesSpec(weekKm);
  const cap = ZONE_WEEKLY_SHARE_CAP[zone as Exclude<ZoneKey, 'E'>] * weekKm * capScale;
  const floor = minimal ? MINIMAL_ZONE_KM[zone as Exclude<ZoneKey, 'E'>] : undefined;

  switch (zone) {
    case 'T': {
      if (cap < (floor ?? 2)) return stridesSpec(weekKm);
      const zoneKm = Math.min(cap, 12);
      const tempoMin = (zoneKm * paces.T.secPerKm) / 60;
      if (tempoMin <= 20) {
        return { zone, zoneKm, type: 'tempo', structure: `템포 ${zoneKm.toFixed(1)}km (약 ${Math.round(tempoMin)}분)` };
      }
      const repM = [2000, 1600, 1200, 1000].find((m) => repMinutes(m, paces.T.secPerKm) <= 10) ?? 1000;
      const reps = Math.floor((zoneKm * 1000) / repM);
      if (reps < 2) {
        return { zone, zoneKm, type: 'tempo', structure: `템포 ${zoneKm.toFixed(1)}km (약 ${Math.round(tempoMin)}분)` };
      }
      return {
        zone,
        zoneKm: (repM * reps) / 1000,
        type: 'tempo',
        structure: `크루즈 인터벌 ${fmtRep(repM)} × ${reps}, 회복 1분 조깅`,
      };
    }

    case 'I': {
      if (cap < (floor ?? 1.2)) return stridesSpec(weekKm);
      const minReps = minimal ? 3 : 3;
      const repM =
        [1600, 1200, 1000, 800, 600, 400, 300, 200].find(
          (m) => repMinutes(m, paces.I.secPerKm) <= 5 && (minReps * m) / 1000 <= cap,
        ) ?? 200;
      const reps = clamp(Math.floor((cap * 1000) / repM), minReps, minimal ? 6 : 8);
      const recovery = Math.max(200, Math.round(repM / 2 / 100) * 100);
      return {
        zone,
        zoneKm: (repM * reps) / 1000,
        type: 'interval',
        structure: `${fmtRep(repM)} × ${reps}, 회복 ${fmtRep(recovery)} 조깅`,
      };
    }

    case 'R': {
      if (cap < (floor ?? 1)) return stridesSpec(weekKm);
      const minReps = minimal ? 4 : 4;
      const repM =
        [400, 300, 200, 150].find((m) => repMinutes(m, paces.R.secPerKm) <= 2 && (minReps * m) / 1000 <= cap) ?? 150;
      const reps = clamp(Math.floor((cap * 1000) / repM), minReps, minimal ? 6 : 10);
      return {
        zone,
        zoneKm: (repM * reps) / 1000,
        type: 'repetition',
        structure: `${fmtRep(repM)} × ${reps}, 회복 ${fmtRep(repM)} 조깅`,
      };
    }

    default: {
      const byTime = (110 * 60) / paces.M.secPerKm;
      const zoneKm = Math.min(cap, byTime, 32);
      if (zoneKm < (floor ?? 2)) return stridesSpec(weekKm);
      return { zone: 'M', zoneKm, type: 'marathon-pace', structure: `마라톤 페이스 ${zoneKm.toFixed(1)}km` };
    }
  }
}

export type WeekSessionArgs = {
  volume: WeekVolume;
  daysPerWeek: 3 | 4 | 5 | 6;
  paces: Record<ZoneKey, ZonePace>;
  raceDistanceM: number;
  weekStartIso: string;
  addDaysFn: (iso: string, days: number) => string;
  /** 테이퍼 주차가 유지해야 할 강도 존 (§7.4 "강도는 낮추지 않는다") */
  taperZone: ZoneKey;
  isRaceWeek: boolean;
  /** 레이스 세션 소요 시간(초). 없으면 M 페이스로 환산 */
  raceTimeSec?: number;
};

export function buildWeekSessions(args: WeekSessionArgs): PlanSession[] {
  const { volume, daysPerWeek, paces, raceDistanceM, weekStartIso, addDaysFn, taperZone, isRaceWeek, raceTimeSec } =
    args;
  const W = volume.km;

  const make = (
    offset: number,
    type: SessionType,
    zone: ZoneKey,
    distanceKm: number,
    structure?: string,
    durationMinOverride?: number,
    zoneKmOverride?: number,
  ): PlanSession => {
    const date = addDaysFn(weekStartIso, offset);
    const km = Math.max(distanceKm, 0);
    return {
      date,
      dayOfWeek: dayOfWeek(date),
      type,
      distanceKm: round(km, 1),
      zoneKm: round(Math.min(zoneKmOverride ?? km, km), 2),
      durationMin: round(durationMinOverride ?? (km * paces[zone].secPerKm) / 60, 0),
      ...(structure ? { structure } : {}),
      targetZone: zone,
    };
  };

  const wuFor = (weekKm: number): number => clamp(weekKm * 0.06, 0.8, 3);
  const sessionKm = (spec: QualitySpec, wu: number): number => (spec.zoneKm > 0 ? spec.zoneKm + wu * 2 : 0);

  // ── 레이스 주 — 대회 자체가 최고 강도다. 훈련은 날카롭게만 유지한다 ──
  if (isRaceWeek) {
    const wu = clamp(W * 0.08, 0.8, 2.5);
    const sharpSpec = buildQuality(taperZone === 'E' ? 'M' : taperZone, W, paces, 1, true);
    const sharpKm = sessionKm(sharpSpec, wu);
    const easyOffsets = [4, 2, 0, 1].slice(0, Math.max(1, daysPerWeek - 2)).sort((a, b) => a - b);
    const slots = easyOffsets.length + (sharpSpec.zoneKm > 0 ? 0 : 1);
    const easyTotal = Math.max(W - (sharpSpec.zoneKm > 0 ? sharpKm : 0), slots * MIN_SESSION_KM);
    // 대회 주에는 긴 런을 넣지 않는다. 주간 계획량을 다 못 채워도 그게 맞다 — 나머지는 대회가 채운다
    const easyEach = Math.min(easyTotal / slots, (SINGLE_RUN_CAP_MIN * 60) / paces.E.secPerKm, 12);

    const out = easyOffsets.map((o) => make(o, 'easy', 'E', easyEach));
    // 대회 3일 전 날카롭게 하는 세션. 볼륨이 작아 존 세션이 안 나오면 스트라이드로 대체한다
    out.push(
      sharpSpec.zoneKm > 0
        ? make(
            3,
            sharpSpec.type,
            sharpSpec.zone,
            sharpKm,
            `워밍업 ${wu.toFixed(1)}km + ${sharpSpec.structure} + 쿨다운 ${wu.toFixed(1)}km`,
            undefined,
            sharpSpec.zoneKm,
          )
        : make(3, 'easy', 'E', easyEach, sharpSpec.structure),
    );
    out.push(
      make(6, 'race', 'M', raceDistanceM / 1000, '대회 당일', raceTimeSec !== undefined ? raceTimeSec / 60 : undefined),
    );
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── 일반 주차 ──────────────────────────────────────────────
  const layout = LAYOUT[daysPerWeek];
  const phase = volume.phase;
  const q1Zone: ZoneKey = phase === 'taper' ? taperZone : primaryZoneFor(phase);
  const q2Zone: ZoneKey = phase === 'base' ? 'E' : 'M';
  const hasQ2 = layout.some((s) => s.role === 'q2');

  const longCap = Math.min(0.3 * W, longRunCapKm(raceDistanceM), (SINGLE_RUN_CAP_MIN * 60) / paces.E.secPerKm);

  // 예산이 모자라면 퀄리티 상한과 롱런을 함께 줄이며 다시 만든다.
  // 구조 문자열과 실제 거리가 어긋나지 않도록 스펙 자체를 재생성한다.
  // 테이퍼는 양만 줄이고 강도는 유지한다 (§7.4). 볼륨이 작아도 존 세션이 살아남도록 minimal 모드
  const minimal = phase === 'taper';
  let longKm = longCap;
  let wu = wuFor(W);
  let q1Scale = 1;
  let q2Scale = 1;
  let q1 = buildQuality(q1Zone, W, paces, q1Scale, minimal);
  let q2 = hasQ2 ? buildQuality(q2Zone, W, paces, q2Scale, minimal) : null;

  // 예산 초과 시 깎는 순서: 롱런 → 보조 퀄리티(M) → 워밍업 → 주 퀄리티.
  // 주 퀄리티를 마지막에 두는 이유는 그게 그 페이즈의 훈련 자극 자체이기 때문이다.
  for (let i = 0; i < 12; i++) {
    const used = longKm + sessionKm(q1, wu) + (q2 ? sessionKm(q2, wu) : 0);
    if (used <= W * 0.85) break;
    if (longKm > W * 0.2 + 1e-9) {
      longKm = Math.max(longKm * 0.85, W * 0.2);
    } else if (q2 && q2.zoneKm > 0) {
      q2Scale *= 0.7;
      q2 = buildQuality(q2Zone, W, paces, q2Scale, minimal);
    } else if (wu > 0.8 + 1e-9) {
      wu = Math.max(wu * 0.85, 0.8);
    } else {
      q1Scale *= 0.8;
      q1 = buildQuality(q1Zone, W, paces, q1Scale, minimal);
    }
  }

  const q1Km = sessionKm(q1, wu);
  const q2Km = q2 ? sessionKm(q2, wu) : 0;

  const easySlots =
    layout.filter((s) => s.role === 'easy').length + (q1.zoneKm > 0 ? 0 : 1) + (q2 && q2.zoneKm === 0 ? 1 : 0);
  const easyTotal = Math.max(W - (longKm + q1Km + q2Km), 0);
  const maxEasyKm = (SINGLE_RUN_CAP_MIN * 60) / paces.E.secPerKm;
  const easyEach = easySlots > 0 ? Math.min(easyTotal / easySlots, maxEasyKm) : 0;

  const isRaceSim = phase === 'peak' && raceDistanceM >= RACE_DISTANCE_M.HALF;

  const out = layout.map((slot) => {
    const offset = offsetForDayOfWeek(weekStartIso, slot.dow);
    switch (slot.role) {
      case 'long':
        return make(
          offset,
          'long',
          'E',
          longKm,
          isRaceSim
            ? `롱런 ${longKm.toFixed(1)}km — 마지막 ${Math.min(6, longKm * 0.3).toFixed(1)}km 는 마라톤 페이스`
            : undefined,
        );
      case 'q1':
        return q1.zoneKm > 0
          ? make(
              offset,
              q1.type,
              q1.zone,
              q1Km,
              `워밍업 ${wu.toFixed(1)}km + ${q1.structure} + 쿨다운 ${wu.toFixed(1)}km`,
              undefined,
              q1.zoneKm,
            )
          : make(offset, 'easy', 'E', easyEach, q1.structure);
      case 'q2':
        return q2 && q2.zoneKm > 0
          ? make(
              offset,
              q2.type,
              q2.zone,
              q2Km,
              `워밍업 ${wu.toFixed(1)}km + ${q2.structure} + 쿨다운 ${wu.toFixed(1)}km`,
              undefined,
              q2.zoneKm,
            )
          : make(offset, 'easy', 'E', easyEach, q2?.structure);
      default:
        return make(offset, 'easy', 'E', easyEach);
    }
  });

  return out.sort((a, b) => a.date.localeCompare(b.date));
}
