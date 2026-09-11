import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, type PlanInput, type RaceDistanceM } from '@runback/engine';
import {
  guideTermsIn,
  planGuide,
  planLevel,
  sessionGuide,
  showsGuide,
} from '../src/lib/session-guide.ts';

/**
 * 세션 수행 가이드 (입문자 §2 P1).
 *
 * 여기서 지키는 것은 문장의 품질이 아니라 **연결**이다.
 * 가이드는 엔진이 내는 두 가지에 붙어 있다 — `session.type` 과 `session.structure`.
 * 엔진이 세션 타입을 늘리거나 structure 문구를 바꾸면 가이드가 **조용히** 비어 버리는데,
 * 화면에는 그냥 설명이 안 보일 뿐이라 아무도 모른다. 그 자리를 고정한다.
 */

const distances: RaceDistanceM[] = [5000, 10000, 21097.5, 42195];

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    raceDate: '2026-12-06',
    raceDistanceM: 10000,
    today: '2026-09-11',
    fitness: { kind: 'novice', canRunMin: 20 },
    goal: { kind: 'finish' },
    daysPerWeek: 3,
    ...over,
  };
}

/**
 * 입문자 플랜 전수 스윕 — 실력 3종 × 거리 4종 × 훈련일수 4종 × 기간 5종.
 *
 * ⚠️ **좁게 잡으면 이 테스트가 거짓으로 통과한다.** 처음에는 `canRunMin` 20 하나에
 * 기간 3종이었는데, 그러면 '크루즈 인터벌'이 한 번도 안 나와서 사전에 죽은 항목이
 * 있다고 잘못 판정했다. 실제로는 주 5~6일 장기 플랜에서 입문자에게도 나온다.
 * 세션 구성은 주간 거리에서 갈리므로 **거리를 키우는 축(훈련일수·기간)을 넓게** 잡는다.
 */
function sweep(): ReturnType<typeof generatePlan>[] {
  const plans: ReturnType<typeof generatePlan>[] = [];
  for (const canRunMin of [10, 25, 40]) {
    for (const raceDistanceM of distances) {
      for (const daysPerWeek of [3, 4, 5, 6] as const) {
        for (const weeks of [8, 16, 24, 32, 40]) {
          const raceDate = new Date(Date.UTC(2026, 8, 11) + weeks * 7 * 86_400_000)
            .toISOString()
            .slice(0, 10);
          plans.push(
            generatePlan(input({ raceDistanceM, daysPerWeek, raceDate, fitness: { kind: 'novice', canRunMin } })),
          );
        }
      }
    }
  }
  return plans;
}

describe('세션 가이드 — 엔진과의 연결', () => {
  test('플랜에 나오는 모든 세션 타입에 가이드가 있다', () => {
    const missing = new Set<string>();
    for (const plan of sweep()) {
      for (const week of plan.weeks) {
        for (const s of week.sessions) {
          // 대회 당일은 훈련 지시가 필요한 날이 아니라 일부러 비워 뒀다
          if (s.type === 'race') continue;
          if (!sessionGuide(s.type)) missing.add(s.type);
        }
      }
    }
    assert.deepEqual([...missing], [], `가이드 없는 세션 타입: ${[...missing].join(', ')}`);
  });

  test('structure 에 쓰인 훈련 용어가 전부 사전에 있다', () => {
    /*
     * 엔진이 structure 에 쓰는 말 (`packages/engine/src/sessions.ts`).
     * 여기 있는 단어가 화면에 뜨는데 사전에 없으면 입문자는 읽고도 모른다 —
     * §7.8 이 존을 E·M 으로 접어 놓고 정작 '스트라이드'를 통과시키던 그 구멍이다.
     */
    const vocabulary = ['스트라이드', '워밍업', '쿨다운', '크루즈 인터벌', '회복'];
    const seen = new Set<string>();

    for (const plan of sweep()) {
      for (const week of plan.weeks) {
        for (const s of week.sessions) {
          if (!s.structure) continue;
          for (const word of vocabulary) {
            if (!s.structure.includes(word)) continue;
            seen.add(word);
            const terms = guideTermsIn(s.structure);
            assert.ok(
              terms.some((t) => t.match === word),
              `'${word}' 가 structure 에 있는데 사전이 못 잡았다: ${s.structure}`,
            );
          }
        }
      }
    }

    // 사전에만 있고 엔진은 더 이상 안 쓰는 용어가 생기면 그것도 어긋남이다
    assert.deepEqual(
      [...seen].sort(),
      [...vocabulary].sort(),
      '엔진이 더 이상 쓰지 않는 용어가 사전에 남아 있다',
    );
  });

  test('structure 가 없으면 용어도 없다', () => {
    assert.deepEqual(guideTermsIn(undefined), []);
    assert.deepEqual(guideTermsIn('7.2km'), []);
  });
});

describe('planGuide — 플랜에 실제로 있는 것만', () => {
  test('플랜에 없는 세션 타입은 넣지 않는다', () => {
    for (const plan of sweep()) {
      const present = new Set(plan.weeks.flatMap((w) => w.sessions).map((s) => s.type));
      for (const { type } of planGuide(plan.weeks).sessions) {
        assert.ok(present.has(type), `${type} 은 이 플랜에 없는데 가이드에 있다`);
      }
    }
  });

  test('휴식은 빼고, 나머지 타입은 빠짐없이 넣는다', () => {
    for (const plan of sweep()) {
      const { sessions } = planGuide(plan.weeks);
      assert.ok(!sessions.some((s) => s.type === 'rest'));

      const present = new Set(plan.weeks.flatMap((w) => w.sessions).map((s) => s.type));
      present.delete('rest');
      present.delete('race');
      const covered = new Set(sessions.map((s) => s.type));
      for (const type of present) {
        assert.ok(covered.has(type), `${type} 이 플랜에 있는데 가이드에서 빠졌다`);
      }
    }
  });

  test('순서가 주차 구성과 무관하게 일정하다', () => {
    // 등장 순서로 뽑으면 같은 종류 구성인데 플랜마다 순서가 달라진다
    const byTypes = new Map<string, string>();
    for (const plan of sweep()) {
      const { sessions } = planGuide(plan.weeks);
      const key = [...sessions.map((s) => s.type)].sort().join(',');
      const order = sessions.map((s) => s.type).join(',');
      const seen = byTypes.get(key);
      if (seen === undefined) byTypes.set(key, order);
      else assert.equal(order, seen, '같은 구성인데 순서가 다르다');
    }
  });

  test('세션이 하나도 없으면 빈 결과 — 화면은 이걸로 통째로 감춘다', () => {
    assert.deepEqual(planGuide([]), { sessions: [], terms: [] });
  });
});

describe('노출 기준은 §7.8 페이스표와 같은 한 줄', () => {
  test('입문자 입력만 가이드를 본다', () => {
    assert.equal(planLevel(generatePlan(input())), 'novice');
    assert.equal(
      planLevel(generatePlan(input({ fitness: { kind: 'feel', easyPaceSecPerKm: 380, weeklyKm: 40 } }))),
      'full',
    );
    assert.equal(
      planLevel(generatePlan(input({ fitness: { kind: 'race', distanceM: 10000, timeSec: 2700 } }))),
      'full',
    );
  });

  test('showsGuide 는 novice 에서만 참', () => {
    assert.equal(showsGuide('novice'), true);
    assert.equal(showsGuide('full'), false);
  });
});

describe('문장 규칙 — 이 파일의 계약 (§0-3, §7.10)', () => {
  /** 화면에 나가는 모든 문장 */
  function allCopy(): string[] {
    const out: string[] = [];
    for (const plan of sweep()) {
      const { sessions, terms } = planGuide(plan.weeks);
      for (const { guide } of sessions) out.push(guide.how, guide.check);
      for (const t of terms) out.push(t.desc);
    }
    return [...new Set(out)];
  }

  test('숫자를 쓰지 않는다 — 숫자는 전부 엔진이 낸다', () => {
    /*
     * 여기에 '20분 정도'가 들어가면 엔진이 낸 값과 어긋나고,
     * 어긋나면 사용자는 어느 쪽을 믿어야 할지 알 수 없다.
     */
    for (const line of allCopy()) {
      assert.ok(!/\d/.test(line), `가이드 문장에 숫자가 있다: ${line}`);
    }
  });

  test('의학적 조언을 하지 않는다 (§7.10)', () => {
    // 통증·부상은 화면 하단 고정 고지가 맡는다. 여기서 다루면 책임이 생긴다
    const banned = ['통증', '부상', '병원', '치료', '보충제', '약'];
    for (const line of allCopy()) {
      for (const word of banned) {
        assert.ok(!line.includes(word), `가이드가 다루면 안 되는 말을 한다 ('${word}'): ${line}`);
      }
    }
  });

  test('겁주지 않는다 — 단정·위협 표현 금지', () => {
    const banned = ['반드시', '절대', '위험합니다', '안 됩니다'];
    for (const line of allCopy()) {
      for (const word of banned) {
        assert.ok(!line.includes(word), `문장이 겁을 준다 ('${word}'): ${line}`);
      }
    }
  });

  test('여덟 타입이 서로 다른 말을 한다', () => {
    const hows = Object.values(planGuide(generatePlan(input()).weeks).sessions).map(
      (s) => s.guide.how,
    );
    assert.equal(new Set(hows).size, hows.length, '가이드 문장이 겹친다');
  });
});
