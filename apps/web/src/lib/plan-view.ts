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

/**
 * 플랜 전체 진행률 0~1. 지난 날짜 비율로 계산한다.
 * 수행 로그가 붙으면(2차 로드맵) 완료 세션 기준으로 바꾼다.
 */
export function planProgress(plan: Plan, today: string): number {
  const start = plan.weeks[0]!.startDate;
  const end = plan.input.raceDate;
  const total = daysBetween(start, end);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, daysBetween(start, today) / total));
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

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}
