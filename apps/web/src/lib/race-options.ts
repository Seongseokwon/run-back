/**
 * 클라이언트로 넘길 대회 목록. 필요한 필드만 추린다.
 * 82개 전체를 그대로 보내면 courseNote 같은 긴 문자열까지 번들에 실린다.
 */

import { upcomingRaces } from '@runback/races';

export type RaceOption = {
  slug: string;
  nameKo: string;
  date: string;
  region: string;
  /** 표준 종목만 (5 / 10 / 하프 / 풀) */
  distances: number[];
  /** 개최가 불투명하면 선택 시 경고를 띄운다 */
  uncertain: boolean;
};

const STANDARD = [5, 10, 21.0975, 42.195];

export function raceOptions(today: string): RaceOption[] {
  return upcomingRaces(today).map((race) => ({
    slug: race.slug,
    nameKo: race.nameKo,
    date: race.date,
    region: race.region,
    distances: race.distances.filter((d) => STANDARD.includes(d)),
    uncertain: race.status === 'uncertain',
  }));
}
