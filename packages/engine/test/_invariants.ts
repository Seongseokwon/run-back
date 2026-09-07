/**
 * PRD §11.3 엔진 불변식 — 이 파일이 §7.10 안전 규칙의 실행 형태다.
 * 여기 통과하지 못하면 배포하지 않는다.
 */

import assert from 'node:assert/strict';
import { ACWR_CAP } from '../src/periodization.ts';
import {
  HARD_TYPES,
  MINIMAL_ZONE_KM,
  MIN_SESSION_KM,
  SINGLE_RUN_CAP_MIN,
  ZONE_RANK,
  longRunCapKm,
  primaryZoneFor,
} from '../src/sessions.ts';
import { ZONE_WEEKLY_SHARE_CAP, type ZoneKey } from '../src/zones.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';
import { daysBetween } from '../src/dates.ts';
import type { Plan } from '../src/plan.ts';

const EPS = 1e-6;

export function assertPlanInvariants(plan: Plan, label: string): void {
  const tag = (s: string): string => `${label} — ${s}`;

  // 1. 모든 주차의 ACWR ≤ 1.30
  for (const w of plan.weeks) {
    assert.ok(w.acwr <= ACWR_CAP + 0.005, tag(`주차 ${w.index} ACWR ${w.acwr} > ${ACWR_CAP}`));
    assert.ok(Number.isFinite(w.totalKm) && w.totalKm > 0, tag(`주차 ${w.index} 거리 ${w.totalKm}`));
  }

  // 2~3. 존별 주간 거리 상한 — 대회 자체는 훈련이 아니므로 제외한다
  for (const w of plan.weeks) {
    const byZone = new Map<ZoneKey, number>();
    for (const s of w.sessions) {
      if (s.type === 'race') continue;
      byZone.set(s.targetZone, (byZone.get(s.targetZone) ?? 0) + s.zoneKm);
    }
    for (const [zone, cap] of Object.entries(ZONE_WEEKLY_SHARE_CAP) as [Exclude<ZoneKey, 'E'>, number][]) {
      const km = byZone.get(zone) ?? 0;
      const share = km / w.totalKm;
      assert.ok(
        share <= cap + 0.001,
        tag(`주차 ${w.index} ${zone}존 ${km.toFixed(2)}km = ${(share * 100).toFixed(1)}% > ${cap * 100}%`),
      );
    }
  }

  // 4. 고강도(T/I/R) 세션 사이 최소 이틀
  const hard = plan.weeks
    .flatMap((w) => w.sessions)
    .filter((s) => HARD_TYPES.has(s.type))
    .map((s) => s.date)
    .sort();
  for (let i = 1; i < hard.length; i++) {
    const gap = daysBetween(hard[i - 1]!, hard[i]!);
    assert.ok(gap >= 2, tag(`고강도 간격 ${gap}일 (${hard[i - 1]} → ${hard[i]})`));
  }

  // 5. 단일 Easy/Long 런 ≤ 2.5시간
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (s.type !== 'easy' && s.type !== 'long') continue;
      assert.ok(
        s.durationMin <= SINGLE_RUN_CAP_MIN + 1,
        tag(`주차 ${w.index} ${s.type} ${s.durationMin}분 > ${SINGLE_RUN_CAP_MIN}분`),
      );
    }
  }

  // 6~7. Long run 상한
  const longCap = longRunCapKm(plan.input.raceDistanceM);
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (s.type !== 'long') continue;
      assert.ok(
        s.distanceKm <= w.totalKm * 0.3 + 0.1,
        tag(`주차 ${w.index} 롱런 ${s.distanceKm}km > 주간 ${w.totalKm}km 의 30%`),
      );
      assert.ok(s.distanceKm <= longCap + EPS, tag(`주차 ${w.index} 롱런 ${s.distanceKm}km > 상한 ${longCap}km`));
      if (plan.input.raceDistanceM >= RACE_DISTANCE_M.FULL) {
        assert.ok(s.distanceKm <= 32 + EPS, tag(`풀코스 롱런 ${s.distanceKm}km > 32km`));
      }
    }
  }

  // 8. 테이퍼 강도가 직전 페이즈보다 낮아지지 않는다
  const prep = plan.weeks.filter((w) => w.phase !== 'taper');
  const taper = plan.weeks.filter((w) => w.phase === 'taper');
  if (prep.length > 0 && taper.length > 0) {
    const lastPhase = prep[prep.length - 1]!.phase as 'base' | 'build' | 'peak';
    const requiredZone = primaryZoneFor(lastPhase);
    const required = ZONE_RANK[requiredZone];
    const taperMax = Math.max(
      ...taper.flatMap((w) => w.sessions.filter((s) => s.type !== 'race').map((s) => ZONE_RANK[s.targetZone])),
    );
    // 예외: 테이퍼 주간 거리가 너무 작아 해당 존의 최소 세션조차 상한 안에 들어가지 않는 경우.
    // (예: 주 5km 러너의 2주짜리 5K 플랜) 이때는 대회 자체가 강도이며 억지로 넣는 게 더 위험하다.
    const budget =
      requiredZone === 'E'
        ? Infinity
        : Math.max(...taper.map((w) => w.totalKm)) * ZONE_WEEKLY_SHARE_CAP[requiredZone as Exclude<ZoneKey, 'E'>];
    const fitsMinimal =
      requiredZone === 'E' || budget >= MINIMAL_ZONE_KM[requiredZone as Exclude<ZoneKey, 'E'>];
    if (fitsMinimal) {
      assert.ok(
        taperMax >= required,
        tag(`테이퍼 최고 강도 rank ${taperMax} < 직전 페이즈 ${lastPhase} rank ${required} (예산 ${budget.toFixed(2)}km)`),
      );
    }
  }

  // 세션 개수와 총량 정합
  for (const w of plan.weeks) {
    assert.equal(w.sessions.length, plan.input.daysPerWeek, tag(`주차 ${w.index} 세션 수`));
    const sum = w.sessions.filter((s) => s.type !== 'race').reduce((a, s) => a + s.distanceKm, 0);
    assert.ok(sum > 0, tag(`주차 ${w.index} 총 거리 0`));
    // 최소 세션 거리 하한 때문에 주간 계획량을 넘길 수 있다 (MIN_SESSION_KM 주석 참조)
    const allowed = Math.max(w.totalKm * 1.4 + 3, plan.input.daysPerWeek * MIN_SESSION_KM);
    assert.ok(sum <= allowed, tag(`주차 ${w.index} 세션 합 ${sum} ≫ 계획 ${w.totalKm} (허용 ${allowed.toFixed(1)})`));
  }

  // 마지막 주는 대회일로 끝난다
  const last = plan.weeks[plan.weeks.length - 1]!;
  const race = last.sessions.find((s) => s.type === 'race');
  assert.ok(race, tag('마지막 주에 대회 세션이 없다'));
  assert.equal(race!.date, plan.input.raceDate, tag('대회 세션 날짜'));
}
