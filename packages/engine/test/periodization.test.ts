import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACWR_CAP,
  DOWN_WEEK_RATIO,
  allocatePhases,
  buildVolumeCurve,
  peakWeeklyKmCap,
  taperCurve,
  taperWeeksFor,
  type Phase,
} from '../src/periodization.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';

const DISTANCES = Object.values(RACE_DISTANCE_M);
const DAYS = [3, 4, 5, 6] as const;

describe('페이즈 배분 (§7.4)', () => {
  test('테이퍼 주차가 PRD 표와 같다', () => {
    assert.equal(taperWeeksFor(RACE_DISTANCE_M['5K']), 1);
    assert.equal(taperWeeksFor(RACE_DISTANCE_M['10K']), 2);
    assert.equal(taperWeeksFor(RACE_DISTANCE_M.HALF), 2);
    assert.equal(taperWeeksFor(RACE_DISTANCE_M.FULL), 3);
  });

  test('주차 1~52 전 구간에서 길이가 맞고 순서가 base→build→peak→taper 다', () => {
    const order: Phase[] = ['base', 'build', 'peak', 'taper'];
    for (const d of DISTANCES) {
      for (let w = 1; w <= 52; w++) {
        const phases = allocatePhases(w, d);
        assert.equal(phases.length, w, `d=${d} w=${w}`);
        let cursor = 0;
        for (const p of phases) {
          const idx = order.indexOf(p);
          assert.ok(idx >= cursor, `d=${d} w=${w} 순서 역전: ${phases.join(',')}`);
          cursor = idx;
        }
        assert.ok(phases.includes('taper'), `d=${d} w=${w} 테이퍼 없음`);
      }
    }
  });

  test('충분히 긴 플랜에서 Base 가 가장 길다', () => {
    const phases = allocatePhases(20, RACE_DISTANCE_M.FULL);
    const count = (p: Phase) => phases.filter((x) => x === p).length;
    assert.ok(count('base') >= count('build'));
    assert.ok(count('build') >= count('peak'));
  });

  test('레이스 주는 항상 테이퍼다', () => {
    for (let w = 1; w <= 30; w++) {
      const phases = allocatePhases(w, RACE_DISTANCE_M.HALF);
      assert.equal(phases[phases.length - 1], 'taper', `w=${w}`);
    }
  });
});

describe('테이퍼 곡선 (§7.4)', () => {
  test('강도가 아니라 양만 줄인다 — 비율이 단조 감소한다', () => {
    for (const d of DISTANCES) {
      const curve = taperCurve(d);
      for (let i = 1; i < curve.length; i++) {
        assert.ok(curve[i]! < curve[i - 1]!, `d=${d} ${curve.join(',')}`);
      }
      assert.ok(curve.every((r) => r > 0 && r < 1));
    }
  });
});

describe('피크 주간 거리 상한 (§7.5)', () => {
  test('거리가 길수록, 훈련 일수가 많을수록 커진다', () => {
    for (const d of DAYS) {
      let prev = 0;
      for (const dist of DISTANCES) {
        const cap = peakWeeklyKmCap(dist, d);
        assert.ok(cap > prev, `d=${d} dist=${dist}`);
        prev = cap;
      }
    }
    for (const dist of DISTANCES) {
      for (let i = 1; i < DAYS.length; i++) {
        assert.ok(peakWeeklyKmCap(dist, DAYS[i]!) > peakWeeklyKmCap(dist, DAYS[i - 1]!));
      }
    }
  });

  test('PRD 표 경계값과 일치한다', () => {
    assert.equal(peakWeeklyKmCap(RACE_DISTANCE_M['5K'], 3), 25);
    assert.equal(peakWeeklyKmCap(RACE_DISTANCE_M['5K'], 6), 45);
    assert.equal(peakWeeklyKmCap(RACE_DISTANCE_M.FULL, 3), 60);
    assert.equal(peakWeeklyKmCap(RACE_DISTANCE_M.FULL, 6), 100);
  });
});

describe('볼륨 곡선 + ACWR (§7.5)', () => {
  test('전 조합에서 ACWR 상한을 넘지 않는다', () => {
    for (const d of DISTANCES) {
      for (const days of DAYS) {
        for (const startKm of [5, 15, 30, 60, 100]) {
          for (const w of [1, 2, 4, 8, 12, 16, 24, 40]) {
            const curve = buildVolumeCurve({
              phases: allocatePhases(w, d),
              startKm,
              distanceM: d,
              daysPerWeek: days,
            });
            for (const week of curve.weeks) {
              assert.ok(
                week.acwr <= ACWR_CAP + 0.005,
                `d=${d} days=${days} start=${startKm} w=${w} 주차 ${week.index} ACWR ${week.acwr}`,
              );
            }
          }
        }
      }
    }
  });

  test('3주 증가 → 1주 감량 사이클이 있다', () => {
    const curve = buildVolumeCurve({
      phases: allocatePhases(20, RACE_DISTANCE_M.FULL),
      startKm: 40,
      distanceM: RACE_DISTANCE_M.FULL,
      daysPerWeek: 5,
    });
    const down = curve.weeks.filter((w) => w.isDownWeek);
    assert.ok(down.length >= 3, `감량 주차 ${down.length}개`);
    for (const w of down) {
      const prev = curve.weeks[w.index - 1]!;
      assert.ok(w.km < prev.km, `주차 ${w.index} 감량 안 됨`);
      assert.ok(Math.abs(w.km / prev.km - DOWN_WEEK_RATIO) < 0.02 || w.clamped);
    }
  });

  test('마지막 프렙 주차는 감량 주차가 아니다', () => {
    for (let w = 4; w <= 30; w++) {
      const phases = allocatePhases(w, RACE_DISTANCE_M.HALF);
      const curve = buildVolumeCurve({ phases, startKm: 30, distanceM: RACE_DISTANCE_M.HALF, daysPerWeek: 4 });
      const prep = curve.weeks.filter((x) => x.phase !== 'taper');
      if (prep.length > 0) assert.equal(prep[prep.length - 1]!.isDownWeek, false, `w=${w}`);
    }
  });

  test('테이퍼 구간은 계속 줄어들고 레이스 주가 가장 적다', () => {
    const curve = buildVolumeCurve({
      phases: allocatePhases(16, RACE_DISTANCE_M.FULL),
      startKm: 50,
      distanceM: RACE_DISTANCE_M.FULL,
      daysPerWeek: 5,
    });
    const taper = curve.weeks.filter((w) => w.phase === 'taper');
    for (let i = 1; i < taper.length; i++) assert.ok(taper[i]!.km < taper[i - 1]!.km);
    assert.equal(taper[taper.length - 1]!.km, Math.min(...curve.weeks.map((w) => w.km)));
  });

  test('시작 주간 거리가 낮으면 클램프가 걸리고 shortfall 로 보고된다', () => {
    const curve = buildVolumeCurve({
      phases: allocatePhases(8, RACE_DISTANCE_M.FULL),
      startKm: 10,
      distanceM: RACE_DISTANCE_M.FULL,
      daysPerWeek: 4,
    });
    assert.equal(curve.anyClamped, true);
    assert.equal(curve.peakShortfall, true);
    assert.ok(curve.peakKm < curve.targetPeakKm);
  });

  test('이미 충분한 훈련량이면 클램프도 shortfall 도 없다', () => {
    const curve = buildVolumeCurve({
      phases: allocatePhases(20, RACE_DISTANCE_M.HALF),
      startKm: 55,
      distanceM: RACE_DISTANCE_M.HALF,
      daysPerWeek: 5,
    });
    assert.equal(curve.peakShortfall, false);
  });

  test('결정론', () => {
    const args = {
      phases: allocatePhases(14, RACE_DISTANCE_M.HALF),
      startKm: 33,
      distanceM: RACE_DISTANCE_M.HALF,
      daysPerWeek: 4 as const,
    };
    assert.deepEqual(buildVolumeCurve(args), buildVolumeCurve(args));
  });
});
