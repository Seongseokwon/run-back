'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Card } from '@/components/ui/card';
import { formatRaceDate } from '@/lib/format';
import {
  DOW_MON_FIRST,
  monthDays,
  monthLabel,
  monthLabelKo,
  toWeeks,
  type MonthKey,
} from '@/lib/month-grid';

/**
 * 대회 달력 (§10 `/race`).
 *
 * **왜 목록이 아니라 달력이 먼저인가.** 82개를 날짜순으로 늘어놓으면
 * "10월에 38개가 몰려 있다"는 사실이 안 읽힌다. 국내 대회는 봄·가을에 극단적으로
 * 몰려서, 밀도 자체가 대회를 고를 때 쓰는 정보다. 스크롤이 아니라 **날짜로 찾는 것**이
 * 실제 방식이기도 하다.
 *
 * **날짜를 안 고르면 그 달 전체를 보여 준다.** 달력과 목록이 같은 것을 가리켜야
 * 둘의 관계가 읽힌다. '7일 이내' 같은 창을 쓰면 12~1월처럼 대회가 드문 구간에서
 * 82개를 들고 있으면서 빈 화면을 띄우게 되고, 무엇보다 7일 남은 대회는
 * §7.3 최소 권장 주차(하프 10주·풀 12주)를 한참 밑돌아 **눌러도 할 수 있는 게 없다.**
 *
 * ⚠️ 이 컴포넌트는 **탐색 보조**다. 색인에 필요한 전체 목록은 이 아래에 서버가
 * 그대로 그린다 (§13.2 — 크롤러가 16개 상세로 들어가는 링크가 여기서 끊기면 안 된다).
 * JS 가 꺼져 있어도 그 목록은 살아 있다.
 */

export type CalendarRace = {
  slug: string;
  nameKo: string;
  date: string;
  region: string;
  distances: string;
  dday: string;
  uncertain: boolean;
  /** 고유 콘텐츠가 있으면 상세로, 없으면 플랜 생성으로 (§13.2) */
  href: Route;
};

export function RaceCalendar({
  months,
  initialMonth,
  racesByDate,
  today,
}: {
  /** 이동할 수 있는 달 (데이터 지평선 안). 밖으로 나가면 영원히 빈 달이 나온다 */
  months: MonthKey[];
  initialMonth: MonthKey;
  racesByDate: Record<string, CalendarRace[]>;
  today: string;
}) {
  const startIndex = Math.max(0, months.indexOf(initialMonth));
  const [index, setIndex] = useState(startIndex);
  const [selected, setSelected] = useState<string | null>(null);

  const month = months[index];
  if (!month) return null;

  const days = monthDays(month);
  const inMonth = days.filter((d) => d.inMonth);
  const monthRaces = inMonth.flatMap((d) => racesByDate[d.date] ?? []);
  const shown = selected ? (racesByDate[selected] ?? []) : monthRaces;

  /** 이 달에 대회가 없을 때 갈 곳. 빈 달에서 막다른 길을 만들지 않는다 */
  const nextWithRaces = months
    .slice(index + 1)
    .find((m) => monthDays(m).some((d) => d.inMonth && racesByDate[d.date]));

  function goMonth(next: number): void {
    setIndex(next);
    setSelected(null);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-section font-extrabold tracking-tight text-ink">{monthLabel(month)}</h2>
          <p className="tabular mt-0.5 text-label text-ink-muted">대회 {monthRaces.length}개</p>
        </div>
        <div className="flex shrink-0 items-center">
          <NavButton label="이전 달" direction="prev" disabled={index === 0} onClick={() => goMonth(index - 1)} />
          <NavButton
            label="다음 달"
            direction="next"
            disabled={index === months.length - 1}
            onClick={() => goMonth(index + 1)}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7">
        {DOW_MON_FIRST.map((d) => (
          <div key={d} className="pb-2 text-center text-micro font-bold text-ink-muted">
            {d}
          </div>
        ))}
      </div>

      {toWeeks(days).map((week, i) => (
        <div key={i} className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map((cell) => (
            <DayCell
              key={cell.date}
              day={cell.day}
              inMonth={cell.inMonth}
              isToday={cell.date === today}
              count={(racesByDate[cell.date] ?? []).length}
              selected={cell.date === selected}
              onSelect={() => setSelected(cell.date === selected ? null : cell.date)}
            />
          ))}
        </div>
      ))}

      {/* 고른 날짜가 목록의 제목이 된다. 어디를 보고 있는지 잃지 않게 */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <h3 className="text-body-lg font-bold text-ink">
          {selected ? `${formatRaceDate(selected)}의 대회 ${shown.length}개` : `${monthLabelKo(month)} 대회 ${shown.length}개`}
        </h3>
        {selected ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="pressable flex min-h-touch shrink-0 items-center text-label font-semibold text-brand-ink"
          >
            이 달 전체 보기
          </button>
        ) : null}
      </div>

      <div aria-live="polite">
        {shown.length > 0 ? (
          <ul className="divide-y divide-line">
            {shown.map((race) => (
              <li key={race.slug}>
                <RaceRow race={race} showDate={!selected} />
              </li>
            ))}
          </ul>
        ) : (
          <Card tone="sunken" className="mt-2 px-5 py-5">
            <p className="text-body text-ink">
              {selected ? '이 날짜에는 대회가 없습니다.' : '이 달에는 대회가 없습니다.'}
            </p>
            {!selected && nextWithRaces ? (
              <button
                type="button"
                onClick={() => goMonth(months.indexOf(nextWithRaces))}
                className="pressable mt-1 flex min-h-touch items-center text-body font-semibold text-brand-ink"
              >
                {monthLabel(nextWithRaces)}로 이동 →
              </button>
            ) : null}
          </Card>
        )}
      </div>
    </section>
  );
}

function RaceRow({ race, showDate }: { race: CalendarRace; showDate: boolean }) {
  return (
    <Link
      href={race.href}
      className="pressable -mx-2 flex min-h-touch items-center gap-3 rounded-lg px-2 py-4 hover:bg-surface-sunken/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-bold text-ink">
          {race.nameKo}
          {race.uncertain ? (
            <span className="ml-2 rounded-full bg-surface-sunken px-2 py-0.5 align-middle text-micro font-semibold text-ink-muted">
              개최 미확정
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-label text-ink-muted">
          {showDate ? `${formatRaceDate(race.date)} · ` : ''}
          {race.region}
        </p>
        <p className="mt-1 text-label text-ink-muted">{race.distances}</p>
      </div>
      <span className="tabular shrink-0 text-body font-bold text-brand-ink">{race.dday}</span>
    </Link>
  );
}

/**
 * 하루 칸.
 *
 * 대회가 있으면 닷 하나. **개수까지 닷으로 나누지 않는다** — 목록 제목이 개수를 말해 주고,
 * §6.2 가 보라를 아껴 쓰라고 정해 뒀다. 닷이 3개씩 찍히면 달력이 보라로 얼룩진다.
 *
 * 색만으로 뜻을 전하지 않는다 (WCAG 1.4.1): 닷은 **있고 없음**이라 형태로 구분되고,
 * 스크린리더에는 개수를 문장으로 읽어 준다.
 */
function DayCell({
  day,
  inMonth,
  isToday,
  count,
  selected,
  onSelect,
}: {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!inMonth) return <div aria-hidden />;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={count === 0}
      className={`pressable flex h-14 flex-col items-center justify-center gap-1 rounded-xl disabled:pointer-events-none ${
        selected ? 'bg-brand-soft' : ''
      }`}
    >
      <span
        className={`flex size-7 items-center justify-center rounded-full text-body ${
          isToday ? 'bg-ink font-extrabold text-canvas' : count > 0 ? 'font-bold text-ink' : 'font-medium text-ink-subtle'
        }`}
      >
        {day}
      </span>
      <span className="flex h-[6px] items-center">
        {count > 0 ? <span className="block size-1.5 rounded-full bg-brand" /> : null}
      </span>
      <span className="sr-only">
        {isToday ? '오늘. ' : ''}
        {count > 0 ? `대회 ${count}개` : '대회 없음'}
      </span>
    </button>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  direction,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  direction: 'prev' | 'next';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="pressable flex size-touch shrink-0 items-center justify-center rounded-full text-ink disabled:opacity-25"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          d={direction === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

