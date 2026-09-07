/**
 * 날짜 유틸 — 대회일에서 역산한다.
 *
 * 이 서비스의 정체성이 "역산"이므로 주차 경계를 월요일이 아니라 **대회일에 맞춘다.**
 * 마지막 주는 항상 대회일로 끝난다. 사용자가 세는 D-day 와 플랜의 주차가 어긋나지 않는다.
 *
 * 모든 계산은 UTC 자정 기준으로 한다. 입력이 KST 날짜(YYYY-MM-DD)이고 시각이 없으므로
 * 타임존 보정이 필요 없고, 서머타임 없는 KST 특성상 안전하다.
 */

const MS_PER_DAY = 86_400_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(iso: string): Date {
  if (!ISO_DATE.test(iso)) throw new RangeError(`날짜는 YYYY-MM-DD 형식이어야 합니다: ${iso}`);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new RangeError(`해석할 수 없는 날짜입니다: ${iso}`);
  return d;
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return formatDate(new Date(parseDate(iso).getTime() + days * MS_PER_DAY));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDate(toIso).getTime() - parseDate(fromIso).getTime()) / MS_PER_DAY);
}

/** 0=일 … 6=토 */
export function dayOfWeek(iso: string): number {
  return parseDate(iso).getUTCDay();
}

/** PRD §7.1 — weeksAvailable = floor((raceDate - today) / 7) */
export function weeksAvailable(todayIso: string, raceDateIso: string): number {
  return Math.floor(daysBetween(todayIso, raceDateIso) / 7);
}

/**
 * 주차 i 의 시작일. 마지막 주(i = totalWeeks-1)가 대회일로 끝나도록 역산한다.
 * 각 주는 7일이며 [startDate, startDate+6] 이다.
 */
export function weekStartDate(raceDateIso: string, totalWeeks: number, index: number): string {
  const fromEnd = totalWeeks - 1 - index;
  return addDays(raceDateIso, -(fromEnd * 7) - 6);
}

/**
 * 주차 시작일이 주어졌을 때, 원하는 요일(0=일)이 그 주 안에서 며칠째인지.
 * 반환값은 0~6 오프셋.
 */
export function offsetForDayOfWeek(weekStartIso: string, targetDow: number): number {
  const startDow = dayOfWeek(weekStartIso);
  return (targetDow - startDow + 7) % 7;
}
