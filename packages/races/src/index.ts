/**
 * @runback/races — 국내 대회 큐레이션 데이터
 *
 * PRD §11.1: 50개 규모라 DB에 넣지 않는다. JSON 파일을 빌드 타임에 읽는다.
 * PRD §12: 수동 큐레이션. 크롤링하지 않는다 — 데이터 품질이 곧 SEO 신뢰도이고
 *          50개 규모에서 자동화 ROI가 없다.
 */

import racesData from '../data/races.json' with { type: 'json' };
import type { Race } from './types.ts';

export * from './types.ts';
export * from './validate.ts';

export const races: readonly Race[] = racesData as Race[];

export function findRace(slug: string): Race | undefined {
  return races.find((r) => r.slug === slug);
}

/** 오늘 이후 대회만, 날짜 오름차순 */
export function upcomingRaces(today: string): Race[] {
  return races.filter((r) => r.date >= today);
}

/**
 * 정적 SEO 페이지를 만들 대회 — PRD §13.2 제한 규칙 2.
 * 차별화 콘텐츠가 없는 대회는 페이지를 만들지 않는다. 템플릿에 숫자만 바꾼
 * 페이지를 대량으로 뿌리면 사이트 전체가 저품질로 판정될 수 있다.
 */
export function seoReadyRaces(today: string): Race[] {
  return upcomingRaces(today).filter((r) => Boolean(r.courseNote || r.weatherNote));
}

/** 특정 종목을 운영하는 대회 */
export function racesWithDistance(distanceKm: number, today: string): Race[] {
  return upcomingRaces(today).filter((r) => r.distances.includes(distanceKm));
}

/** 대회명·지역 부분 일치 검색 (F-01 자동완성용) */
export function searchRaces(query: string, today: string, limit = 10): Race[] {
  const q = query.trim().toLowerCase();
  if (!q) return upcomingRaces(today).slice(0, limit);
  return upcomingRaces(today)
    .filter((r) => r.nameKo.toLowerCase().includes(q) || r.region.toLowerCase().includes(q))
    .slice(0, limit);
}

/** D-day. 음수면 이미 지난 대회 */
export function daysUntil(race: Race, today: string): number {
  const a = new Date(`${today}T00:00:00Z`).getTime();
  const b = new Date(`${race.date}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}
