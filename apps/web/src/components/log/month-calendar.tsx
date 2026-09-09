'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ZoneBadge } from '@/components/ui/badge';
import { DOW_MON_FIRST, type CalendarCell } from '@/lib/plan-view';

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

/** 마커 종류. 넷 다 **모양이 다르다** — 색을 못 봐도 구분된다 (WCAG 1.4.1) */
type Marker = 'done' | 'planned' | 'today' | 'long';

/**
 * 캘린더 마커.
 *
 * 점이 아니라 아웃라인 아이콘을 쓴다. 6px 짜리 점은 좁은 칸에서 서로 구별되지 않는데,
 * 빈 원 / 체크 원 / 겹친 원 / 채운 원은 크기가 같아도 형태로 갈린다.
 */
function MarkerIcon({ kind }: { kind: Marker }) {
  if (kind === 'today') {
    return (
      <svg viewBox="0 0 20 20" className="size-[18px] text-ink" aria-hidden>
        <circle cx="10" cy="10" r="5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'long') {
    return (
      <svg viewBox="0 0 20 20" className="size-[18px] text-accent" aria-hidden>
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="10" cy="10" r="3" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'done') {
    return (
      <svg viewBox="0 0 20 20" className="size-[18px] text-brand-ink" aria-hidden>
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M6.8 10.2l2.2 2.2 4.2-4.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="size-[18px] text-line-input" aria-hidden>
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * 월 캘린더.
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
  const weeks = Array.from({ length: month.cells.length / 7 }, (_, i) =>
    month.cells.slice(i * 7, i * 7 + 7),
  );

  return (
    <section>
      {/* 범례를 달력 위에 둔다 — 마커를 처음 만나기 전에 뜻을 알려 주는 순서다 */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-label text-ink-muted">
        <Legend kind="done" label="완료" />
        <Legend kind="planned" label="계획" />
        <Legend kind="today" label="오늘" />
        <Legend kind="long" label="롱런" />
      </ul>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-section font-extrabold tracking-tight text-ink">{month.label}</h2>
          <p className="tabular mt-0.5 text-label text-ink-muted">
            {month.doneCount}/{month.plannedCount} 세션 · {month.doneKm}/{month.plannedKm} km
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <NavButton
            label="이전 달"
            disabled={index === 0}
            onClick={() => {
              setIndex(index - 1);
              setSelected(null);
            }}
            direction="prev"
          />
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
      </div>

      <div className="mt-3 grid grid-cols-7">
        {DOW_MON_FIRST.map((d) => (
          <div key={d} className="pb-2 text-center text-micro font-bold text-ink-muted">
            {d}
          </div>
        ))}
      </div>

      {/* 주 단위로 감싸 아래 괘선을 긋는다. 엔진의 훈련 주차가 한 줄과 정확히 맞는다 */}
      {weeks.map((week, i) => (
        <div key={i} className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map((cell) => (
            <DayCell
              key={cell.date}
              cell={cell}
              selected={cell.date === selected}
              onSelect={() => setSelected(cell.date === selected ? null : cell.date)}
            />
          ))}
        </div>
      ))}

      {/* 날짜를 누르면 그날 세션을 여기서 펼친다. 칸 안에 다 넣으면 글자가 읽을 수 없이 작아진다 */}
      <Card className="mt-4 px-4 py-4" aria-live="polite">
        {!selectedCell ? (
          <p className="text-body text-ink-muted">날짜를 누르면 그날 훈련이 여기 표시됩니다.</p>
        ) : selectedCell.title ? (
          <>
            <p className="text-label font-semibold text-ink-muted">
              {formatDay(selectedCell.date)}
              {selectedCell.isToday
                ? ' · 오늘'
                : selectedCell.status === 'done'
                  ? ' · 지난 세션'
                  : ' · 예정'}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-body-lg font-bold text-ink">
              <span>{selectedCell.title}</span>
              <span className="tabular">{selectedCell.distanceKm}km</span>
              {selectedCell.zone ? <ZoneBadge zone={selectedCell.zone} /> : null}
            </p>
            {selectedCell.structure ? (
              <p className="mt-1 text-label text-ink-muted">{selectedCell.structure}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-label font-semibold text-ink-muted">{formatDay(selectedCell.date)}</p>
            <p className="mt-1.5 text-body-lg font-bold text-ink">
              {selectedCell.inPlan ? '휴식' : '플랜 기간이 아닙니다'}
            </p>
          </>
        )}
      </Card>
    </section>
  );
}

/** 범례 한 칸. 마커는 장식이고 뜻은 글자가 진다 (WCAG 1.4.1) */
function Legend({ kind, label }: { kind: Marker; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <MarkerIcon kind={kind} />
      {label}
    </li>
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

/** 한 칸의 마커를 고른다. 오늘 > 롱런 > 완료 > 계획 순으로 이긴다 */
function markerOf(cell: CalendarCell): Marker | null {
  if (cell.isToday) return 'today';
  if (cell.status === 'none') return null;
  if (cell.isLong) return 'long';
  return cell.status === 'done' ? 'done' : 'planned';
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

  const marker = markerOf(cell);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`pressable flex h-14 flex-col items-center justify-center gap-1 rounded-xl ${
        selected ? 'bg-brand-soft' : ''
      }`}
    >
      <span
        className={`text-body ${
          cell.isToday
            ? 'font-extrabold text-ink'
            : cell.inPlan
              ? 'font-medium text-ink'
              : 'font-medium text-ink-subtle'
        }`}
      >
        {cell.day}
      </span>
      <span className="flex h-[18px] items-center">
        {marker ? <MarkerIcon kind={marker} /> : null}
      </span>
      <span className="sr-only">
        {cell.isToday ? '오늘. ' : ''}
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
