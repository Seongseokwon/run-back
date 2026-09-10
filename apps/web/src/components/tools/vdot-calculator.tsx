'use client';

import { useMemo, useState } from 'react';
import {
  MAX_DISTANCE_M,
  MIN_DISTANCE_M,
  RACE_DISTANCE_M,
  VDOT_MAX,
  VDOT_MIN,
  formatDuration,
  paceTable,
  predictRaceTimeSec,
  vdotFromRace,
} from '@runback/engine';
import { Card, SectionLabel } from '@/components/ui/card';
import { Field, NumberInput, TextInput } from '@/components/ui/field';
import { PaceTable } from '@/components/plan/pace-table';
import { maskClock, parseClock } from '@/lib/time-input';
import { distanceLabel } from '@/lib/format';
import { CUSTOM, DistancePicker, distanceMeters, type DistanceChoice } from './distance-picker';

/**
 * VDOT 계산기 (PRD §13.1 `/tools/vdot`).
 *
 * 숫자는 전부 엔진이 낸다 — 이 파일에 계수가 하나도 없는 것이 요점이다.
 * 엔진은 런타임 의존성이 0인 순수 함수라 브라우저에서 그대로 돈다 (§4.1).
 *
 * 화면이 세 가지를 낸다: **지금 수준(VDOT)** · **다른 거리 예상 기록** · **훈련 존 페이스**.
 * 셋째가 이 도구의 실제 쓸모다. VDOT 숫자 자체로는 훈련에서 할 일이 정해지지 않는다.
 */

const OTHER = Object.keys(RACE_DISTANCE_M) as (keyof typeof RACE_DISTANCE_M)[];

export function VdotCalculator() {
  const [choice, setChoice] = useState<DistanceChoice>('10K');
  const [customKm, setCustomKm] = useState('12');
  const [time, setTime] = useState('50:00');

  const distanceM = distanceMeters(choice, Number(customKm));

  const result = useMemo(() => {
    if (!Number.isFinite(distanceM) || distanceM < MIN_DISTANCE_M || distanceM > MAX_DISTANCE_M) {
      return { error: `거리는 ${MIN_DISTANCE_M / 1000}km 이상 ${MAX_DISTANCE_M / 1000}km 이하로 넣어 주세요.` } as const;
    }
    const sec = parseClock(time);
    if (sec === null || sec < 60 || sec > 12 * 3600) {
      return { error: '기록을 시:분:초 또는 분:초 형태로 넣어 주세요.' } as const;
    }

    const { vdot, clamped } = vdotFromRace(distanceM, sec);
    return {
      vdot,
      // 범위를 벗어난 입력인지 알려 준다. 조용히 잘라내면 값이 틀린 줄 모른다 (§7.10)
      clamped,
      paces: paceTable(vdot),
      equivalents: OTHER.map((key) => ({
        key,
        distanceM: RACE_DISTANCE_M[key],
        sec: predictRaceTimeSec(vdot, RACE_DISTANCE_M[key]),
      })).filter((e) => e.distanceM !== distanceM),
    } as const;
  }, [distanceM, time]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-body font-bold text-ink">기록의 거리</p>
        <div className="mt-2 space-y-2">
          <DistancePicker value={choice} onChange={setChoice} />
          {choice === CUSTOM ? (
            <NumberInput
              value={customKm}
              onChange={(e) => setCustomKm(e.target.value.replace(/[^\d.]/g, ''))}
              aria-label="거리 (km)"
              placeholder="12"
            />
          ) : null}
        </div>
      </div>

      <Field label="기록" hint="최근 6주 안의 기록일수록 정확합니다">
        {(id) => (
          <TextInput
            id={id}
            inputMode="numeric"
            autoComplete="off"
            className="tabular"
            value={time}
            onChange={(e) => setTime(maskClock(e.target.value, true))}
            placeholder="50:00"
          />
        )}
      </Field>

      {'error' in result ? (
        <Card tone="sunken" className="px-5 py-5">
          <p className="text-body text-ink-muted">{result.error}</p>
        </Card>
      ) : (
        <>
          <Card tone="raised" className="px-5 py-5">
            <SectionLabel>VDOT</SectionLabel>
            {/* 표시만 반올림한다. 페이스표·환산 기록은 원값으로 계산해야 한 자리에서 안 튄다 */}
            <p className="figure mt-1 text-figure text-ink">{result.vdot.toFixed(1)}</p>
            <p className="text-body text-ink-muted">지금 러닝 수준을 하나의 숫자로 나타낸 값입니다</p>
            {result.clamped ? (
              <p className="mt-2 text-label text-ink-muted">
                입력한 기록이 이 모델이 다루는 범위({VDOT_MIN}~{VDOT_MAX})를 벗어나 가장자리 값으로
                맞췄습니다. 기록을 다시 확인해 주세요.
              </p>
            ) : null}
          </Card>

          <Card className="px-5 py-5">
            <SectionLabel>다른 거리 예상 기록</SectionLabel>
            <table className="mt-3 w-full">
              <caption className="sr-only">같은 수준에서 다른 거리의 예상 기록</caption>
              <tbody>
                {result.equivalents.map((e) => (
                  <tr key={e.key} className="border-b border-line last:border-b-0">
                    <th scope="row" className="py-2.5 text-left text-body font-semibold text-ink">
                      {distanceLabel(e.distanceM / 1000)}
                    </th>
                    <td className="tabular py-2.5 text-right text-body-lg font-bold text-ink">
                      {formatDuration(e.sec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-label text-ink-muted">
              같은 수준을 유지한다고 가정한 환산값입니다. 특히 풀코스는 주간 거리가 충분하지
              않으면 이 예상보다 느려집니다 — 속도가 아니라 거리를 견디는 능력이 결과를 가릅니다.
            </p>
          </Card>

          <PaceTable paces={result.paces} level="full" />
        </>
      )}
    </div>
  );
}
