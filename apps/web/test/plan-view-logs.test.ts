import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '@runback/engine';
import {
  isCompleted,
  monthGrid,
  monthSummary,
  recentRuns,
  sessionProgress,
  weekItems,
  type LogIndex,
} from '../src/lib/plan-view.ts';

/**
 * F-12 수행 체크의 판정 규칙.
 *
 * 브라우저로는 '오늘'을 옮길 수 없어서 '놓침(missed)'을 눌러 볼 수가 없다.
 * 그 경계가 이 제품에서 중요한 자리라 — 진행률이 거짓말을 하느냐 마느냐가 걸려 있다 —
 * 날짜를 인자로 받는 순수 함수로 고정해 둔다.
 */

const plan = generatePlan({
  raceDate: '2026-11-15',
  raceDistanceM: 21097.5,
  today: '2026-09-07',
  fitness: { kind: 'race', distanceM: 10000, timeSec: 50 * 60 },
  goal: { kind: 'time', targetSec: 115 * 60 },
  daysPerWeek: 4,
  currentWeeklyKm: 30,
});

const sessions = plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type !== 'race');
const first = sessions[0]!;
const second = sessions[1]!;

const logsOf = (entries: Array<[string, 'done' | 'skipped' | 'modified']>): LogIndex =>
  new Map(entries.map(([date, status]) => [date, { status }]));

describe('완료 판정 (F-12)', () => {
  test('기록이 없으면 완료가 아니다 — 날짜가 지났어도', () => {
    assert.equal(isCompleted(undefined), false);
  });

  test('modified 는 완료로 친다 — 계획을 바꿔서라도 뛴 것은 뛴 것이다', () => {
    assert.equal(isCompleted({ status: 'modified' }), true);
  });

  test('skipped 만 완료가 아니다', () => {
    assert.equal(isCompleted({ status: 'skipped' }), false);
    assert.equal(isCompleted({ status: 'done' }), true);
  });
});

describe('진행률은 날짜가 아니라 기록으로 센다 (O17)', () => {
  test('기록이 하나도 없으면 0 — 플랜이 다 지나갔더라도', () => {
    const p = sessionProgress(plan, new Map());
    assert.equal(p.done, 0);
    assert.equal(p.ratio, 0);
    assert.ok(p.total > 0);
  });

  test('완료한 만큼만 올라간다', () => {
    const p = sessionProgress(plan, logsOf([[first.date, 'done']]));
    assert.equal(p.done, 1);
  });

  test('건너뛴 세션은 진행률에 들어가지 않는다', () => {
    const p = sessionProgress(plan, logsOf([[first.date, 'skipped']]));
    assert.equal(p.done, 0);
  });
});

describe("'놓침'과 '건너뜀'을 구분한다", () => {
  const week = plan.weeks[0]!;
  // 그 주가 전부 지난 뒤로 오늘을 옮긴다
  const afterWeek = '2026-12-31';

  test('지난 날짜에 기록이 없으면 missed — 완료가 아니다', () => {
    const items = weekItems(week, afterWeek, new Map());
    const statuses = items.filter((i) => i.status !== 'rest').map((i) => i.status);
    assert.ok(statuses.length > 0);
    assert.ok(statuses.every((s) => s === 'missed'), `expected all missed, got ${statuses}`);
  });

  test('사용자가 남긴 skipped 는 missed 와 다르게 표시된다', () => {
    const items = weekItems(week, afterWeek, logsOf([[first.date, 'skipped']]));
    const item = items.find((i) => i.date === first.date)!;
    assert.equal(item.status, 'skipped');
  });

  test('아직 오지 않은 날은 todo', () => {
    const items = weekItems(week, '2026-01-01', new Map());
    const statuses = items.filter((i) => i.status !== 'rest').map((i) => i.status);
    assert.ok(statuses.every((s) => s === 'todo'));
  });
});

describe('캘린더도 같은 규칙을 쓴다', () => {
  const month = first.date.slice(0, 7);

  test('지난 날짜에 기록이 없으면 missed', () => {
    const cell = monthGrid(plan, month, '2026-12-31', new Map()).find((c) => c.date === first.date)!;
    assert.equal(cell.status, 'missed');
  });

  test('기록이 있으면 done — 미래 날짜여도', () => {
    const logs = logsOf([[first.date, 'done']]);
    const cell = monthGrid(plan, month, '2026-01-01', logs).find((c) => c.date === first.date)!;
    assert.equal(cell.status, 'done');
  });

  test('월 요약의 완료 거리도 기록 기준이다', () => {
    const empty = monthSummary(plan, month, new Map());
    assert.equal(empty.doneCount, 0);
    assert.equal(empty.doneKm, 0);

    const one = monthSummary(plan, month, logsOf([[first.date, 'done']]));
    assert.equal(one.doneCount, 1);
    assert.equal(one.doneKm, first.distanceKm);
  });
});

describe('최근 러닝은 지어내지 않는다 (§0-3)', () => {
  test('기록이 없으면 빈 목록', () => {
    assert.deepEqual(recentRuns(plan, new Map()), []);
  });

  test('기록을 남긴 세션만, 최신 순으로', () => {
    const runs = recentRuns(plan, logsOf([[first.date, 'done'], [second.date, 'skipped']]));
    assert.equal(runs.length, 2);
    assert.equal(runs[0]!.date, second.date, '최신이 앞');
    assert.equal(runs[1]!.status, 'done');
  });

  test('플랜에 없는 날짜의 기록은 무시한다', () => {
    const runs = recentRuns(plan, logsOf([['1999-01-01', 'done']]));
    assert.deepEqual(runs, []);
  });
});
