/**
 * 통합 테스트 — 엔진 × 대회 데이터.
 * PRD §16 W3 완료 기준: "실제 대회로 플랜 생성 성공"
 *
 * 엔진은 대회 데이터를 모르고, 대회 데이터는 엔진을 모른다. 그 둘을 붙이는 건
 * 웹앱의 몫이라 여기(루트)에 둔다. 두 패키지 어느 쪽에도 의존성을 만들지 않는다.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '../packages/engine/src/index.ts';
import { races, seoReadyRaces, upcomingRaces, type Race } from '../packages/races/src/index.ts';
import type { PlanInput, RaceDistanceM } from '../packages/engine/src/types.ts';

const TODAY = '2026-09-07';

function inputFor(race: Race, distanceKm: number): PlanInput {
  return {
    raceDate: race.date,
    raceDistanceM: (distanceKm * 1000) as RaceDistanceM,
    today: TODAY,
    fitness: { kind: 'race', distanceM: 10000, timeSec: 50 * 60 },
    goal: { kind: 'finish' },
    daysPerWeek: 4,
    currentWeeklyKm: 30,
  };
}

describe('실제 대회로 플랜을 만든다 (W3 완료 기준)', () => {
  test('전 대회 × 전 종목 조합에서 플랜이 생성된다', () => {
    const standard = [5, 10, 21.0975, 42.195];
    let count = 0;
    for (const race of upcomingRaces(TODAY)) {
      for (const km of race.distances.filter((d) => standard.includes(d))) {
        const plan = generatePlan(inputFor(race, km));
        assert.ok(plan.weeks.length > 0, `${race.slug} ${km}km`);
        assert.equal(plan.weeks[plan.weeks.length - 1]!.sessions.at(-1)!.date, race.date, `${race.slug} ${km}km`);
        count++;
      }
    }
    assert.ok(count > 100, `조합이 ${count}개뿐이다`);
  });

  test('도그푸딩 대상 — MBN 서울마라톤 하프 플랜', () => {
    const race = races.find((r) => r.slug === 'mbn-seoul-marathon-2026');
    assert.ok(race);
    const plan = generatePlan({ ...inputFor(race!, 21.0975), goal: { kind: 'time', targetSec: 115 * 60 } });

    // 2026-09-07 → 2026-11-15 은 9주. 하프 최소 권장 10주에 못 미친다 (§7.3)
    assert.equal(plan.weeks.length, 9);
    assert.equal(plan.feasibility.durationShort, true);
    assert.notEqual(plan.verdict, 'safe');
    assert.ok(plan.feasibility.reasons.some((r) => r.includes('10주')));
  });

  test('개최가 불투명한 대회도 플랜은 만들어진다 — 경고는 데이터가 들고 있다', () => {
    const uncertain = races.filter((r) => r.status === 'uncertain');
    assert.ok(uncertain.length > 0, '테스트 대상이 없다');
    for (const race of uncertain) {
      const plan = generatePlan(inputFor(race, race.distances.includes(42.195) ? 42.195 : 10));
      assert.ok(plan.weeks.length > 0);
      assert.ok(race.statusNote, `${race.slug} 에 경고 문구가 없다`);
    }
  });

  test('SEO 페이지를 만들 대회는 전부 플랜 생성이 가능하다', () => {
    for (const race of seoReadyRaces(TODAY)) {
      for (const km of race.distances.filter((d) => [5, 10, 21.0975, 42.195].includes(d))) {
        assert.ok(generatePlan(inputFor(race, km)).weeks.length > 0, `${race.slug} ${km}km`);
      }
    }
  });
});
