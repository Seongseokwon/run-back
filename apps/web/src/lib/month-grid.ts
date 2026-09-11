/**
 * 월 격자의 날짜 계산 — 화면이 무엇을 그리든 **달력의 뼈대는 하나**다.
 *
 * 훈련 달력(`/log`)과 대회 달력(`/race`)이 서로 다른 것을 칸에 넣지만,
 * "월요일에서 시작하고 앞뒤 주를 채운다"는 규칙은 같다. 두 번 쓰면 한쪽만 고쳐지고,
 * 그러면 **같은 제품 안에서 달력 두 개가 다른 요일에서 시작한다.**
 *
 * 월요일 시작인 이유: 엔진이 주차를 월요일부터 끊는다(`week.startDate`).
 * 일요일 시작이면 한 훈련 주차가 두 줄에 걸쳐 보여서 주간 볼륨이 읽히지 않는다.
 */

/** 'YYYY-MM' */
export type MonthKey = string;

export const DOW_MON_FIRST = ['월', '화', '수', '목', '금', '토', '일'] as const;

/**
 * '2026-09' → '2026년 9월'.
 *
 * 한때 목업을 따라 'September 2026' 이었는데, **요일은 이미 한글(월·화·수)** 이라
 * 한 달력 안에서 표기가 섞였다. `/race` 는 한국어 검색으로 들어오는 공개 페이지라
 * 영문 머리글 바로 아래에 '11월 대회 21개'가 오는 모양이 됐다.
 */
export function monthLabel(month: MonthKey): string {
  return `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`;
}

/** '2026-09' → '9월'. 달력 머리글이 이미 연도를 들고 있는 자리용 */
export function monthLabelKo(month: MonthKey): string {
  return `${Number(month.slice(5, 7))}월`;
}

export function monthOf(iso: string): MonthKey {
  return iso.slice(0, 7);
}

export function addMonthsToKey(month: MonthKey, delta: number): MonthKey {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

/** from 부터 to 까지의 월 키 (양끝 포함). 달력의 이동 범위가 된다 */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = from; m <= to; m = addMonthsToKey(m, 1)) out.push(m);
  return out;
}

export type GridDay = {
  /** 'YYYY-MM-DD' */
  date: string;
  day: number;
  /** 이번 달 밖(앞뒤 주 채우기)이면 false */
  inMonth: boolean;
};

/**
 * 한 달의 격자. 항상 7의 배수 칸을 낸다.
 *
 * 앞뒤 주를 빈 칸이 아니라 **실제 날짜**로 채우는 이유: 호출부가 그 칸에
 * 무엇을 그릴지(비우든, 흐리게 쓰든) 고를 수 있어야 한다.
 */
export function monthDays(month: MonthKey): GridDay[] {
  const first = `${month}-01`;
  const y = Number(month.slice(0, 4));
  const mi = Number(month.slice(5, 7)) - 1;
  const daysInMonth = new Date(Date.UTC(y, mi + 1, 0)).getUTCDate();

  // 월요일=0 이 되도록 민다 (getUTCDay 는 일요일=0)
  const leading = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;

  const start = new Date(`${first}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - leading);

  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    return { date, day: d.getUTCDate(), inMonth: date.slice(0, 7) === month };
  });
}

/** 격자를 주 단위로 자른다. 괘선을 주마다 긋기 위해서다 */
export function toWeeks<T>(cells: T[]): T[][] {
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}
