'use client';

import { useState } from 'react';
import type { CalendarCell } from '@/lib/plan-view';

export type MonthData = {
  key: string;
  label: string;
  cells: CalendarCell[];
  doneCount: number;
  plannedCount: number;
  doneKm: number;
  plannedKm: number;
};

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 월 캘린더.
 *
 * 마커는 네 가지 — 완료 / 예정 / 오늘 / 롱런. **색만으로 구분하지 않는다.**
 * 채움과 테두리로 모양을 다르게 두고, 아래 범례에 글자 라벨을 붙이고,
 * 각 칸에는 스크린리더용 설명을 숨겨 둔다 (WCAG 1.4.1).
 *
 * ⚠️ 여기 표시되는 '완료'는 계획상 지나간 세션이다. 실제로 뛰었는지는 아직 모른다 —
 * 수행 로그(F-12)가 붙기 전까지는 지어내지 않는다.
 */
export function MonthCalendar({ months, initialKey }: { months: MonthData[]; initialKey: string }) {
  const startIndex = Math.max(0, months.findIndex((m) => m.key === initialKey));
  const [index, setIndex] = useState(startIndex);
  const [selected, setSelected] = useState<string | null>(null);

  const month = months[index];
  if (!month) return null;

  const selectedCell = month.cells.find((c) => c.date === selected);

  return (
    <section>
      <div className="flex items-center justify-between">
        <NavButton
          label="이전 달"
          disabled={index === 0}
          onClick={() => {
            setIndex(index - 1);
            setSelected(null);
          }}
          direction="prev"
        />
        <h2 className="text-[18px] font-bold text-ink">{month.label}</h2>
        <NavButton
          label="다음 달"
          disabled={index === months.length - 1}
          onClick={() => {
            setIndex(index + 1);
            setSelected(null);
          }}
          direction="next"
        />
      </div>

      <p className="mt-1 text-center text-[14px] text-ink-muted">
        <span className="tabular">
          {month.doneCount} / {month.plannedCount}
        </span>{' '}
        세션 ·{' '}
        <span className="tabular">
          {month.doneKm} / {month.plannedKm}
        </span>{' '}
        km
      </p>

      <div className="mt-4 grid grid-cols-7 gap-y-1">
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-center text-[12px] font-semibold text-ink-muted">
            {d}
          </div>
        ))}

        {month.cells.map((cell) => (
          <DayCell
            key={cell.date}
            cell={cell}
            selected={cell.date === selected}
            onSelect={() => setSelected(cell.date === selected ? null : cell.date)}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-muted">
        <Legend>
          <span className="size-2.5 rounded-full bg-brand" />
          완료
        </Legend>
        <Legend>
          <span className="size-2.5 rounded-full border-2 border-line-input" />
          예정
        </Legend>
        <Legend>
          <span className="size-2.5 rounded-full bg-accent" />
          롱런
        </Legend>
        <Legend>
          <span className="size-4 rounded-full border-2 border-brand" />
          오늘
        </Legend>
      </ul>

      {/* 날짜를 누르면 그날 세션을 여기서 펼친다. 칸 안에 다 넣으면 글자가 읽을 수 없이 작아진다 */}
      <div className="mt-4 rounded-card border border-line bg-surface px-4 py-4" aria-live="polite">
        {!selectedCell ? (
          <p className="text-[14px] text-ink-muted">날짜를 누르면 그날 훈련이 여기 표시됩니다.</p>
        ) : selectedCell.title ? (
          <>
            <p className="text-[13px] font-semibold text-ink-muted">
              {formatDay(selectedCell.date)}
              {selectedCell.isToday ? ' · 오늘' : selectedCell.status === 'done' ? ' · 지난 세션' : ' · 예정'}
            </p>
            <p className="mt-1 text-[17px] font-bold text-ink">
              {selectedCell.title} <span className="tabular">{selectedCell.distanceKm}km</span>
              {selectedCell.zone ? <span className="ml-2 text-[14px] text-ink-muted">{selectedCell.zone} 존</span> : null}
            </p>
            {selectedCell.structure ? (
              <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{selectedCell.structure}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-ink-muted">{formatDay(selectedCell.date)}</p>
            <p className="mt-1 text-[17px] font-bold text-ink">
              {selectedCell.inPlan ? '휴식' : '플랜 기간이 아닙니다'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return <li className="flex items-center gap-1.5">{children}</li>;
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
      className="pressable flex size-touch items-center justify-center rounded-full text-ink disabled:opacity-30"
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

function DayCell({
  cell,
  selected,
  onSelect,
}: {
  cell: CalendarCell;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!cell.inMonth) return <div aria-hidden />;

  const marker =
    cell.status === 'none'
      ? null
      : cell.isLong
        ? `size-2 rounded-full ${cell.status === 'done' ? 'bg-accent' : 'border-2 border-accent'}`
        : `size-2 rounded-full ${cell.status === 'done' ? 'bg-brand' : 'border-2 border-line-input'}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`pressable flex h-11 flex-col items-center justify-center gap-1 rounded-xl ${
        selected ? 'bg-brand-soft' : ''
      }`}
    >
      <span
        className={`flex size-7 items-center justify-center rounded-full text-[14px] ${
          cell.isToday ? 'border-2 border-brand font-extrabold text-brand-ink' : 'font-medium text-ink'
        }`}
      >
        {cell.day}
      </span>
      <span className={`block ${marker ?? 'size-2'}`} aria-hidden />
      <span className="sr-only">
        {cell.status === 'none'
          ? cell.inPlan
            ? '휴식'
            : '플랜 기간 밖'
          : `${cell.title} ${cell.distanceKm}km ${cell.status === 'done' ? '지난 세션' : '예정'}`}
      </span>
    </button>
  );
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${DOW[d.getUTCDay()]})`;
}
