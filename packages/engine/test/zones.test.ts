import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  E_CENTER,
  INTENSITY,
  PACE_DISPLAY_TOLERANCE_SEC,
  ZONE_KEYS,
  ZONE_WEEKLY_SHARE_CAP,
  paceTable,
  visibleZones,
} from '../src/zones.ts';
import { VDOT_MAX, VDOT_MIN, predictRaceTimeSec } from '../src/daniels.ts';
import { RACE_DISTANCE_M } from '../src/units.ts';

const SWEEP: number[] = [];
for (let v = VDOT_MIN; v <= VDOT_MAX; v += 0.5) SWEEP.push(v);

describe('페이스표', () => {
  test('전 VDOT 구간에서 존 순서가 E > M > T > I > R 로 느린→빠른 이다', () => {
    for (const v of SWEEP) {
      const t = paceTable(v);
      assert.ok(t.E.fastSecPerKm > t.M.secPerKm, `vdot=${v} E빠른끝(${t.E.fastSecPerKm}) <= M(${t.M.secPerKm})`);
      assert.ok(t.M.secPerKm > t.T.secPerKm, `vdot=${v}`);
      assert.ok(t.T.secPerKm > t.I.secPerKm, `vdot=${v}`);
      assert.ok(t.I.secPerKm > t.R.secPerKm, `vdot=${v}`);
    }
  });

  test('E존은 밴드이고 fast < slow 다', () => {
    for (const v of SWEEP) {
      const e = paceTable(v).E;
      assert.ok(e.fastSecPerKm < e.slowSecPerKm, `vdot=${v}`);
      assert.ok(e.slowSecPerKm - e.fastSecPerKm > 10, `vdot=${v} 밴드가 너무 좁다`);
    }
  });

  test('모든 존이 단일 숫자가 아니라 범위를 제공한다 (§7.8 정직성 원칙)', () => {
    for (const v of SWEEP) {
      const t = paceTable(v);
      for (const k of ZONE_KEYS) {
        assert.ok(t[k].slowSecPerKm > t[k].fastSecPerKm, `vdot=${v} zone=${k}`);
        assert.match(t[k].display, /^\d+:\d{2}~\d+:\d{2}$/);
      }
    }
  });

  test('E 외 존의 표시 폭은 ±3초/km 다', () => {
    const t = paceTable(50);
    for (const k of ['M', 'T', 'I', 'R'] as const) {
      const width = t[k].slowSecPerKm - t[k].fastSecPerKm;
      assert.ok(Math.abs(width - PACE_DISPLAY_TOLERANCE_SEC * 2) < 0.2, `zone=${k} width=${width}`);
    }
  });

  test('VDOT가 오르면 모든 존이 빨라진다', () => {
    for (let i = 0; i + 1 < SWEEP.length; i++) {
      const a = paceTable(SWEEP[i]!);
      const b = paceTable(SWEEP[i + 1]!);
      for (const k of ZONE_KEYS) {
        assert.ok(b[k].secPerKm < a[k].secPerKm, `vdot=${SWEEP[i]} zone=${k}`);
      }
    }
  });

  test('M존 페이스가 마라톤 예상 기록과 일치한다', () => {
    for (const v of [30, 40, 50, 60, 70]) {
      const expected = predictRaceTimeSec(v, RACE_DISTANCE_M.FULL) / (RACE_DISTANCE_M.FULL / 1000);
      assert.ok(Math.abs(paceTable(v).M.secPerKm - expected) < 0.15, `vdot=${v}`);
    }
  });

  test('결정론 — 같은 VDOT면 표가 완전히 같다', () => {
    assert.deepEqual(paceTable(48.7), paceTable(48.7));
  });

  test('R존 400m 환산이 페이스와 정합한다', () => {
    const t = paceTable(50);
    assert.ok(Math.abs(t.R.per400mSec - (t.R.secPerKm * 400) / 1000) < 0.1);
  });
});

describe('강도 계수 계약', () => {
  test('계수 순서가 E_SLOW < E_FAST < T < I < R 이다', () => {
    assert.ok(INTENSITY.E_SLOW < INTENSITY.E_FAST);
    assert.ok(INTENSITY.E_FAST < INTENSITY.T);
    assert.ok(INTENSITY.T < INTENSITY.I);
    assert.ok(INTENSITY.I < INTENSITY.R);
    assert.equal(E_CENTER, (INTENSITY.E_SLOW + INTENSITY.E_FAST) / 2);
  });

  test('주간 거리 상한이 PRD §7.6 값과 같다', () => {
    assert.deepEqual(ZONE_WEEKLY_SHARE_CAP, { M: 0.2, T: 0.1, I: 0.08, R: 0.05 });
  });
});

describe('노출 존', () => {
  test('입문자에게는 E·M 두 개만 보여준다 (§7.8)', () => {
    assert.deepEqual(visibleZones('novice'), ['E', 'M']);
    assert.deepEqual(visibleZones('full'), ZONE_KEYS);
  });
});
