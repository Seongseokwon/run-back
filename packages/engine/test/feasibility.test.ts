import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { assessFeasibility, minWeeksFor, SAFE_RATIO } from '../src/feasibility.ts';
import { predictRaceTimeSec } from '../src/daniels.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';

const HALF = RACE_DISTANCE_M.HALF;
const FULL = RACE_DISTANCE_M.FULL;

describe('최소 권장 주차 게이트 (§7.3)', () => {
  test('거리별 권장 주차가 PRD 표와 같다', () => {
    assert.equal(minWeeksFor(RACE_DISTANCE_M['5K']), 6);
    assert.equal(minWeeksFor(RACE_DISTANCE_M['10K']), 8);
    assert.equal(minWeeksFor(HALF), 10);
    assert.equal(minWeeksFor(FULL), 12);
  });

  test('풀코스는 기간 미달 시 기록 목표를 차단하고 완주로 전환한다', () => {
    const r = assessFeasibility({
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
    const enough = assessFeasibility({ ...easy, goal: { kind: 'time', targetSec: target }, weeksAvailable: 14 });
    const short = assessFeasibility({ ...easy, goal: { kind: 'time', targetSec: target }, weeksAvailable: 6 });
    assert.equal(enough.verdict, 'safe');
    assert.equal(short.verdict, 'challenging');
    assert.equal(short.timeGoalBlocked, false);
  });
});

describe('3단계 판정 (§7.3)', () => {
  const base = { vdot: 45, raceDistanceM: HALF, weeksAvailable: 14, daysPerWeek: 4 as const };

  function verdictForGapRatio(ratio: number): string {
    const probe = assessFeasibility({ ...base, goal: { kind: 'finish' } });
    const targetVdot = base.vdot + probe.capacity * ratio;
    return assessFeasibility({
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
    const r = assessFeasibility({ ...base, goal: { kind: 'time', targetSec: predictRaceTimeSec(40, HALF) } });
    assert.equal(r.verdict, 'safe');
    assert.ok(r.gap < 0);
    assert.ok(r.reasons.some((x) => x.includes('높여도')));
  });
});

describe('대안 제시 — 비현실적일 때도 숫자를 내놓는다', () => {
  test('도전적 대안이 안정권 대안보다 빠르고, 둘 다 현재 실력보다 빠르다', () => {
    const r = assessFeasibility({
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
      assessFeasibility({
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
  test('기간이 충분하면 안정권', () => {
    const r = assessFeasibility({ vdot: 35, raceDistanceM: HALF, goal: { kind: 'finish' }, weeksAvailable: 12, daysPerWeek: 4 });
    assert.equal(r.verdict, 'safe');
    assert.equal(r.requiredVdot, null);
    assert.equal(r.gap, 0);
  });

  test('최소 권장 주차의 60% 미만이면 비현실적이라고 말한다', () => {
    const r = assessFeasibility({ vdot: 35, raceDistanceM: FULL, goal: { kind: 'finish' }, weeksAvailable: 5, daysPerWeek: 4 });
    assert.equal(r.verdict, 'unrealistic');
    assert.ok(r.reasons.some((x) => x.includes('다음 대회')));
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
    };
    const normal = assessFeasibility(args);
    const careful = assessFeasibility({ ...args, conservative: true });
    assert.ok(careful.capacity < normal.capacity);
    assert.ok(careful.reasons.some((x) => x.includes('신뢰도')));
  });
});
