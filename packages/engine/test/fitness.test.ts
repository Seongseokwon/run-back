import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { NOVICE_VDOT_CEIL, NOVICE_VDOT_FLOOR, estimateFitness, vdotCeilingFromVolume } from '../src/fitness.ts';
import { VDOT_MAX, VDOT_MIN } from '../src/daniels.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';

describe('race 경로', () => {
  test('기록에서 VDOT를 뽑고 신뢰도가 high 다', () => {
    const r = estimateFitness({ kind: 'race', distanceM: RACE_DISTANCE_M['10K'], timeSec: 41 * 60 + 20 });
    assert.ok(Math.abs(r.vdot - 50) < 1, `vdot=${r.vdot}`);
    assert.equal(r.confidence, 'high');
    assert.equal(r.conservative, false);
  });

  test('주간 거리를 주면 그대로 쓰고, 없으면 추정 플래그를 세운다', () => {
    const given = estimateFitness({ kind: 'race', distanceM: 10000, timeSec: 2480 }, 45);
    assert.equal(given.weeklyKm, 45);
    assert.equal(given.weeklyKmEstimated, false);

    const inferred = estimateFitness({ kind: 'race', distanceM: 10000, timeSec: 2480 });
    assert.equal(inferred.weeklyKmEstimated, true);
    assert.ok(inferred.weeklyKm >= 10 && inferred.weeklyKm <= 60);
  });

  test('극단 기록은 클램프하고 안내 문장을 남긴다', () => {
    const r = estimateFitness({ kind: 'race', distanceM: 5000, timeSec: 12 * 60 });
    assert.equal(r.vdot, VDOT_MAX);
    assert.ok(r.notes.length > 0);
  });
});

describe('feel 경로', () => {
  test('훈련량이 뒷받침되면 신고 페이스를 그대로 반영한다', () => {
    const r = estimateFitness({ kind: 'feel', easyPaceSecPerKm: 5 * 60 + 30, weeklyKm: 60 });
    assert.ok(r.vdot > 45, `vdot=${r.vdot}`);
    assert.equal(r.notes.length, 0);
    assert.equal(r.confidence, 'medium');
  });

  test('주간 거리가 적으면 추정치를 눌러 내리고 근거를 남긴다', () => {
    const low = estimateFitness({ kind: 'feel', easyPaceSecPerKm: 5 * 60, weeklyKm: 12 });
    const high = estimateFitness({ kind: 'feel', easyPaceSecPerKm: 5 * 60, weeklyKm: 60 });
    assert.ok(low.vdot < high.vdot, `low=${low.vdot} high=${high.vdot}`);
    assert.ok(low.notes.length > 0);
    assert.equal(low.confidence, 'low');
    assert.equal(low.conservative, true);
  });

  test('같은 주간 거리면 페이스가 빠를수록 VDOT가 높다 (단조)', () => {
    let prev = 0;
    for (let p = 8 * 60; p >= 4 * 60; p -= 10) {
      const v = estimateFitness({ kind: 'feel', easyPaceSecPerKm: p, weeklyKm: 40 }).vdot;
      assert.ok(v > prev, `pace=${p} v=${v} prev=${prev}`);
      prev = v;
    }
  });

  test('훈련량 기반 VDOT 상한이 [30, 62] 안에 있다', () => {
    assert.equal(vdotCeilingFromVolume(0), 30);
    assert.equal(vdotCeilingFromVolume(1000), 62);
    assert.ok(vdotCeilingFromVolume(40) > vdotCeilingFromVolume(20));
  });
});

describe('novice 경로', () => {
  test('프리셋 밴드 30~35 안에 들어간다', () => {
    for (const min of [0, 5, 10, 20, 30, 40, 60, 120]) {
      const r = estimateFitness({ kind: 'novice', canRunMin: min });
      assert.ok(r.vdot >= NOVICE_VDOT_FLOOR && r.vdot <= NOVICE_VDOT_CEIL, `min=${min} vdot=${r.vdot}`);
    }
  });

  test('항상 보수적으로 표시되고 신뢰도가 low 다', () => {
    const r = estimateFitness({ kind: 'novice', canRunMin: 25 });
    assert.equal(r.conservative, true);
    assert.equal(r.confidence, 'low');
    assert.ok(r.notes.length > 0);
  });

  test('오래 뛸수록 VDOT가 높아지고 40분에서 상한에 닿는다', () => {
    assert.ok(estimateFitness({ kind: 'novice', canRunMin: 30 }).vdot > estimateFitness({ kind: 'novice', canRunMin: 10 }).vdot);
    assert.equal(estimateFitness({ kind: 'novice', canRunMin: 40 }).vdot, NOVICE_VDOT_CEIL);
    assert.equal(estimateFitness({ kind: 'novice', canRunMin: 90 }).vdot, NOVICE_VDOT_CEIL);
  });

  test('주간 거리를 추정하고 8~40km 안에 둔다', () => {
    for (const min of [5, 20, 40, 90]) {
      const r = estimateFitness({ kind: 'novice', canRunMin: min });
      assert.ok(r.weeklyKm >= 8 && r.weeklyKm <= 40, `min=${min} km=${r.weeklyKm}`);
      assert.equal(r.weeklyKmEstimated, true);
    }
  });
});

describe('공통 계약', () => {
  test('모든 경로가 VDOT 신뢰 구간 안의 값을 낸다', () => {
    const inputs = [
      { kind: 'race', distanceM: 5000, timeSec: 1800 },
      { kind: 'race', distanceM: 42195, timeSec: 4 * 3600 },
      { kind: 'feel', easyPaceSecPerKm: 420, weeklyKm: 25 },
      { kind: 'feel', easyPaceSecPerKm: 240, weeklyKm: 5 },
      { kind: 'novice', canRunMin: 15 },
    ] as const;
    for (const i of inputs) {
      const r = estimateFitness(i);
      assert.ok(r.vdot >= VDOT_MIN && r.vdot <= VDOT_MAX, `${JSON.stringify(i)} → ${r.vdot}`);
    }
  });

  test('결정론', () => {
    const i = { kind: 'feel', easyPaceSecPerKm: 333, weeklyKm: 27 } as const;
    assert.deepEqual(estimateFitness(i), estimateFitness(i));
  });
});
