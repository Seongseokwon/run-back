import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decodePlanRequest, encodePlanRequest, type PlanRequest } from '../src/lib/plan-url.ts';
import { maskClock, parseClock } from '../src/lib/time-input.ts';

const BASE: PlanRequest = {
  input: {
    raceDate: '2026-11-15',
    raceDistanceM: 21097.5,
    today: '2026-09-08',
    fitness: { kind: 'race', distanceM: 10000, timeSec: 3000 },
    goal: { kind: 'time', targetSec: 6900 },
    daysPerWeek: 4,
    currentWeeklyKm: 30,
  },
  raceSlug: 'mbn-seoul-marathon-2026',
};

describe('플랜 URL 인코딩 (F-08)', () => {
  test('왕복하면 그대로 돌아온다', () => {
    assert.deepEqual(decodePlanRequest(encodePlanRequest(BASE)), BASE);
  });

  test('fitness 3경로 · goal 2종 전부 왕복한다', () => {
    const fits = [
      { kind: 'race', distanceM: 5000, timeSec: 1500 },
      { kind: 'feel', easyPaceSecPerKm: 390, weeklyKm: 25.5 },
      { kind: 'novice', canRunMin: 20 },
    ] as const;
    const goals = [{ kind: 'time', targetSec: 12600 }, { kind: 'finish' }] as const;
    for (const fitness of fits) {
      for (const goal of goals) {
        const req: PlanRequest = { input: { ...BASE.input, fitness, goal } };
        assert.deepEqual(decodePlanRequest(encodePlanRequest(req)), req, JSON.stringify({ fitness, goal }));
      }
    }
  });

  test('URL 은 안전한 문자만 쓴다', () => {
    assert.match(encodePlanRequest(BASE), /^[A-Za-z0-9_-]+$/);
  });

  test('손상된 입력은 전부 거부한다', () => {
    for (const bad of ['', 'not-base64!!', 'YWJj', btoa('{"d":1}'), undefined]) {
      assert.equal(decodePlanRequest(bad as string | undefined), null, String(bad));
    }
  });

  test('범위를 벗어난 값을 거부한다', () => {
    const tamper = (patch: Record<string, unknown>): string => {
      const packed = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(encodePlanRequest(BASE).replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0)),
        ),
      ) as Record<string, unknown>;
      const merged = JSON.stringify({ ...packed, ...patch });
      let binary = '';
      for (const b of new TextEncoder().encode(merged)) binary += String.fromCharCode(b);
      return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    };

    assert.equal(decodePlanRequest(tamper({ m: 12345 })), null, '표준 거리가 아닌 종목');
    assert.equal(decodePlanRequest(tamper({ w: 9 })), null, '주 9일');
    assert.equal(decodePlanRequest(tamper({ d: '2026-13-40' })), null, '없는 날짜');
    assert.equal(decodePlanRequest(tamper({ d: '2026-01-01' })), null, '대회일이 오늘보다 앞섬');
    assert.equal(decodePlanRequest(tamper({ g: [0, 5] })), null, '5초 목표');
    assert.equal(decodePlanRequest(tamper({ r: '../etc/passwd' })), null, '이상한 slug');
  });
});

describe('시간 입력 파싱', () => {
  test('여러 표기를 받아 준다', () => {
    assert.equal(parseClock('50:00'), 3000);
    assert.equal(parseClock('1:55:00'), 6900);
    assert.equal(parseClock('5000'), 3000);
    assert.equal(parseClock('11500'), 4500);
    assert.equal(parseClock(' 6:30 '), 390);
  });

  test('말이 안 되는 입력은 거부한다', () => {
    for (const bad of ['', 'abc', '1:99', '99:99:99', '1:2:3:4', '9']) {
      assert.equal(parseClock(bad), null, bad);
    }
  });

  test('마스킹이 콜론을 끼워 넣는다', () => {
    assert.equal(maskClock('5000', false), '50:00');
    assert.equal(maskClock('11500', true), '1:15:00');
    assert.equal(maskClock('6', false), '6');
    assert.equal(maskClock('abc630', false), '6:30');
  });
});
