import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VDOT_MAX,
  VDOT_MIN,
  oxygenCost,
  paceForIntensity,
  predictRaceTimeSec,
  sustainableFraction,
  velocityForOxygenCost,
  vdotFromRace,
} from '../src/daniels.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';

describe('식 1 — 산소 요구량', () => {
  test('속도가 빠를수록 요구량이 커진다', () => {
    for (let v = 100; v < 500; v += 10) {
      assert.ok(oxygenCost(v + 10) > oxygenCost(v), `v=${v}`);
    }
  });

  test('역함수 왕복이 일치한다', () => {
    for (let v = 100; v <= 500; v += 7) {
      assert.ok(Math.abs(velocityForOxygenCost(oxygenCost(v)) - v) < 1e-6, `v=${v}`);
    }
  });

  test('0 이하 속도는 거부한다', () => {
    assert.throws(() => oxygenCost(0), RangeError);
    assert.throws(() => oxygenCost(-1), RangeError);
  });
});

describe('식 2 — 지속 가능 비율', () => {
  test('시간이 길어질수록 단조 감소한다', () => {
    for (let t = 1; t < 300; t += 1) {
      assert.ok(sustainableFraction(t + 1) < sustainableFraction(t), `t=${t}`);
    }
  });

  test('충분히 긴 시간에서 0.8 로 수렴한다', () => {
    assert.ok(Math.abs(sustainableFraction(10_000) - 0.8) < 1e-6);
  });

  test('60분 지속 비율이 T존 계수 0.88 부근이다', () => {
    const f = sustainableFraction(60);
    assert.ok(f > 0.87 && f < 0.90, `f(60)=${f}`);
  });
});

describe('VDOT 역산과 예측', () => {
  test('예측 → 역산 왕복이 일치한다', () => {
    for (let vdot = VDOT_MIN; vdot <= VDOT_MAX; vdot += 0.5) {
      for (const d of Object.values(RACE_DISTANCE_M)) {
        const sec = predictRaceTimeSec(vdot, d);
        const back = vdotFromRace(d, sec).raw;
        assert.ok(Math.abs(back - vdot) < 1e-6, `vdot=${vdot} d=${d} back=${back}`);
      }
    }
  });

  test('같은 VDOT면 거리가 길수록 기록이 느려진다(페이스 기준)', () => {
    const vdot = 50;
    const dists = [RACE_DISTANCE_M['5K'], RACE_DISTANCE_M['10K'], RACE_DISTANCE_M.HALF, RACE_DISTANCE_M.FULL];
    let prevPace = 0;
    for (const d of dists) {
      const pace = predictRaceTimeSec(vdot, d) / (d / 1000);
      assert.ok(pace > prevPace, `d=${d} pace=${pace}`);
      prevPace = pace;
    }
  });

  test('VDOT가 높을수록 같은 거리 기록이 빨라진다', () => {
    for (let vdot = VDOT_MIN; vdot < VDOT_MAX; vdot += 1) {
      const a = predictRaceTimeSec(vdot, RACE_DISTANCE_M['10K']);
      const b = predictRaceTimeSec(vdot + 1, RACE_DISTANCE_M['10K']);
      assert.ok(b < a, `vdot=${vdot}`);
    }
  });

  test('신뢰 구간 밖 입력은 클램프하고 플래그를 세운다', () => {
    const slow = vdotFromRace(RACE_DISTANCE_M['5K'], 60 * 60);
    assert.equal(slow.vdot, VDOT_MIN);
    assert.equal(slow.clamped, true);

    const fast = vdotFromRace(RACE_DISTANCE_M['5K'], 12 * 60);
    assert.equal(fast.vdot, VDOT_MAX);
    assert.equal(fast.clamped, true);

    const normal = vdotFromRace(RACE_DISTANCE_M['10K'], 41 * 60 + 20);
    assert.equal(normal.clamped, false);
  });

  test('잘못된 입력을 거부한다', () => {
    assert.throws(() => vdotFromRace(100, 60), RangeError);
    assert.throws(() => vdotFromRace(200_000, 3600), RangeError);
    assert.throws(() => vdotFromRace(5000, 0), RangeError);
    assert.throws(() => predictRaceTimeSec(0, 5000), RangeError);
  });
});

describe('강도별 페이스', () => {
  test('강도가 높을수록 페이스가 빨라진다', () => {
    for (let f = 0.5; f < 1.1; f += 0.02) {
      assert.ok(paceForIntensity(50, f + 0.02) < paceForIntensity(50, f), `f=${f}`);
    }
  });

  test('결정론 — 같은 입력이면 항상 같은 값', () => {
    const a = paceForIntensity(47.3, 0.88);
    const b = paceForIntensity(47.3, 0.88);
    assert.equal(a, b);
  });
});
