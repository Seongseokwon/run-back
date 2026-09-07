/**
 * PRD §11.3 불변식 테스트 중 **W1 범위**(페이스 · 거리 환산 · 결정론 · 무크래시).
 * 볼륨/ACWR/세션 배치 불변식은 W2 에서 이 파일에 추가한다.
 *
 * 무작위 입력은 고정 시드 PRNG 로 만든다. 실패 케이스를 그대로 재현할 수 있어야 한다.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateFitness } from '../src/fitness.ts';
import { paceTable } from '../src/zones.ts';
import { convertRaceTime } from '../src/riegel.ts';
import { predictRaceTimeSec, vdotFromRace } from '../src/daniels.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';
import type { FitnessInput } from '../src/types.ts';

const SEED = 20260907;
const CASES = 3000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DISTANCES = Object.values(RACE_DISTANCE_M);

function randomFitness(rnd: () => number): FitnessInput {
  const roll = rnd();
  if (roll < 0.4) {
    const distanceM = DISTANCES[Math.floor(rnd() * DISTANCES.length)]!;
    // 페이스 2:30 ~ 12:00 /km 범위의 기록
    const paceSec = 150 + rnd() * 570;
    return { kind: 'race', distanceM, timeSec: (distanceM / 1000) * paceSec };
  }
  if (roll < 0.75) {
    return { kind: 'feel', easyPaceSecPerKm: 200 + rnd() * 500, weeklyKm: rnd() * 120 };
  }
  return { kind: 'novice', canRunMin: rnd() * 120 };
}

describe(`무작위 입력 ${CASES}건 (seed=${SEED})`, () => {
  test('크래시 없이 유한한 값만 낸다', () => {
    const rnd = mulberry32(SEED);
    for (let i = 0; i < CASES; i++) {
      const fitness = randomFitness(rnd);
      const weekly = rnd() < 0.5 ? undefined : rnd() * 130;
      const est = estimateFitness(fitness, weekly);

      assert.ok(Number.isFinite(est.vdot), `case=${i} ${JSON.stringify(fitness)}`);
      assert.ok(est.weeklyKm >= 0 && Number.isFinite(est.weeklyKm), `case=${i}`);

      const table = paceTable(est.vdot);
      for (const zone of Object.values(table)) {
        assert.ok(Number.isFinite(zone.secPerKm) && zone.secPerKm > 0, `case=${i} zone=${zone.zone}`);
        assert.ok(zone.fastSecPerKm < zone.slowSecPerKm, `case=${i} zone=${zone.zone}`);
      }

      for (const target of DISTANCES) {
        const t = predictRaceTimeSec(est.vdot, target);
        assert.ok(Number.isFinite(t) && t > 0, `case=${i} target=${target}`);
      }
    }
  });

  test('존 순서 불변식이 무작위 입력 전건에서 유지된다', () => {
    const rnd = mulberry32(SEED + 1);
    for (let i = 0; i < CASES; i++) {
      const est = estimateFitness(randomFitness(rnd));
      const t = paceTable(est.vdot);
      assert.ok(t.E.fastSecPerKm > t.M.secPerKm, `case=${i} vdot=${est.vdot}`);
      assert.ok(t.M.secPerKm > t.T.secPerKm, `case=${i} vdot=${est.vdot}`);
      assert.ok(t.T.secPerKm > t.I.secPerKm, `case=${i} vdot=${est.vdot}`);
      assert.ok(t.I.secPerKm > t.R.secPerKm, `case=${i} vdot=${est.vdot}`);
    }
  });

  test('거리 환산이 항상 fast < mid < slow 이고 유한하다', () => {
    const rnd = mulberry32(SEED + 2);
    for (let i = 0; i < CASES; i++) {
      const from = DISTANCES[Math.floor(rnd() * DISTANCES.length)]!;
      const to = DISTANCES[Math.floor(rnd() * DISTANCES.length)]!;
      const r = convertRaceTime({
        fromDistanceM: from,
        fromTimeSec: (from / 1000) * (150 + rnd() * 570),
        toDistanceM: to,
        currentWeeklyKm: rnd() * 120,
      });
      assert.ok(Number.isFinite(r.midSec) && r.midSec > 0, `case=${i}`);
      assert.ok(r.fastSec < r.midSec && r.midSec < r.slowSec, `case=${i}`);
    }
  });

  test('결정론 — 같은 시드로 두 번 돌리면 결과가 완전히 같다', () => {
    const run = (): unknown[] => {
      const rnd = mulberry32(SEED + 3);
      const out: unknown[] = [];
      for (let i = 0; i < 500; i++) {
        const est = estimateFitness(randomFitness(rnd));
        out.push(est, paceTable(est.vdot));
      }
      return out;
    };
    assert.deepEqual(run(), run());
  });

  test('VDOT ↔ 기록 왕복 오차가 0.001 미만이다', () => {
    const rnd = mulberry32(SEED + 4);
    for (let i = 0; i < 1000; i++) {
      const vdot = 25 + rnd() * 60;
      const d = DISTANCES[Math.floor(rnd() * DISTANCES.length)]!;
      const back = vdotFromRace(d, predictRaceTimeSec(vdot, d)).raw;
      assert.ok(Math.abs(back - vdot) < 1e-3, `case=${i} vdot=${vdot} back=${back}`);
    }
  });
});
