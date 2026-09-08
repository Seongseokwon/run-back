/**
 * 표시용 포맷터.
 * 계산은 전부 엔진이 한다. 여기서는 엔진이 낸 숫자를 사람이 읽는 형태로만 바꾼다.
 */

import { formatDuration, formatPace } from '@raceback/engine';

export { formatDuration, formatPace };

/** '2026-11-15' → '11월 15일 (일)' */
export function formatRaceDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${dow})`;
}

/** D-38 / D-DAY / 종료 */
export function formatDday(days: number): string {
  if (days === 0) return 'D-DAY';
  return days > 0 ? `D-${days}` : '종료';
}

/** 21.0975 → '하프' */
export function distanceLabel(km: number): string {
  if (km === 42.195) return '풀코스';
  if (km === 21.0975) return '하프';
  return `${Number.isInteger(km) ? km : km.toFixed(1)}K`;
}

/** 5.5 → '5시간 30분' */
export function formatCutoff(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** '강원 춘천시' → { region: '강원', locality: '춘천시' } — 구조화 데이터 주소용 */
export function splitRegion(value: string): { region: string; locality?: string } {
  const [region, ...rest] = value.split(' ');
  const locality = rest.join(' ');
  return locality ? { region: region!, locality } : { region: region! };
}

/** 오늘 날짜 (KST). 엔진은 현재 시각을 읽지 않으므로 여기서 넣어 준다 */
export function todayKst(): string {
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}
