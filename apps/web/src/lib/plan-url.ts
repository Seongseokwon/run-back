/**
 * F-08 상태 저장 — PlanInput 을 URL 에 담고 되돌린다.
 *
 * 엔진이 결정론적이라 입력만 있으면 같은 플랜이 나온다 (PRD §7 도입부).
 * 그래서 서버에 아무것도 저장하지 않고도 링크 하나로 플랜이 복원된다.
 * 로그인은 이 위에 얹히는 것이지 이걸 대체하지 않는다 (§9.2 저장 게이트).
 *
 * `today` 를 함께 굳히는 이유: 플랜은 "그날 기준으로 역산한 결과"다.
 * 나중에 열어도 같은 플랜이 나와야 하므로 생성 시점을 박아 둔다.
 *
 * URL 은 사용자가 손으로 고칠 수 있다. 디코더는 전부 검증하고, 조금이라도
 * 어긋나면 null 을 낸다 — 깨진 입력으로 훈련 플랜을 만드는 것보다 안전하다.
 */

import type { Route } from 'next';
import type { FitnessInput, GoalInput, PlanInput, RaceDistanceM } from '@runback/engine';
import { DAYS, DISTANCES, isNum, isValidDate } from './plan-input.ts';

/** URL 에 담기는 것 — 엔진 입력 + 표시에 필요한 대회 식별자 */
export type PlanRequest = {
  input: PlanInput;
  /** 어느 대회에서 왔는지. 직접 입력이면 없다 */
  raceSlug?: string;
};

/* 키를 한 글자로 줄인다. 카카오톡 공유 시 URL 이 짧을수록 좋다 */
type Packed = {
  d: string;
  m: number;
  t: string;
  f: [0, number, number] | [1, number, number] | [2, number];
  g: [0, number] | [1];
  w: number;
  k?: number;
  r?: string;
};

function packFitness(f: FitnessInput): Packed['f'] {
  switch (f.kind) {
    case 'race':
      return [0, f.distanceM, Math.round(f.timeSec)];
    case 'feel':
      return [1, Math.round(f.easyPaceSecPerKm), round1(f.weeklyKm)];
    case 'novice':
      return [2, Math.round(f.canRunMin)];
  }
}

function unpackFitness(f: unknown): FitnessInput | null {
  if (!Array.isArray(f)) return null;
  const [kind, a, b] = f as [unknown, unknown, unknown];
  if (kind === 0 && isNum(a, 800, 100_000) && isNum(b, 60, 12 * 3600)) {
    return { kind: 'race', distanceM: a, timeSec: b };
  }
  if (kind === 1 && isNum(a, 120, 1200) && isNum(b, 0, 300)) {
    return { kind: 'feel', easyPaceSecPerKm: a, weeklyKm: b };
  }
  if (kind === 2 && isNum(a, 0, 600)) return { kind: 'novice', canRunMin: a };
  return null;
}

function packGoal(g: GoalInput): Packed['g'] {
  return g.kind === 'time' ? [0, Math.round(g.targetSec)] : [1];
}

function unpackGoal(g: unknown): GoalInput | null {
  if (!Array.isArray(g)) return null;
  const [kind, a] = g as [unknown, unknown];
  if (kind === 0 && isNum(a, 60, 12 * 3600)) return { kind: 'time', targetSec: a };
  if (kind === 1) return { kind: 'finish' };
  return null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** UTF-8 안전 base64url. Node 와 브라우저 양쪽에서 같은 결과 */
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string | null {
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodePlanRequest(req: PlanRequest): string {
  const { input } = req;
  const packed: Packed = {
    d: input.raceDate,
    m: input.raceDistanceM,
    t: input.today,
    f: packFitness(input.fitness),
    g: packGoal(input.goal),
    w: input.daysPerWeek,
    ...(input.currentWeeklyKm !== undefined ? { k: round1(input.currentWeeklyKm) } : {}),
    ...(req.raceSlug ? { r: req.raceSlug } : {}),
  };
  return toBase64Url(JSON.stringify(packed));
}

/** 깨진 입력이면 null. 호출부는 반드시 이 경우를 처리해야 한다 */
export function decodePlanRequest(value: string | undefined): PlanRequest | null {
  if (!value) return null;
  const json = fromBase64Url(value);
  if (!json) return null;

  let p: Partial<Packed>;
  try {
    p = JSON.parse(json) as Partial<Packed>;
  } catch {
    return null;
  }
  if (typeof p !== 'object' || p === null) return null;

  if (!isValidDate(p.d)) return null;
  if (!isValidDate(p.t)) return null;
  if (typeof p.m !== 'number' || !DISTANCES.includes(p.m)) return null;
  if (typeof p.w !== 'number' || !DAYS.includes(p.w)) return null;

  const fitness = unpackFitness(p.f);
  const goal = unpackGoal(p.g);
  if (!fitness || !goal) return null;
  if (p.k !== undefined && !isNum(p.k, 0, 300)) return null;
  if (p.r !== undefined && (typeof p.r !== 'string' || !/^[a-z0-9-]{1,80}$/.test(p.r))) return null;

  // 대회일이 오늘보다 앞서면 역산할 기간이 없다
  if (p.d < p.t) return null;

  return {
    input: {
      raceDate: p.d,
      raceDistanceM: p.m as RaceDistanceM,
      today: p.t,
      fitness,
      goal,
      daysPerWeek: p.w as 3 | 4 | 5 | 6,
      ...(p.k !== undefined ? { currentWeeklyKm: p.k } : {}),
    },
    ...(p.r ? { raceSlug: p.r } : {}),
  };
}

/**
 * `/plan/result?p=...` 같은 경로를 만든다.
 *
 * `typedRoutes` 는 리터럴만 검증하고 조립한 문자열은 캐스팅을 요구한다.
 * base 가 리터럴 유니온이라 **여기서만** 단언하면 호출부는 전부 타입 안전하다 —
 * 캐스팅을 화면마다 흩어 두면 그게 곧 검사를 끄는 것이다.
 */
export function planHref(base: '/plan/result' | '/plan/verdict', req: PlanRequest): Route {
  return `${base}?p=${encodePlanRequest(req)}` as Route;
}
