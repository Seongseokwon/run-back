import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FULL_UNDERTRAINED_PENALTY,
  RIEGEL_EXPONENT_LONG,
  RIEGEL_EXPONENT_SHORT,
  convertRaceTime,
  riegelExponent,
  uncertaintyRatio,
} from '../src/riegel.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';

describe('Riegel 지수 분기', () => {
  test('30km 미만은 1.06, 이상은 1.10', () => {
    assert.equal(riegelExponent(5), RIEGEL_EXPONENT_SHORT);
    assert.equal(riegelExponent(21.0975), RIEGEL_EXPONENT_SHORT);
    assert.equal(riegelExponent(29.99), RIEGEL_EXPONENT_SHORT);
    assert.equal(riegelExponent(30), RIEGEL_EXPONENT_LONG);
    assert.equal(riegelExponent(42.195), RIEGEL_EXPONENT_LONG);
  });
});

describe('거리 환산', () => {
  test('같은 거리로 환산하면 기록이 그대로다', () => {
    const r = convertRaceTime({
      fromDistanceM: RACE_DISTANCE_M['10K'],
      fromTimeSec: 2480,
      toDistanceM: RACE_DISTANCE_M['10K'],
    });
    assert.ok(Math.abs(r.midSec - 2480) < 1e-6);
  });

  test('범위 순서가 항상 fast < mid < slow', () => {
    const dists = Object.values(RACE_DISTANCE_M);
    for (const from of dists) {
      for (const to of dists) {
        if (from === to) continue;
        const r = convertRaceTime({ fromDistanceM: from, fromTimeSec: from / 3.5, toDistanceM: to });
        assert.ok(r.fastSec < r.midSec, `${from}->${to}`);
        assert.ok(r.midSec < r.slowSec, `${from}->${to}`);
      }
    }
  });

  test('하프 → 풀 환산이 단순 2배보다 느리다 (Riegel 낙관 편향 보정)', () => {
    const halfSec = 95 * 60;
    const r = convertRaceTime({
      fromDistanceM: RACE_DISTANCE_M.HALF,
      fromTimeSec: halfSec,
      toDistanceM: RACE_DISTANCE_M.FULL,
    });
    assert.ok(r.midSec > halfSec * 2, `mid=${r.midSec}`);
    assert.equal(r.exponent, RIEGEL_EXPONENT_LONG);
  });

  test('주간 거리 50km 미만이면 풀코스에 3% 페널티가 붙는다', () => {
    const base = { fromDistanceM: RACE_DISTANCE_M.HALF, fromTimeSec: 95 * 60, toDistanceM: RACE_DISTANCE_M.FULL };
    const trained = convertRaceTime({ ...base, currentWeeklyKm: 60 });
    const under = convertRaceTime({ ...base, currentWeeklyKm: 30 });
    assert.ok(Math.abs(under.midSec / trained.midSec - FULL_UNDERTRAINED_PENALTY) < 1e-9);
    assert.equal(under.adjustments.length, 2);
    assert.equal(trained.adjustments.length, 1);
  });

  test('주간 거리 미입력이면 페널티를 적용하지 않는다', () => {
    const base = { fromDistanceM: RACE_DISTANCE_M.HALF, fromTimeSec: 95 * 60, toDistanceM: RACE_DISTANCE_M.FULL };
    assert.equal(convertRaceTime(base).midSec, convertRaceTime({ ...base, currentWeeklyKm: 60 }).midSec);
  });

  test('하프 미만 거리에는 페널티가 붙지 않는다', () => {
    const base = { fromDistanceM: RACE_DISTANCE_M['5K'], fromTimeSec: 1200, toDistanceM: RACE_DISTANCE_M['10K'] };
    assert.equal(convertRaceTime({ ...base, currentWeeklyKm: 10 }).adjustments.length, 0);
  });

  test('장거리 예측은 느린 쪽으로 치우친다', () => {
    const r = convertRaceTime({
      fromDistanceM: RACE_DISTANCE_M['10K'],
      fromTimeSec: 50 * 60,
      toDistanceM: RACE_DISTANCE_M.FULL,
    });
    assert.ok(r.slowSec - r.midSec > r.midSec - r.fastSec);
  });
});

describe('불확실성 폭', () => {
  test('외삽이 멀수록 넓어지고 7%를 넘지 않는다', () => {
    const near = uncertaintyRatio(RACE_DISTANCE_M['10K'], RACE_DISTANCE_M.HALF);
    const far = uncertaintyRatio(RACE_DISTANCE_M['5K'], RACE_DISTANCE_M.FULL);
    assert.ok(far > near);
    assert.ok(far <= 0.07);
    assert.ok(uncertaintyRatio(5000, 5000) >= 0.015);
  });
});
