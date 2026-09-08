import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPace } from '@raceback/engine';
import { GOALS, findGoal } from '../src/lib/goals.ts';

describe('목표별 SEO 페이지 데이터', () => {
  test('slug 과 label 이 유일하다', () => {
    assert.equal(new Set(GOALS.map((g) => g.slug)).size, GOALS.length);
    assert.equal(new Set(GOALS.map((g) => g.label)).size, GOALS.length);
  });

  test('slug 이 URL 안전하다', () => {
    for (const g of GOALS) assert.match(g.slug, /^[a-z0-9-]+$/, g.slug);
  });

  /**
   * 본문에 손으로 적은 페이스가 실제 계산값과 어긋나는 걸 막는다.
   * 페이지에는 계산값이 함께 표시되므로, 어긋나면 사용자 눈에 바로 보인다.
   */
  test('본문에 적힌 페이스가 실제 목표 페이스와 일치한다', () => {
    for (const goal of GOALS) {
      const actual = formatPace(goal.targetSec / (goal.distanceM / 1000));
      // '1km당' 에 앵커를 건다. 안 그러면 '3시간 30분' 의 30분을 페이스로 잡는다.
      // '4분 16초' 와 '5분' 두 표기를 모두 받는다
      const stated = goal.lead.match(/1km(?:당|를)\s*(\d+)분(?:\s*(\d+)초)?/);
      assert.ok(stated, `${goal.slug}: lead 에 '1km당 N분 M초' 형태의 페이스 표기가 없다`);
      const min = Number(stated[1]);
      const sec = Number(stated[2] ?? 0);
      assert.equal(`${min}:${String(sec).padStart(2, '0')}`, actual, `${goal.slug} 문구와 계산값 불일치`);
    }
  });

  test('목표 기록이 물리적으로 말이 된다', () => {
    for (const goal of GOALS) {
      const paceSec = goal.targetSec / (goal.distanceM / 1000);
      assert.ok(paceSec > 150 && paceSec < 600, `${goal.slug}: ${paceSec}초/km`);
    }
  });

  test('§13.2 규칙 3 — 목표마다 다른 문단을 쓴다', () => {
    const paragraphs = GOALS.flatMap((g) => [g.lead, ...g.body]);
    assert.equal(new Set(paragraphs).size, paragraphs.length, '중복된 문단이 있다');
    for (const g of GOALS) {
      assert.ok(g.body[0].length > 80 && g.body[1].length > 80, `${g.slug}: 문단이 너무 짧다`);
    }
  });

  test('§13.2 규칙 1 — 조합 페이지가 100개를 넘지 않는다', () => {
    assert.ok(GOALS.length <= 100);
  });

  test('findGoal', () => {
    assert.equal(findGoal('sub4')?.label, '서브4');
    assert.equal(findGoal('없는목표'), undefined);
  });
});
