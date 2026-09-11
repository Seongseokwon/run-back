/**
 * 엔진이 낸 Plan 을 화면이 쓰기 좋은 모양으로 바꾸는 어댑터.
 *
 * 여기서 숫자를 만들지 않는다. 고르고, 라벨을 붙이고, 포맷할 뿐이다.
 * 계산이 필요하면 엔진에 넣는다 (PRD §7.9 와 같은 원칙 — 경계를 흐리지 않는다).
 */

import type { Plan, PlanSession, PlanWeek, SessionType } from '@runback/engine';
import { monthDays, type MonthKey } from './month-grid.ts';
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

/** 달력 열 머리 — 월요일 시작 */
/*
 * 달력의 뼈대(월요일 시작·앞뒤 채우기·월 이름)는 `month-grid.ts` 한 곳에 있다.
 * 훈련 달력과 대회 달력이 같은 규칙을 써야 해서 여기서는 다시 내보내기만 한다.
 */
export { DOW_MON_FIRST, monthLabel } from './month-grid.ts';
export type { MonthKey } from './month-grid.ts';

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
/**
 * 날짜 → 그날의 수행 기록 (F-12).
 *
 * `plan-view` 는 저장소를 모른다. 화면이 읽어 온 것을 넘겨줄 뿐이다 —
 * 그래야 이 파일이 계속 순수 함수로 남고 테스트가 쉽다.
 */
export type LogIndex = ReadonlyMap<string, { status: 'done' | 'skipped' | 'modified' }>;

/** 비어 있는 기록. 로그가 없는 화면(게스트 등)이 쓴다 */
export const NO_LOGS: LogIndex = new Map();

/**
 * '완료'의 정의. `modified` 도 완료로 친다 — 계획을 조금 바꿔서라도 뛴 것은 뛴 것이다.
 * `skipped` 만 완료가 아니다.
 *
 * ⚠️ **날짜가 지났다고 완료가 아니다.** 예전엔 그렇게 셌는데(O17), 그러면
 * 일주일을 통째로 쉰 사람에게도 진행률이 올라가서 화면이 거짓말을 한다.
 */
export function isCompleted(log: { status: string } | undefined): boolean {
  return log !== undefined && log.status !== 'skipped';
}

export function allSessions(plan: Plan): PlanSession[] {
  return plan.weeks.flatMap((w) => w.sessions);
}

/**
 * 세션 진행 — 목업의 `12 / 15 sessions`.
 *
 * 날짜 비율이 아니라 **세션 수**로 센다. 러너가 체감하는 단위가 '며칠 지났나'가
 * 아니라 '몇 번 뛰었나'이기 때문이다.
 *
 * 완료 판정은 **실제 수행 기록**이다 (F-12, O17 종결).
 */
export function sessionProgress(
  plan: Plan,
  logs: LogIndex,
): { done: number; total: number; ratio: number } {
  const sessions = allSessions(plan).filter((s) => s.type !== 'race');
  const done = sessions.filter((s) => isCompleted(logs.get(s.date))).length;
  return { done, total: sessions.length, ratio: sessions.length === 0 ? 0 : done / sessions.length };
}

/** 플랜 전체 진행률 0~1. 세션 완료 수 기준 */
export function planProgress(plan: Plan, logs: LogIndex): number {
  return sessionProgress(plan, logs).ratio;
}

/** 한 주를 요일 7칸으로 펴서 목록에 넣는다. 세션이 없는 날은 휴식 */
export function weekItems(week: PlanWeek, today: string, logs: LogIndex): WeekItem[] {
  const items: WeekItem[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(week.startDate, i);
    const session = week.sessions.find((s) => s.date === date);
    const log = logs.get(date);
    // 기록이 있으면 그게 이긴다. 없으면 지난 날은 '놓친 것'이지 완료가 아니다
    const status: RowStatus = !session
      ? 'rest'
      : log
        ? log.status === 'skipped'
          ? 'skipped'
          : 'done'
        : date < today
          ? 'missed'
          : 'todo';
    items.push({
      date,
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
export type CalendarStatus = 'none' | 'done' | 'planned' | 'missed' | 'skipped';

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
 * 달력 격자. **월요일 시작**으로 앞뒤를 채워 항상 7의 배수로 낸다.
 * 칸 수가 주마다 달라지면 그리드가 흔들려서 읽기 어렵다.
 *
 * 월요일 시작인 이유: 엔진이 주차를 월요일부터 끊는다(`week.startDate`).
 * 달력이 일요일부터 시작하면 한 훈련 주차가 두 줄에 걸쳐 보여서 주간 볼륨이 읽히지 않는다.
 */
export function monthGrid(
  plan: Plan,
  month: MonthKey,
  today: string,
  logs: LogIndex,
): CalendarCell[] {
  const sessions = new Map(allSessions(plan).map((s) => [s.date, s]));
  const planStart = planStartDate(plan);
  const planEnd = plan.input.raceDate;

  return monthDays(month).map(({ date, day, inMonth }) => {
    const session = sessions.get(date);
    return {
      date,
      day,
      inMonth,
      inPlan: date >= planStart && date <= planEnd,
      isToday: date === today,
      status: calendarStatus(session, date, today, logs),
      isLong: session?.type === 'long' || session?.type === 'race',
      distanceKm: session?.distanceKm ?? 0,
      ...(session ? { title: TYPE_SHORT[session.type], zone: session.targetZone } : {}),
      ...(session?.structure ? { structure: session.structure } : {}),
    } satisfies CalendarCell;
  });
}

function calendarStatus(
  session: PlanSession | undefined,
  date: string,
  today: string,
  logs: LogIndex,
): CalendarStatus {
  if (!session) return 'none';
  const log = logs.get(date);
  if (log) return log.status === 'skipped' ? 'skipped' : 'done';
  return date < today ? 'missed' : 'planned';
}

/** 한 달 요약 — 캘린더 위에 붙는 숫자. '완료'는 실제 기록 기준이다 */
export function monthSummary(
  plan: Plan,
  month: MonthKey,
  logs: LogIndex,
): { doneCount: number; plannedCount: number; doneKm: number; plannedKm: number } {
  const inMonth = allSessions(plan).filter((s) => s.date.slice(0, 7) === month);
  const done = inMonth.filter((s) => isCompleted(logs.get(s.date)));
  return {
    doneCount: done.length,
    plannedCount: inMonth.length,
    doneKm: round1(done.reduce((sum, s) => sum + s.distanceKm, 0)),
    plannedKm: round1(inMonth.reduce((sum, s) => sum + s.distanceKm, 0)),
  };
}

/**
 * 최근 러닝 (F-12). **실제로 기록을 남긴 세션만** 나온다 —
 * 지나간 계획을 뛴 것처럼 보여 주지 않는다 (CLAUDE.md §0-3).
 */
export type RecentRun = {
  date: string;
  title: string;
  plannedKm: number;
  zone: string;
  status: 'done' | 'skipped' | 'modified';
};

export function recentRuns(plan: Plan, logs: LogIndex, limit = 5): RecentRun[] {
  const byDate = new Map(allSessions(plan).map((s) => [s.date, s]));
  return [...logs.entries()]
    .filter(([date]) => byDate.has(date))
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, limit)
    .map(([date, log]) => {
      const s = byDate.get(date)!;
      return {
        date,
        title: TYPE_SHORT[s.type],
        plannedKm: s.distanceKm,
        zone: s.targetZone,
        status: log.status,
      };
    });
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
