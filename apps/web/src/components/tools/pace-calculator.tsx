'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { formatDuration, formatPace, per400m } from '@runback/engine';
import { Card, SectionLabel } from '@/components/ui/card';
import { Field, NumberInput, Segmented, TextInput } from '@/components/ui/field';
import { maskClock, parseClock } from '@/lib/time-input';
import { CUSTOM, DistancePicker, distanceMeters, type DistanceChoice } from './distance-picker';

/**
 * 페이스 계산기 (PRD §13.1 `/tools/pace`).
 *
 * 계산 자체는 나눗셈이라 엔진을 부를 것도 없다. 이 화면이 실제로 하는 일은
 * **구간 통과 시간표**를 내는 것이다 — 레이스에서 시계를 보고 판단하는 단위가 그것이다.
 *
 * 서버에서 아무것도 받지 않는다. 그래서 정적 페이지 위에 그대로 얹힌다.
 */

type Mode = 'toPace' | 'toTime';

const MODES = [
  { value: 'toPace' as const, label: '기록 → 페이스' },
  { value: 'toTime' as const, label: '페이스 → 기록' },
];

export function PaceCalculator() {
  const [mode, setMode] = useState<Mode>('toPace');
  const [choice, setChoice] = useState<DistanceChoice>('HALF');
  const [customKm, setCustomKm] = useState('12');
  const [time, setTime] = useState('1:50:00');
  const [pace, setPace] = useState('5:30');

  const km = distanceMeters(choice, Number(customKm)) / 1000;
  const valid = Number.isFinite(km) && km > 0 && km <= 100;

  const result = useMemo(() => {
    if (!valid) return null;
    if (mode === 'toPace') {
      const sec = parseClock(time);
      if (sec === null || sec <= 0) return null;
      return { totalSec: sec, secPerKm: sec / km };
    }
    const secPerKm = parseClock(pace);
    // 페이스는 분:초로 읽는다. 1km 를 1분 미만이나 30분 초과로 뛰는 입력은 오타로 본다
    if (secPerKm === null || secPerKm < 60 || secPerKm > 1800) return null;
    return { totalSec: secPerKm * km, secPerKm };
  }, [mode, time, pace, km, valid]);

  return (
    <div className="space-y-5">
      <Segmented options={MODES} value={mode} onChange={setMode} ariaLabel="계산 방향" />

      {/* 라디오 그룹에는 `Field` 를 쓰지 않는다 — `label htmlFor` 가 가리킬 단일 입력이 없다 */}
      <div>
        <p className="text-body font-bold text-ink">거리</p>
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

      {mode === 'toPace' ? (
        <Field label="목표 기록" hint="시:분:초 또는 분:초">
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              autoComplete="off"
              className="tabular"
              value={time}
              onChange={(e) => setTime(maskClock(e.target.value, true))}
              placeholder="1:50:00"
            />
          )}
        </Field>
      ) : (
        <Field label="1km 페이스" hint="분:초">
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              autoComplete="off"
              className="tabular"
              value={pace}
              onChange={(e) => setPace(maskClock(e.target.value, false))}
              placeholder="5:30"
            />
          )}
        </Field>
      )}

      {result ? (
        <>
          <Card tone="raised" className="px-5 py-5">
            <SectionLabel>{mode === 'toPace' ? '필요한 페이스' : '예상 기록'}</SectionLabel>
            <p className="figure mt-2 text-figure-sm text-ink">
              {mode === 'toPace' ? formatPace(result.secPerKm) : formatDuration(result.totalSec)}
              {mode === 'toPace' ? (
                <span className="ml-1.5 text-body font-bold text-ink-muted">/km</span>
              ) : null}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
              <Cell label={mode === 'toPace' ? '완주 기록' : '1km 페이스'}>
                {mode === 'toPace' ? formatDuration(result.totalSec) : formatPace(result.secPerKm)}
              </Cell>
              <Cell label="400m 랩">{formatDuration(per400m(result.secPerKm))}</Cell>
              <Cell label="시속">{(3600 / result.secPerKm).toFixed(1)} km</Cell>
            </dl>
          </Card>

          <Splits km={km} secPerKm={result.secPerKm} />
        </>
      ) : (
        <Card tone="sunken" className="px-5 py-5">
          <p className="text-body text-ink-muted">
            {valid
              ? '기록을 시:분:초 또는 분:초 형태로 넣어 주세요.'
              : '거리를 0보다 크게, 100km 이하로 넣어 주세요.'}
          </p>
        </Card>
      )}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-micro font-semibold text-ink-muted">{label}</dt>
      <dd className="tabular mt-1 text-body-lg font-extrabold text-ink">{children}</dd>
    </div>
  );
}

/** 소수점 뒤 불필요한 0 을 떼고 보여준다. 21.0975 는 그대로, 5 는 '5' */
function km2(value: number): string {
  return String(Number(value.toFixed(4)));
}

/**
 * 구간 통과 시간.
 *
 * 5km 마다 끊고 **마지막에 결승선을 붙인다.** 42.195km 는 마지막 구간이 2.195km 라
 * 5km 배수만 찍으면 정작 목표 기록이 표에서 빠진다.
 */
function Splits({ km, secPerKm }: { km: number; secPerKm: number }) {
  const step = km <= 10 ? 1 : 5;
  const marks: number[] = [];
  for (let d = step; d < km - 1e-9; d += step) marks.push(d);
  marks.push(km);

  return (
    <Card className="px-5 py-5">
      <SectionLabel>구간 통과 시간</SectionLabel>
      <table className="mt-3 w-full">
        <caption className="sr-only">거리별 누적 통과 시간</caption>
        <tbody>
          {marks.map((d) => (
            <tr key={d} className="border-b border-line last:border-b-0">
              <th scope="row" className="tabular py-2.5 text-left text-body font-semibold text-ink">
                {km2(d)} km
              </th>
              <td className="tabular py-2.5 text-right text-body-lg font-bold text-ink">
                {formatDuration(d * secPerKm)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-label text-ink-muted">
        일정한 페이스로 뛴다고 가정한 값입니다. 실제 레이스에서는 초반을 이보다 조금 느리게
        잡는 편이 결과가 낫습니다.
      </p>
    </Card>
  );
}
