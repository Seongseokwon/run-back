'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FitnessInput, GoalInput, PlanInput, RaceDistanceM } from '@raceback/engine';
import { Button } from '@/components/ui/button';
import { ChoiceList, Field, NumberInput, Segmented, StepIndicator, type Option } from '@/components/ui/field';
import { distanceLabel, formatRaceDate } from '@/lib/format';
import { maskClock, parseClock } from '@/lib/time-input';
import { planHref } from '@/lib/plan-url';
import type { RaceOption } from '@/lib/race-options';

/**
 * 입력 스텝 — PRD §10.3. 3스텝, 스텝당 질문 2개 이하.
 *
 * 스텝 이동을 `history.pushState` 로 쌓는다. 브라우저 뒤로가기가 곧 이전 스텝이 되고,
 * 서버 왕복도 없다. 입력값은 sessionStorage 에 두어 새로고침에도 남는다 (§10.3 입력 보존).
 */

const STORAGE_KEY = 'runback:wizard';
const TOTAL_STEPS = 3;

type FitnessKind = 'race' | 'feel' | 'novice';

type State = {
  raceSlug: string | null;
  /** 대회 미선택 시 직접 입력한 날짜 */
  customDate: string;
  distanceM: number | null;
  fitnessKind: FitnessKind | null;
  recordDistanceM: number;
  recordTime: string;
  easyPace: string;
  weeklyKm: string;
  canRunMin: string;
  goalKind: 'time' | 'finish';
  targetTime: string;
  daysPerWeek: 3 | 4 | 5 | 6;
};

const EMPTY: State = {
  raceSlug: null,
  customDate: '',
  distanceM: null,
  fitnessKind: null,
  recordDistanceM: 10000,
  recordTime: '',
  easyPace: '',
  weeklyKm: '',
  canRunMin: '',
  goalKind: 'finish',
  targetTime: '',
  daysPerWeek: 4,
};

const FITNESS_OPTIONS: readonly Option<FitnessKind>[] = [
  { value: 'race', label: '최근 대회 기록이 있어요', hint: '가장 정확합니다' },
  { value: 'feel', label: '편하게 뛰는 페이스를 알아요', hint: '주간 거리와 함께 추정합니다' },
  { value: 'novice', label: '잘 모르겠어요', hint: '쉬지 않고 뛸 수 있는 시간만 알면 됩니다' },
];

const RECORD_DISTANCES: readonly Option<string>[] = [
  { value: '5000', label: '5K' },
  { value: '10000', label: '10K' },
  { value: '21097.5', label: '하프' },
  { value: '42195', label: '풀' },
];

const DAYS_OPTIONS: readonly Option<string>[] = [
  { value: '3', label: '주 3일' },
  { value: '4', label: '주 4일' },
  { value: '5', label: '주 5일' },
  { value: '6', label: '주 6일' },
];

export function PlanWizard({
  races,
  today,
  initialRaceSlug,
  initialDistanceM,
}: {
  races: RaceOption[];
  today: string;
  initialRaceSlug?: string;
  initialDistanceM?: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<State>(() => ({
    ...EMPTY,
    ...(initialRaceSlug ? { raceSlug: initialRaceSlug } : {}),
    ...(initialDistanceM ? { distanceM: initialDistanceM } : {}),
  }));
  const [query, setQuery] = useState('');

  // 새로고침 복원. 대회 페이지에서 넘어온 값이 있으면 그쪽이 우선이다
  useEffect(() => {
    if (initialRaceSlug) return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setState((prev) => ({ ...prev, ...(JSON.parse(saved) as Partial<State>) }));
    } catch {
      /* 저장소를 못 쓰는 환경이면 그냥 빈 상태로 시작한다 */
    }
  }, [initialRaceSlug]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 무시 */
    }
  }, [state]);

  // 뒤로가기 = 이전 스텝
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, rbStep: 1 }, '');
    const onPop = (e: PopStateEvent) => {
      const next = (e.state as { rbStep?: number } | null)?.rbStep;
      setStep(typeof next === 'number' && next >= 1 && next <= TOTAL_STEPS ? next : 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const patch = (next: Partial<State>) => setState((prev) => ({ ...prev, ...next }));

  const advance = () => {
    const next = step + 1;
    window.history.pushState({ ...window.history.state, rbStep: next }, '');
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const selectedRace = useMemo(
    () => races.find((r) => r.slug === state.raceSlug) ?? null,
    [races, state.raceSlug],
  );

  const raceDate = selectedRace?.date ?? state.customDate;
  const availableDistances = selectedRace ? selectedRace.distances : [5, 10, 21.0975, 42.195];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? races.filter((r) => r.nameKo.toLowerCase().includes(q) || r.region.toLowerCase().includes(q))
      : races;
    return list.slice(0, 8);
  }, [races, query]);

  const step1Ready = Boolean(raceDate) && raceDate >= today && state.distanceM !== null;
  const step2Ready = (() => {
    switch (state.fitnessKind) {
      case 'race':
        return parseClock(state.recordTime) !== null;
      case 'feel':
        return parseClock(state.easyPace) !== null && Number(state.weeklyKm) > 0;
      case 'novice':
        return Number(state.canRunMin) > 0;
      default:
        return false;
    }
  })();
  const step3Ready = state.goalKind === 'finish' || parseClock(state.targetTime) !== null;

  function buildInput(): PlanInput | null {
    if (!step1Ready || !step2Ready || !step3Ready) return null;

    let fitness: FitnessInput;
    if (state.fitnessKind === 'race') {
      fitness = { kind: 'race', distanceM: state.recordDistanceM, timeSec: parseClock(state.recordTime)! };
    } else if (state.fitnessKind === 'feel') {
      fitness = { kind: 'feel', easyPaceSecPerKm: parseClock(state.easyPace)!, weeklyKm: Number(state.weeklyKm) };
    } else {
      fitness = { kind: 'novice', canRunMin: Number(state.canRunMin) };
    }

    const goal: GoalInput =
      state.goalKind === 'time' ? { kind: 'time', targetSec: parseClock(state.targetTime)! } : { kind: 'finish' };

    return {
      raceDate,
      raceDistanceM: state.distanceM as RaceDistanceM,
      today,
      fitness,
      goal,
      daysPerWeek: state.daysPerWeek,
      ...(state.fitnessKind === 'feel' ? { currentWeeklyKm: Number(state.weeklyKm) } : {}),
    };
  }

  function submit() {
    const input = buildInput();
    if (!input) return;
    router.push(
      planHref('/plan/verdict', { input, ...(state.raceSlug ? { raceSlug: state.raceSlug } : {}) }),
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator step={step} total={TOTAL_STEPS} />

      {step === 1 ? (
        <section className="space-y-5">
          <h2 className="text-[24px] font-extrabold tracking-tight text-ink">어느 대회인가요?</h2>

          {selectedRace ? (
            <div className="rounded-control border border-brand bg-brand-soft px-4 py-3.5">
              <p className="text-[16px] font-bold text-brand">{selectedRace.nameKo}</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {formatRaceDate(selectedRace.date)} · {selectedRace.region}
              </p>
              {selectedRace.uncertain ? (
                <p className="mt-2 text-[13px] leading-relaxed text-ink">
                  ⚠️ 개최 여부가 불투명한 대회입니다. 공식 공지를 확인하세요.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => patch({ raceSlug: null, distanceM: null })}
                className="mt-2 text-[13px] font-semibold text-brand underline"
              >
                다른 대회 고르기
              </button>
            </div>
          ) : (
            <>
              <Field label="대회 검색" hint="대회명이나 지역으로 찾을 수 있습니다">
                {(id) => (
                  <input
                    id={id}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="예: 춘천, 서울, 하프"
                    autoComplete="off"
                    className="h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-[17px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
                  />
                )}
              </Field>

              <ul className="divide-y divide-line">
                {filtered.map((race) => (
                  <li key={race.slug}>
                    <button
                      type="button"
                      onClick={() => patch({ raceSlug: race.slug, distanceM: null, customDate: '' })}
                      className="w-full py-3 text-left"
                    >
                      <span className="block text-[16px] font-semibold text-ink">{race.nameKo}</span>
                      <span className="mt-0.5 block text-[13px] text-ink-muted">
                        {formatRaceDate(race.date)} · {race.region}
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 ? (
                  <li className="py-4 text-[14px] text-ink-muted">검색 결과가 없습니다</li>
                ) : null}
              </ul>

              {/* F-01 폴백 — 대회가 목록에 없어도 막히지 않는다 */}
              <Field label="대회가 목록에 없나요?" hint="날짜를 직접 넣어도 플랜을 만들 수 있습니다">
                {(id) => (
                  <input
                    id={id}
                    type="date"
                    min={today}
                    value={state.customDate}
                    onChange={(e) => patch({ customDate: e.target.value })}
                    className="h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-[17px] text-ink focus:border-brand focus:outline-none"
                  />
                )}
              </Field>
            </>
          )}

          {raceDate ? (
            <Field label="어느 종목에 나가시나요?">
              {() => (
                <div className="grid grid-cols-2 gap-2">
                  {availableDistances.map((km) => {
                    const meters = Math.round(km * 1000 * 10) / 10;
                    const active = state.distanceM === meters;
                    return (
                      <button
                        key={km}
                        type="button"
                        onClick={() => patch({ distanceM: meters })}
                        className={`h-12 rounded-control border text-[16px] font-semibold ${
                          active ? 'border-brand bg-brand-soft text-brand' : 'border-line-strong bg-surface text-ink'
                        }`}
                      >
                        {distanceLabel(km)}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
          ) : null}

          <Button onClick={advance} disabled={!step1Ready}>
            다음
          </Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5">
          <h2 className="text-[24px] font-extrabold tracking-tight text-ink">지금 실력이 어느 정도인가요?</h2>

          <ChoiceList
            options={FITNESS_OPTIONS}
            value={state.fitnessKind}
            onChange={(v) => patch({ fitnessKind: v })}
            ariaLabel="실력 입력 방식"
          />

          {state.fitnessKind === 'race' ? (
            <div className="space-y-4">
              <Field label="어느 종목의 기록인가요?">
                {() => (
                  <Segmented
                    options={RECORD_DISTANCES}
                    value={String(state.recordDistanceM)}
                    onChange={(v) => patch({ recordDistanceM: Number(v) })}
                    ariaLabel="기록 종목"
                  />
                )}
              </Field>
              <Field label="기록" hint="시:분:초 또는 분:초">
                {(id) => (
                  <NumberInput
                    id={id}
                    value={state.recordTime}
                    onChange={(e) => patch({ recordTime: maskClock(e.target.value, true) })}
                    placeholder="50:00"
                  />
                )}
              </Field>
            </div>
          ) : null}

          {state.fitnessKind === 'feel' ? (
            <div className="space-y-4">
              <Field label="편하게 뛸 때 페이스" hint="1km 당 분:초">
                {(id) => (
                  <NumberInput
                    id={id}
                    value={state.easyPace}
                    onChange={(e) => patch({ easyPace: maskClock(e.target.value, false) })}
                    placeholder="6:30"
                  />
                )}
              </Field>
              <Field label="요즘 주간 거리" hint="km">
                {(id) => (
                  <NumberInput
                    id={id}
                    value={state.weeklyKm}
                    onChange={(e) => patch({ weeklyKm: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    placeholder="30"
                  />
                )}
              </Field>
            </div>
          ) : null}

          {state.fitnessKind === 'novice' ? (
            <Field label="쉬지 않고 몇 분 정도 뛸 수 있나요?" hint="분">
              {(id) => (
                <NumberInput
                  id={id}
                  value={state.canRunMin}
                  onChange={(e) => patch({ canRunMin: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  placeholder="20"
                />
              )}
            </Field>
          ) : null}

          <Button onClick={advance} disabled={!step2Ready}>
            다음
          </Button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <h2 className="text-[24px] font-extrabold tracking-tight text-ink">목표와 훈련 가능 일수</h2>

          <Field label="목표">
            {() => (
              <Segmented
                options={[
                  { value: 'finish', label: '완주가 목표' },
                  { value: 'time', label: '기록이 목표' },
                ]}
                value={state.goalKind}
                onChange={(v) => patch({ goalKind: v as 'time' | 'finish' })}
                ariaLabel="목표 종류"
              />
            )}
          </Field>

          {state.goalKind === 'time' ? (
            <Field label="목표 기록" hint="시:분:초 또는 분:초">
              {(id) => (
                <NumberInput
                  id={id}
                  value={state.targetTime}
                  onChange={(e) => patch({ targetTime: maskClock(e.target.value, true) })}
                  placeholder="1:55:00"
                />
              )}
            </Field>
          ) : null}

          <Field label="주당 훈련 가능 일수" hint="지킬 수 있는 만큼만 고르세요. 판정이 여기에 크게 좌우됩니다">
            {() => (
              <div className="grid grid-cols-4 gap-2">
                {DAYS_OPTIONS.map((opt) => {
                  const active = String(state.daysPerWeek) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patch({ daysPerWeek: Number(opt.value) as 3 | 4 | 5 | 6 })}
                      className={`h-12 rounded-control border text-[15px] font-semibold ${
                        active ? 'border-brand bg-brand-soft text-brand' : 'border-line-strong bg-surface text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <Button onClick={submit} disabled={!step3Ready}>
            플랜 만들기
          </Button>
        </section>
      ) : null}
    </div>
  );
}
