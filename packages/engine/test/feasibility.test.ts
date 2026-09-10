import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessEndurance,
  assessFeasibility,
  finishWeeklyKmFor,
  minWeeksFor,
  SAFE_RATIO,
  UNREALISTIC_MARGIN,
} from '../src/feasibility.ts';
import { predictRaceTimeSec } from '../src/daniels.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';

const HALF = RACE_DISTANCE_M.HALF;
const FULL = RACE_DISTANCE_M.FULL;

/**
 * 지구력 게이트(§7.3)가 개입하지 않을 만큼 넉넉한 주간 거리.
 * 판정 3단계 자체를 보는 테스트는 이 값을 써서 gap/capacity 축만 남긴다.
 */
const AMPLE_KM = 80;

describe('최소 권장 주차 게이트 (§7.3)', () => {
  test('거리별 권장 주차가 PRD 표와 같다', () => {
    assert.equal(minWeeksFor(RACE_DISTANCE_M['5K']), 6);
    assert.equal(minWeeksFor(RACE_DISTANCE_M['10K']), 8);
    assert.equal(minWeeksFor(HALF), 10);
    assert.equal(minWeeksFor(FULL), 12);
  });

  test('풀코스는 기간 미달 시 기록 목표를 차단하고 완주로 전환한다', () => {
    const r = assessFeasibility({ weeklyKm: AMPLE_KM,
      vdot: 45,
      raceDistanceM: FULL,
      goal: { kind: 'time', targetSec: 3 * 3600 + 30 * 60 },
      weeksAvailable: 8,
      daysPerWeek: 4,
    });
    assert.equal(r.timeGoalBlocked, true);
    assert.equal(r.effectiveGoal.kind, 'finish');
    assert.ok(r.reasons.some((x) => x.includes('완주')));
  });

  test('하프는 기간 미달이어도 기록 목표를 막지 않고 한 단계만 내린다', () => {
    const easy = { vdot: 50, raceDistanceM: HALF, daysPerWeek: 4 as const };
    const target = predictRaceTimeSec(50, HALF); // 지금 실력 그대로 = gap 0
    const enough = assessFeasibility({ weeklyKm: AMPLE_KM, ...easy, goal: { kind: 'time', targetSec: target }, weeksAvailable: 14 });
    const short = assessFeasibility({ weeklyKm: AMPLE_KM, ...easy, goal: { kind: 'time', targetSec: target }, weeksAvailable: 6 });
    assert.equal(enough.verdict, 'safe');
    assert.equal(short.verdict, 'challenging');
    assert.equal(short.timeGoalBlocked, false);
  });
});

describe('3단계 판정 (§7.3)', () => {
  const base = { vdot: 45, raceDistanceM: HALF, weeksAvailable: 14, daysPerWeek: 4 as const };

  function verdictForGapRatio(ratio: number): string {
    const probe = assessFeasibility({ weeklyKm: AMPLE_KM, ...base, goal: { kind: 'finish' } });
    const targetVdot = base.vdot + probe.capacity * ratio;
    return assessFeasibility({ weeklyKm: AMPLE_KM,
      ...base,
      goal: { kind: 'time', targetSec: predictRaceTimeSec(targetVdot, HALF) },
    }).verdict;
  }

  test('gap 이 capacity 의 60% 이하면 안정권', () => {
    assert.equal(verdictForGapRatio(0), 'safe');
    assert.equal(verdictForGapRatio(SAFE_RATIO - 0.05), 'safe');
  });

  test('capacity 이내면 도전적', () => {
    assert.equal(verdictForGapRatio(SAFE_RATIO + 0.05), 'challenging');
    assert.equal(verdictForGapRatio(0.98), 'challenging');
  });

  test('capacity 를 넘으면 비현실적', () => {
    assert.equal(verdictForGapRatio(1.2), 'unrealistic');
    assert.equal(verdictForGapRatio(3), 'unrealistic');
  });

  test('이미 목표를 넘어선 실력이면 목표를 높이라고 말한다', () => {
    const r = assessFeasibility({ weeklyKm: AMPLE_KM, ...base, goal: { kind: 'time', targetSec: predictRaceTimeSec(40, HALF) } });
    assert.equal(r.verdict, 'safe');
    assert.ok(r.gap < 0);
    assert.ok(r.reasons.some((x) => x.includes('높여도')));
  });
});

describe('대안 제시 — 비현실적일 때도 숫자를 내놓는다', () => {
  test('도전적 대안이 안정권 대안보다 빠르고, 둘 다 현재 실력보다 빠르다', () => {
    const r = assessFeasibility({ weeklyKm: AMPLE_KM,
      vdot: 42,
      raceDistanceM: HALF,
      goal: { kind: 'time', targetSec: 80 * 60 },
      weeksAvailable: 12,
      daysPerWeek: 5,
    });
    assert.equal(r.verdict, 'unrealistic');
    const now = predictRaceTimeSec(42, HALF);
    assert.ok(r.achievableTimeSec < r.comfortableTimeSec);
    assert.ok(r.comfortableTimeSec < now);
    assert.ok(r.achievableTimeSec > 80 * 60, '달성 불가 목표보다는 느려야 한다');
  });

  test('훈련 일수를 늘리면 대안 기록이 빨라진다', () => {
    const mk = (d: 3 | 4 | 5 | 6) =>
      assessFeasibility({ weeklyKm: AMPLE_KM,
        vdot: 45,
        raceDistanceM: HALF,
        goal: { kind: 'finish' },
        weeksAvailable: 12,
        daysPerWeek: d,
      }).achievableTimeSec;
    assert.ok(mk(6) < mk(5) && mk(5) < mk(4) && mk(4) < mk(3));
  });
});

describe('완주 목표', () => {
  test('기간이 충분하고 주간 거리도 되면 안정권', () => {
    const r = assessFeasibility({ weeklyKm: AMPLE_KM, vdot: 35, raceDistanceM: HALF, goal: { kind: 'finish' }, weeksAvailable: 12, daysPerWeek: 4 });
    assert.equal(r.verdict, 'safe');
    assert.equal(r.requiredVdot, null);
    assert.equal(r.gap, 0);
  });

  /*
   * 예전에는 `weeksAvailable >= minWeeks * 0.6` 이라는 **달력 규칙 하나로** 판정했다.
   * 실력을 전혀 보지 않아서 주 80km 를 뛰는 사람과 주 10km 를 뛰는 사람이 똑같이
   * '비현실적' 이 됐다. 아래 두 테스트가 그 회귀를 막는다.
   */
  test('기간이 짧아도 이미 그 거리를 뛰고 있으면 비현실적이 아니다', () => {
    const r = assessFeasibility({
      weeklyKm: AMPLE_KM,
      vdot: 35,
      raceDistanceM: FULL,
      goal: { kind: 'finish' },
      weeksAvailable: 5,
      daysPerWeek: 4,
    });
    assert.notEqual(r.verdict, 'unrealistic');
  });

  test('주간 거리가 완주에 한참 못 미치면 비현실적이다', () => {
    const r = assessFeasibility({
      weeklyKm: 8,
      vdot: 35,
      raceDistanceM: FULL,
      goal: { kind: 'finish' },
      weeksAvailable: 5,
      daysPerWeek: 4,
    });
    assert.equal(r.verdict, 'unrealistic');
    assert.ok(r.reasons.some((x) => x.includes('다음 대회')));
  });

  test('같은 사람이 더 쉬운 목표를 골랐는데 판정이 나빠지지 않는다', () => {
    const base = {
      weeklyKm: 35,
      vdot: 45,
      raceDistanceM: HALF,
      weeksAvailable: 5,
      daysPerWeek: 4 as const,
    };
    const rank = { safe: 0, challenging: 1, unrealistic: 2 };
    // 지금 실력으로도 닿는 기록 목표
    const timed = assessFeasibility({ ...base, goal: { kind: 'time', targetSec: predictRaceTimeSec(43, HALF) } });
    const finish = assessFeasibility({ ...base, goal: { kind: 'finish' } });
    assert.ok(
      rank[finish.verdict] <= rank[timed.verdict],
      `완주(${finish.verdict}) 가 기록 목표(${timed.verdict}) 보다 나쁘면 안 된다`,
    );
  });
});

describe('비현실적 경계의 완충 (§7.3)', () => {
  const base = { weeklyKm: AMPLE_KM, vdot: 45, raceDistanceM: HALF, weeksAvailable: 14, daysPerWeek: 4 as const };

  function verdictAt(ratio: number): string {
    const probe = assessFeasibility({ ...base, goal: { kind: 'finish' } });
    const targetVdot = base.vdot + probe.capacity * ratio;
    return assessFeasibility({ ...base, goal: { kind: 'time', targetSec: predictRaceTimeSec(targetVdot, HALF) } })
      .verdict;
  }

  /*
   * capacity 는 "가설"인 향상률 모델에서 나오고 안전계수 0.5 가 이미 곱해진 값이다.
   * 그 추정치를 몇 초 넘겼다고 '불가능'이라 선언하면 모델보다 판정이 더 단정적이게 된다.
   */
  test('capacity 를 살짝 넘는 목표는 비현실적이 아니라 도전적이다', () => {
    assert.equal(verdictAt(1.05), 'challenging');
    assert.equal(verdictAt(UNREALISTIC_MARGIN - 0.02), 'challenging');
  });

  test('완충을 넘어서면 비현실적이다', () => {
    assert.equal(verdictAt(UNREALISTIC_MARGIN + 0.05), 'unrealistic');
    assert.equal(verdictAt(2), 'unrealistic');
  });
});

describe('지구력 게이트 (§7.3)', () => {
  test('거리별 필요 주간 거리가 PRD 표와 같다', () => {
    assert.equal(finishWeeklyKmFor(RACE_DISTANCE_M['5K']), 15);
    assert.equal(finishWeeklyKmFor(RACE_DISTANCE_M['10K']), 20);
    assert.equal(finishWeeklyKmFor(HALF), 30);
    assert.equal(finishWeeklyKmFor(FULL), 45);
  });

  test('주간 거리가 많을수록, 기간이 길수록 준비도가 오른다', () => {
    const at = (km: number, weeks: number): number =>
      assessEndurance({ weeklyKm: km, raceDistanceM: HALF, weeksAvailable: weeks, daysPerWeek: 4 }).ratio;
    assert.ok(at(30, 8) > at(20, 8));
    assert.ok(at(20, 12) > at(20, 4));
  });

  test('보수적 추정이면 늘어날 여지를 덜 인정한다', () => {
    const normal = assessEndurance({ weeklyKm: 20, raceDistanceM: HALF, weeksAvailable: 10, daysPerWeek: 4 });
    const careful = assessEndurance({
      weeklyKm: 20,
      raceDistanceM: HALF,
      weeksAvailable: 10,
      daysPerWeek: 4,
      conservative: true,
    });
    assert.ok(careful.ratio < normal.ratio);
  });

  test('속도가 빨라도 주간 거리가 없으면 기록 목표가 안정권이 될 수 없다', () => {
    const r = assessFeasibility({
      weeklyKm: 10,
      vdot: 55,
      raceDistanceM: FULL,
      goal: { kind: 'time', targetSec: predictRaceTimeSec(40, FULL) },
      weeksAvailable: 20,
      daysPerWeek: 5,
    });
    assert.notEqual(r.verdict, 'safe');
  });
});

describe('보수적 추정', () => {
  test('conservative 입력은 capacity 를 줄여 판정을 빡빡하게 만든다', () => {
    const args = {
      vdot: 32,
      raceDistanceM: RACE_DISTANCE_M['10K'],
      goal: { kind: 'time' as const, targetSec: predictRaceTimeSec(34, RACE_DISTANCE_M['10K']) },
      weeksAvailable: 12,
      daysPerWeek: 4 as const,
      weeklyKm: AMPLE_KM,
    };
    const normal = assessFeasibility(args);
    const careful = assessFeasibility({ ...args, conservative: true });
    assert.ok(careful.capacity < normal.capacity);
    assert.ok(careful.reasons.some((x) => x.includes('신뢰도')));
  });
});
