/**
 * PRD §11.3 — 엔진 불변식 전 항목. W2 완료 기준이다.
 * "여기 통과하지 못하면 배포하지 않는다."
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, SAFETY_DISCLAIMER } from '../src/plan.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';
import { addDays } from '../src/dates.ts';
import type { FitnessInput, GoalInput, PlanInput, RaceDistanceM } from '../src/types.ts';
import { assertPlanInvariants } from './_invariants.ts';

const TODAY = '2026-09-07';
const DISTANCES = Object.values(RACE_DISTANCE_M) as RaceDistanceM[];
const DAYS = [3, 4, 5, 6] as const;

function mk(over: Partial<PlanInput> = {}): PlanInput {
  return {
    raceDate: addDays(TODAY, 12 * 7),
    raceDistanceM: RACE_DISTANCE_M.HALF,
    today: TODAY,
    fitness: { kind: 'race', distanceM: 10000, timeSec: 50 * 60 },
    goal: { kind: 'finish' },
    daysPerWeek: 4,
    currentWeeklyKm: 30,
    ...over,
  };
}

describe('§11.3 불변식 — 전 조합 스윕', () => {
  test('거리 × 훈련일수 × 주차(1~52) 전 구간에서 크래시 없이 불변식을 지킨다', () => {
    for (const d of DISTANCES) {
      for (const days of DAYS) {
        for (let w = 1; w <= 52; w++) {
          const input = mk({ raceDistanceM: d, daysPerWeek: days, raceDate: addDays(TODAY, w * 7 + 1) });
          const plan = generatePlan(input);
          assertPlanInvariants(plan, `d=${d} days=${days} w=${w}`);
        }
      }
    }
  });

  test('시작 주간 거리 전 구간에서 불변식을 지킨다', () => {
    for (const km of [3, 8, 15, 25, 40, 60, 90, 130]) {
      for (const d of DISTANCES) {
        const plan = generatePlan(mk({ currentWeeklyKm: km, raceDistanceM: d, raceDate: addDays(TODAY, 16 * 7) }));
        assertPlanInvariants(plan, `startKm=${km} d=${d}`);
      }
    }
  });

  test('fitness 3경로 모두에서 불변식을 지킨다', () => {
    const fits: FitnessInput[] = [
      { kind: 'race', distanceM: 5000, timeSec: 18 * 60 },
      { kind: 'race', distanceM: 5000, timeSec: 40 * 60 },
      { kind: 'race', distanceM: 42195, timeSec: 5 * 3600 },
      { kind: 'feel', easyPaceSecPerKm: 400, weeklyKm: 20 },
      { kind: 'feel', easyPaceSecPerKm: 260, weeklyKm: 90 },
      { kind: 'novice', canRunMin: 5 },
      { kind: 'novice', canRunMin: 45 },
    ];
    for (const f of fits) {
      for (const d of DISTANCES) {
        const plan = generatePlan(mk({ fitness: f, raceDistanceM: d, currentWeeklyKm: undefined }));
        assertPlanInvariants(plan, `${JSON.stringify(f)} d=${d}`);
      }
    }
  });

  test('목표 종류 전 조합에서 불변식을 지킨다', () => {
    const goals: GoalInput[] = [
      { kind: 'finish' },
      { kind: 'time', targetSec: 60 * 60 },
      { kind: 'time', targetSec: 100 * 60 },
      { kind: 'time', targetSec: 300 * 60 },
    ];
    for (const g of goals) {
      for (const d of DISTANCES) {
        const plan = generatePlan(mk({ goal: g, raceDistanceM: d }));
        assertPlanInvariants(plan, `${JSON.stringify(g)} d=${d}`);
      }
    }
  });
});

describe('§11.3 — 결정론', () => {
  test('같은 입력이면 완전히 같은 플랜', () => {
    for (const d of DISTANCES) {
      const input = mk({ raceDistanceM: d, daysPerWeek: 5, goal: { kind: 'time', targetSec: 120 * 60 } });
      assert.deepEqual(generatePlan(input), generatePlan(input));
    }
  });

  test('입력이 바뀌면 플랜도 바뀐다', () => {
    const a = generatePlan(mk({ daysPerWeek: 4 }));
    const b = generatePlan(mk({ daysPerWeek: 5 }));
    assert.notDeepEqual(a.weeks, b.weeks);
  });
});

describe('무작위 입력 2,000건', () => {
  test('크래시 없이 불변식을 지킨다', () => {
    let a = 20260907 >>> 0;
    const rnd = (): number => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = 0; i < 2000; i++) {
      const d = DISTANCES[Math.floor(rnd() * DISTANCES.length)]!;
      const days = DAYS[Math.floor(rnd() * DAYS.length)]!;
      const weeks = 1 + Math.floor(rnd() * 40);
      const roll = rnd();
      const fitness: FitnessInput =
        roll < 0.4
          ? { kind: 'race', distanceM: 10000, timeSec: (30 + rnd() * 60) * 60 }
          : roll < 0.75
            ? { kind: 'feel', easyPaceSecPerKm: 240 + rnd() * 400, weeklyKm: rnd() * 110 }
            : { kind: 'novice', canRunMin: rnd() * 90 };
      const goal: GoalInput = rnd() < 0.5 ? { kind: 'finish' } : { kind: 'time', targetSec: (15 + rnd() * 350) * 60 };

      const input = mk({
        raceDistanceM: d,
        daysPerWeek: days,
        raceDate: addDays(TODAY, weeks * 7 + Math.floor(rnd() * 7)),
        fitness,
        goal,
        ...(rnd() < 0.5 ? {} : { currentWeeklyKm: 3 + rnd() * 120 }),
      });
      assertPlanInvariants(generatePlan(input), `case=${i} ${JSON.stringify(input)}`);
    }
  });
});

describe('안전 고지 (§7.10)', () => {
  test('모든 플랜에 의료 조언 아님 고지가 들어간다', () => {
    for (const d of DISTANCES) {
      assert.ok(generatePlan(mk({ raceDistanceM: d })).notices.includes(SAFETY_DISCLAIMER));
    }
  });

  test('ACWR 클램프가 걸리면 조용히 줄이지 않고 알린다', () => {
    const plan = generatePlan(mk({ currentWeeklyKm: 8, raceDistanceM: RACE_DISTANCE_M.FULL, raceDate: addDays(TODAY, 14 * 7) }));
    assert.ok(plan.weeks.some((w) => w.clamped));
    assert.ok(plan.notices.some((n) => n.includes('ACWR')));
  });

  test('피크가 목표에 못 미치면 판정을 낮추고 그 사실을 알린다', () => {
    const plan = generatePlan(
      mk({ currentWeeklyKm: 8, raceDistanceM: RACE_DISTANCE_M.FULL, raceDate: addDays(TODAY, 13 * 7), goal: { kind: 'finish' } }),
    );
    assert.notEqual(plan.verdict, 'safe');
    assert.ok(plan.notices.some((n) => n.includes('피크')));
  });
});

describe('플랜 구조', () => {
  test('주차 수가 weeksAvailable 과 같고 마지막 주가 대회일로 끝난다', () => {
    const plan = generatePlan(mk({ raceDate: addDays(TODAY, 12 * 7) }));
    assert.equal(plan.weeks.length, 12);
    const last = plan.weeks[plan.weeks.length - 1]!;
    assert.equal(addDays(last.startDate, 6), plan.input.raceDate);
  });

  test('주차 시작일이 7일 간격으로 이어진다', () => {
    const plan = generatePlan(mk({ raceDate: addDays(TODAY, 15 * 7) }));
    for (let i = 1; i < plan.weeks.length; i++) {
      assert.equal(addDays(plan.weeks[i - 1]!.startDate, 7), plan.weeks[i]!.startDate);
    }
  });

  test('롱런 다음 날에는 세션이 없다', () => {
    for (const days of DAYS) {
      const plan = generatePlan(mk({ daysPerWeek: days, raceDate: addDays(TODAY, 16 * 7) }));
      const dates = new Set(plan.weeks.flatMap((w) => w.sessions.map((s) => s.date)));
      for (const w of plan.weeks) {
        for (const s of w.sessions) {
          if (s.type !== 'long') continue;
          assert.ok(!dates.has(addDays(s.date, 1)), `days=${days} ${s.date} 다음 날에 세션이 있다`);
        }
      }
    }
  });

  test('엔진 버전이 플랜에 박힌다 (§9.7 저장 플랜 고정 렌더링)', () => {
    assert.match(generatePlan(mk()).engineVersion, /^\d+\.\d+\.\d+$/);
  });
});
