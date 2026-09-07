import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSERVATISM, DAYS_FACTOR, trainingCapacity, weeklyGainPct, weeklyGainRate } from '../src/gain.ts';

describe('VDOT 향상률 모델 (ADR-0002)', () => {
  test('실력이 높을수록 향상률이 낮아진다 — 연속 감쇠', () => {
    for (let v = 25; v < 80; v += 0.5) {
      assert.ok(weeklyGainPct(v + 0.5) < weeklyGainPct(v), `vdot=${v}`);
    }
  });

  test('계단 함수가 아니다 — 구간 경계에서 튀지 않는다', () => {
    for (const boundary of [35, 45, 55]) {
      const below = weeklyGainRate(boundary - 0.01, 4);
      const above = weeklyGainRate(boundary + 0.01, 4);
      assert.ok(Math.abs(above - below) < 0.001, `경계 ${boundary} 에서 ${below} → ${above}`);
    }
  });

  test('문헌 앵커를 안전 계수만큼 깎아 재현한다', () => {
    assert.ok(Math.abs(weeklyGainPct(30) - CONSERVATISM * 0.012) < 1e-9);
    assert.ok(Math.abs(weeklyGainPct(65) - CONSERVATISM * 0.002) < 1e-9);
  });

  test('훈련 일수가 많을수록 향상폭이 크다', () => {
    const days = [3, 4, 5, 6] as const;
    for (let i = 1; i < days.length; i++) {
      assert.ok(weeklyGainRate(45, days[i]!) > weeklyGainRate(45, days[i - 1]!));
    }
    assert.equal(DAYS_FACTOR[4], 1);
  });

  test('capacity 는 주차에 대해 단조 증가하고 수확 체감한다', () => {
    let prev = 0;
    let prevDelta = Infinity;
    for (let w = 1; w <= 40; w++) {
      const c = trainingCapacity({ vdot: 40, weeks: w, daysPerWeek: 4 });
      assert.ok(c > prev, `w=${w}`);
      const delta = c - prev;
      assert.ok(delta <= prevDelta + 1e-9, `수확 체감 위반 w=${w}`);
      prev = c;
      prevDelta = delta;
    }
  });

  test('0주면 capacity 가 0이다', () => {
    assert.equal(trainingCapacity({ vdot: 45, weeks: 0, daysPerWeek: 4 }), 0);
  });

  test('신뢰도 낮은 추정은 capacity 를 깎는다', () => {
    const normal = trainingCapacity({ vdot: 32, weeks: 12, daysPerWeek: 4 });
    const careful = trainingCapacity({ vdot: 32, weeks: 12, daysPerWeek: 4, conservative: true });
    assert.ok(careful < normal);
  });

  test('12주 향상폭이 물리적으로 그럴듯한 범위에 있다', () => {
    for (const v of [30, 40, 50, 60, 70]) {
      const c = trainingCapacity({ vdot: v, weeks: 12, daysPerWeek: 4 });
      assert.ok(c > 0.3 && c < 4, `vdot=${v} capacity=${c}`);
      assert.ok(c / v < 0.1, `vdot=${v} 12주에 ${((c / v) * 100).toFixed(1)}% 향상은 과도하다`);
    }
  });
});
