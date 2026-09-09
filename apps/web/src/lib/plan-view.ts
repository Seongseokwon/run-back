/**
 * 엔진이 낸 Plan 을 화면이 쓰기 좋은 모양으로 바꾸는 어댑터.
 *
 * 여기서 숫자를 만들지 않는다. 고르고, 라벨을 붙이고, 포맷할 뿐이다.
 * 계산이 필요하면 엔진에 넣는다 (PRD §7.9 와 같은 원칙 — 경계를 흐리지 않는다).
 */

import type { Plan, PlanSession, PlanWeek, SessionType } from '@raceback/engine';
import type { WeekItem } from '@/components/home/week-list';
import type { RowStatus } from '@/components/ui/list-row';

/** 오늘의 훈련 카드 제목용 */
const TYPE_TITLE: Record<SessionType, string> = {
  rest: 'REST',
  easy: 'EASY RUN',
  long: 'LONG RUN',
  tempo: 'TEMPO',
  interval: 'INTERVAL',
  repetition: 'REPETITION',
  'marathon-pace': 'MARATHON PACE',
  race: 'RACE DAY',
};

/** 주간 목록의 짧은 라벨 */
const TYPE_SHORT: Record<SessionType, string> = {
  rest: '휴식',
  easy: 'Easy',
  long: 'Long Run',
  tempo: 'Tempo',
  interval: 'Interval',
  repetition: 'Repetition',
  'marathon-pace': 'M-Pace',
  race: '대회',
};

export function sessionTitle(type: SessionType): string {
  return TYPE_TITLE[type];
}

export function sessionShort(type: SessionType): string {
  return TYPE_SHORT[type];
}

export const PHASE_LABEL: Record<PlanWeek['phase'], string> = {
  base: '기반',
  build: '빌드',
  peak: '피크',
  taper: '테이퍼',
};

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** 오늘이 속한 주차. 아직 시작 전이면 첫 주, 이미 끝났으면 마지막 주 */
export function currentWeek(plan: Plan, today: string): PlanWeek {
  const found = plan.weeks.find((w) => today >= w.startDate && today <= addDays(w.startDate, 6));
  if (found) return found;
  return today < plan.weeks[0]!.startDate ? plan.weeks[0]! : plan.weeks[plan.weeks.length - 1]!;
}

export function sessionOn(plan: Plan, date: string): PlanSession | undefined {
  return plan.weeks.flatMap((w) => w.sessions).find((s) => s.date === date);
}

/** 플랜 첫 주 시작일. 대회 날짜에서 주 단위로 역산하므로 오늘이 아니라 다음 주 월요일일 수 있다 */
export function planStartDate(plan: Plan): string {
  return plan.weeks[0]?.startDate ?? plan.input.raceDate;
}

/**
 * 플랜과 오늘의 관계.
 *
 * `before` 를 따로 두는 이유: 시작 전에 '오늘은 휴식일입니다' 라고 하면
 * 플랜이 이미 돌아가는데 오늘만 쉬는 것처럼 읽힌다. 아직 시작을 안 한 것과 다르다.
 */
export function planStatus(plan: Plan, today: string): 'before' | 'during' | 'after' {
  if (today < planStartDate(plan)) return 'before';
  if (today > plan.input.raceDate) return 'after';
  return 'during';
}

/** 플랜의 모든 세션. 휴식일은 애초에 세션으로 만들어지지 않는다 */
export function allSessions(plan: Plan): PlanSession[] {
  return plan.weeks.flatMap((w) => w.sessions);
}

/**
 * 세션 진행 — 목업의 `12 / 15 sessions`.
 *
 * 날짜 비율이 아니라 **세션 수**로 센다. 러너가 체감하는 단위가 '며칠 지났나'가
 * 아니라 '몇 번 뛰었나'이기 때문이다.
 *
 * ⚠️ 지금은 수행 로그(F-12)가 없어서 '지난 날짜의 세션'을 완료로 친다.
 * 로그가 붙으면 여기만 완료 플래그 기준으로 바꾸면 된다 — 호출부는 그대로다.
 */
export function sessionProgress(plan: Plan, today: string): { done: number; total: number; ratio: number } {
  const sessions = allSessions(plan).filter((s) => s.type !== 'race');
  const done = sessions.filter((s) => s.date < today).length;
  return { done, total: sessions.length, ratio: sessions.length === 0 ? 0 : done / sessions.length };
}

/** 플랜 전체 진행률 0~1. 세션 완료 수 기준 */
export function planProgress(plan: Plan, today: string): number {
  return sessionProgress(plan, today).ratio;
}

/** 한 주를 요일 7칸으로 펴서 목록에 넣는다. 세션이 없는 날은 휴식 */
export function weekItems(week: PlanWeek, today: string): WeekItem[] {
  const items: WeekItem[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(week.startDate, i);
    const session = week.sessions.find((s) => s.date === date);
    const status: RowStatus = !session ? 'rest' : date < today ? 'done' : 'todo';
    items.push({
      day: DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]!,
      status,
      title: session ? `${TYPE_SHORT[session.type]} ${session.distanceKm}km` : '휴식',
    });
  }
  return items;
}

// ── 월 캘린더 (기록 탭) ────────────────────────────────────────────────

/**
 * 캘린더 한 칸의 상태.
 * 색만으로 구분하지 않는다 — 범례에 글자 라벨이 함께 간다 (WCAG 1.4.1).
 */
export type CalendarStatus = 'none' | 'done' | 'planned';

export type CalendarCell = {
  date: string;
  day: number;
  /** 이번 달 밖(앞뒤 주 채우기)이면 false */
  inMonth: boolean;
  /** 플랜 기간 안인지. 시작 전 날짜를 '휴식'이라고 부르면 거짓말이 된다 */
  inPlan: boolean;
  isToday: boolean;
  status: CalendarStatus;
  /** 롱런은 따로 표시한다. 그 주의 기둥이 되는 세션이라 눈에 띄어야 한다 */
  isLong: boolean;
  distanceKm: number;
  /** 'Long Run' 같은 짧은 라벨. 세션이 없으면 없다 */
  title?: string;
  /** '2km 워밍업 + …' */
  structure?: string;
  /** 목표 페이스 존 */
  zone?: string;
};

/** 'YYYY-MM' */
export type MonthKey = string;

export function monthKeyOf(iso: string): MonthKey {
  return iso.slice(0, 7);
}

/** 플랜이 걸쳐 있는 달 목록 (오름차순) */
export function planMonths(plan: Plan): MonthKey[] {
  const first = plan.weeks[0]?.startDate;
  const last = plan.input.raceDate;
  if (!first) return [];
  const months: MonthKey[] = [];
  let cursor = `${monthKeyOf(first)}-01`;
  const end = monthKeyOf(last);
  while (monthKeyOf(cursor) <= end) {
    months.push(monthKeyOf(cursor));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

/**
 * 달력 격자. 일요일 시작으로 앞뒤를 채워 항상 7의 배수로 낸다.
 * 칸 수가 주마다 달라지면 그리드가 흔들려서 읽기 어렵다.
 */
export function monthGrid(plan: Plan, month: MonthKey, today: string): CalendarCell[] {
  const sessions = new Map(allSessions(plan).map((s) => [s.date, s]));
  const planStart = planStartDate(plan);
  const planEnd = plan.input.raceDate;
  const firstOfMonth = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(year(month), monthIndex(month) + 1, 0)).getUTCDate();
  const leading = new Date(`${firstOfMonth}T00:00:00Z`).getUTCDay();

  const start = addDays(firstOfMonth, -leading);
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;

  return Array.from({ length: total }, (_, i) => {
    const date = addDays(start, i);
    const session = sessions.get(date);
    return {
      date,
      day: Number(date.slice(8, 10)),
      inMonth: date.slice(0, 7) === month,
      inPlan: date >= planStart && date <= planEnd,
      isToday: date === today,
      status: !session ? 'none' : date < today ? 'done' : 'planned',
      isLong: session?.type === 'long' || session?.type === 'race',
      distanceKm: session?.distanceKm ?? 0,
      ...(session ? { title: TYPE_SHORT[session.type], zone: session.targetZone } : {}),
      ...(session?.structure ? { structure: session.structure } : {}),
    } satisfies CalendarCell;
  });
}

/** 한 달 요약 — 캘린더 위에 붙는 숫자 */
export function monthSummary(
  plan: Plan,
  month: MonthKey,
  today: string,
): { doneCount: number; plannedCount: number; doneKm: number; plannedKm: number } {
  const inMonth = allSessions(plan).filter((s) => s.date.slice(0, 7) === month);
  const done = inMonth.filter((s) => s.date < today);
  return {
    doneCount: done.length,
    plannedCount: inMonth.length,
    doneKm: round1(done.reduce((sum, s) => sum + s.distanceKm, 0)),
    plannedKm: round1(inMonth.reduce((sum, s) => sum + s.distanceKm, 0)),
  };
}

export const DOW_LABELS = DOW;

// ── 날짜 유틸 ──────────────────────────────────────────────────────────

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function year(month: MonthKey): number {
  return Number(month.slice(0, 4));
}

function monthIndex(month: MonthKey): number {
  return Number(month.slice(5, 7)) - 1;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
