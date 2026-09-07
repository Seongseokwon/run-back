/**
 * 훈련 존 정의와 페이스표 산출 — PRD §7.6, §7.8
 *
 * 강도 계수(intensity coefficient)에 대하여
 * ─────────────────────────────────────────
 * 아래 계수는 "VDOT 대비 산소 요구량 비율"이며, PRD §7.6 표의 %VO2max 밴드를
 * 그대로 옮긴 값이 **아니다.** 식 1(VO2 수요식)은 대회 수준의 러닝 이코노미를 전제하므로,
 * E존의 생리학적 밴드(59~74%)를 그대로 페이스로 환산하면 M 페이스에 근접한
 * "너무 빠른 이지런"이 나온다. 실제로 74%를 넣으면 VDOT 50 기준 4:53/km 가 나오는데
 * 이는 같은 VDOT 의 마라톤 페이스(약 4:46/km)와 사실상 같다.
 *
 * 따라서 계수를 다음 원칙으로 정했다.
 *  - T/I/R : 생리학적 밴드 안에서 지속시간 앵커에 맞춰 고정
 *      T = 젖산 역치, 약 60분 지속 가능한 강도. f(60분) ≈ 0.888 이므로 0.88 채택
 *      I = VO2max 자극, 3~5분 반복. 95~100% 밴드의 상단 0.98
 *      R = 무산소·이코노미, 2분 이하 반복. 100% 초과 밴드의 1.06
 *  - M     : 고정 계수를 쓰지 않고 **거리 자체로 역산**한다.
 *      M 은 정의상 "그 사람의 마라톤 레이스 페이스"이므로
 *      predictRaceTimeSec(vdot, 42195) 로 구하면 러너 수준에 따라
 *      75~84% 밴드 안에서 자연히 움직인다. 초급자에게 고정 0.84를 쓰면 과속이 된다.
 *  - E     : 실무 이지 페이스 밴드에 맞춰 0.55~0.65 로 캘리브레이션했다.
 *
 * ⚠️ E 계수 0.55/0.65 는 **가설**이다 (PRD §18 O2 와 같은 성격).
 *    도그푸딩·실사용 데이터로 보정할 것. 변경 시 ENGINE_VERSION 을 올린다.
 */

import { RACE_DISTANCE_M, formatPace, per400m, round } from './units.ts';
import { paceForIntensity, predictRaceTimeSec } from './daniels.ts';

export const ZONE_KEYS = ['E', 'M', 'T', 'I', 'R'] as const;
export type ZoneKey = (typeof ZONE_KEYS)[number];

/** 페이스 산출용 강도 계수. M 은 거리 역산이므로 계수가 없다 */
export const INTENSITY = {
  E_SLOW: 0.55,
  E_FAST: 0.65,
  T: 0.88,
  I: 0.98,
  R: 1.06,
} as const;

/** E존 대표값(신뢰도 추정 등에서 단일 값이 필요할 때). 밴드 중앙 */
export const E_CENTER = (INTENSITY.E_SLOW + INTENSITY.E_FAST) / 2;

/**
 * 존별 주간 거리 상한 (총 주간 거리 대비 비율) — PRD §7.6.
 * 엔진의 하드 제약. §11.3 테스트로 강제한다.
 */
export const ZONE_WEEKLY_SHARE_CAP: Readonly<Record<Exclude<ZoneKey, 'E'>, number>> = {
  M: 0.2,
  T: 0.1,
  I: 0.08,
  R: 0.05,
};

/** 단일 세션 상한 (분) — PRD §7.6 */
export const ZONE_SESSION_CAP_MIN: Readonly<Record<ZoneKey, number>> = {
  E: 150,
  M: 110,
  T: 20,
  I: 5,
  R: 2,
};

/** §7.8 정직성 원칙 — 단일 숫자 금지. 표시 폭 ±3초/km */
export const PACE_DISPLAY_TOLERANCE_SEC = 3;

export type ZonePace = {
  zone: ZoneKey;
  /** 대표 페이스 (sec/km) */
  secPerKm: number;
  /** 표시용 하한(빠른 쪽) */
  fastSecPerKm: number;
  /** 표시용 상한(느린 쪽) */
  slowSecPerKm: number;
  /** "5:23~5:29" */
  display: string;
  /** R존 표기 보조. 400m 환산 초 */
  per400mSec: number;
  nameKo: string;
  purposeKo: string;
};

const ZONE_META: Readonly<Record<ZoneKey, { nameKo: string; purposeKo: string }>> = {
  E: { nameKo: '이지', purposeKo: '부상 저항력과 모세혈관 발달. 훈련량의 대부분을 여기서 채운다' },
  M: { nameKo: '마라톤', purposeKo: '레이스 페이스 감각과 글리코겐 절약' },
  T: { nameKo: '역치', purposeKo: '젖산 제거 능력. 약 60분 버틸 수 있는 강도' },
  I: { nameKo: '인터벌', purposeKo: 'VO2max 자극. 3~5분 반복' },
  R: { nameKo: '리피티션', purposeKo: '무산소 파워와 러닝 이코노미. 2분 이하 반복' },
};

function band(fast: number, slow: number, zone: ZoneKey): ZonePace {
  const center = (fast + slow) / 2;
  return {
    zone,
    secPerKm: round(center, 1),
    fastSecPerKm: round(fast, 1),
    slowSecPerKm: round(slow, 1),
    display: `${formatPace(fast)}~${formatPace(slow)}`,
    per400mSec: round(per400m(center), 1),
    ...ZONE_META[zone],
  };
}

function tolerantBand(secPerKm: number, zone: ZoneKey): ZonePace {
  return band(secPerKm - PACE_DISPLAY_TOLERANCE_SEC, secPerKm + PACE_DISPLAY_TOLERANCE_SEC, zone);
}

/** VDOT → 5개 존 목표 페이스표 */
export function paceTable(vdot: number): Record<ZoneKey, ZonePace> {
  const eFast = paceForIntensity(vdot, INTENSITY.E_FAST);
  const eSlow = paceForIntensity(vdot, INTENSITY.E_SLOW);
  const marathonSec = predictRaceTimeSec(vdot, RACE_DISTANCE_M.FULL);
  const mPace = marathonSec / (RACE_DISTANCE_M.FULL / 1000);

  return {
    E: band(eFast, eSlow, 'E'),
    M: tolerantBand(mPace, 'M'),
    T: tolerantBand(paceForIntensity(vdot, INTENSITY.T), 'T'),
    I: tolerantBand(paceForIntensity(vdot, INTENSITY.I), 'I'),
    R: tolerantBand(paceForIntensity(vdot, INTENSITY.R), 'R'),
  };
}

/**
 * PRD §7.8 — 입문자에게는 E·M 두 개만 노출한다.
 * 5개 존은 인지 부하가 크다.
 */
export function visibleZones(level: 'novice' | 'full'): readonly ZoneKey[] {
  return level === 'novice' ? (['E', 'M'] as const) : ZONE_KEYS;
}
