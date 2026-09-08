/**
 * 대회 데이터 검증 — 수동 큐레이션이라 사람이 실수한다. 그걸 잡는 게 이 파일이다.
 *
 * 검증은 런타임 import 시점이 아니라 테스트와 `npm run lint:races` 에서 돈다.
 * 빌드 타임에 한 번 걸러지면 충분하고, 페이지 렌더마다 돌 이유가 없다.
 */

import { STANDARD_DISTANCES_KM, type Race } from './types.ts';

export type Issue = {
  slug: string;
  field: string;
  message: string;
  /** error 는 빌드를 막고, warn 은 운영 점검 목록에 올린다 */
  level: 'error' | 'warn';
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** 데이터가 오래되면 대회 날짜가 바뀌어도 모른다 (§17 R5). 이 기간을 넘으면 경고 */
export const STALE_AFTER_DAYS = 45;
/** 대회 3개월 전부터는 격주 점검 (§12 운영 원칙) */
export const NEAR_RACE_DAYS = 90;
export const NEAR_RACE_STALE_AFTER_DAYS = 14;

export function validateRaces(races: readonly Race[], today: string): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, string>();
  const add = (slug: string, field: string, message: string, level: Issue['level'] = 'error'): void => {
    issues.push({ slug, field, message, level });
  };

  for (const race of races) {
    const { slug } = race;

    if (!SLUG.test(slug)) add(slug, 'slug', 'kebab-case 소문자 영숫자만 허용된다');
    if (seen.has(slug)) add(slug, 'slug', `중복된 slug (${seen.get(slug)} 와 충돌)`);
    seen.set(slug, race.nameKo);

    if (!race.nameKo.trim()) add(slug, 'nameKo', '대회명이 비었다');
    if (!isValidDate(race.date)) add(slug, 'date', `날짜 형식이 잘못됐다: ${race.date}`);
    if (!isValidDate(race.updatedAt)) add(slug, 'updatedAt', `최종 확인일 형식이 잘못됐다: ${race.updatedAt}`);
    if (!race.region.trim()) add(slug, 'region', '지역이 비었다');

    // 종목 — PRD §12 선정 기준 3
    const std = race.distances.filter((d) => (STANDARD_DISTANCES_KM as readonly number[]).includes(d));
    if (race.distances.length < 2) add(slug, 'distances', '2종목 이상 운영하는 대회만 넣는다');
    if (std.length === 0) add(slug, 'distances', '표준 종목(5·10·하프·풀)이 하나도 없다');
    if (race.distances.some((d) => !(d > 0))) add(slug, 'distances', '거리는 0보다 커야 한다');
    if ([...race.distances].sort((a, b) => a - b).join() !== race.distances.join()) {
      add(slug, 'distances', '거리는 오름차순이어야 한다');
    }

    // 출처 — 없으면 데이터가 아니라 소문이다 (§12 운영 원칙)
    if (!/^https?:\/\//.test(race.sourceUrl)) add(slug, 'sourceUrl', '출처 URL이 없거나 형식이 잘못됐다');
    if (race.officialUrl !== undefined && !/^https?:\/\//.test(race.officialUrl)) {
      add(slug, 'officialUrl', '공식 URL 형식이 잘못됐다');
    }

    if (race.status === 'uncertain' && !race.statusNote) {
      add(slug, 'statusNote', '개최가 불투명하면 사용자에게 보여줄 설명이 있어야 한다');
    }
    if (race.cutoffHours !== undefined && !(race.cutoffHours > 0 && race.cutoffHours <= 12)) {
      add(slug, 'cutoffHours', `제한시간이 비현실적이다: ${race.cutoffHours}`);
    }
    for (const [field, max] of [['courseNote', 120], ['weatherNote', 120]] as const) {
      const v = race[field];
      if (v !== undefined && (v.trim().length < 10 || v.length > max)) {
        add(slug, field, `${field} 는 10~${max}자여야 한다 (현재 ${v.length}자)`);
      }
    }

    // ── 경고: 빌드를 막지는 않지만 운영이 손봐야 하는 것들 ──
    if (race.date < today) add(slug, 'date', '이미 지난 대회다. 데이터에서 내리거나 다음 회차로 갱신할 것', 'warn');
    if (!race.courseNote && !race.weatherNote) {
      add(slug, 'courseNote', '차별화 콘텐츠가 없어 SEO 페이지를 만들 수 없다 (§13.2)', 'warn');
    }
    if (race.confidence === 'low') {
      add(slug, 'confidence', '단일 2차 출처. 사람이 공식 사이트로 확인할 것', 'warn');
    }

    const staleDays = daysBetween(race.updatedAt, today);
    const daysToRace = daysBetween(today, race.date);
    const limit = daysToRace <= NEAR_RACE_DAYS ? NEAR_RACE_STALE_AFTER_DAYS : STALE_AFTER_DAYS;
    if (staleDays > limit) {
      add(slug, 'updatedAt', `${staleDays}일째 미점검 (기준 ${limit}일). 대회가 가까울수록 자주 본다`, 'warn');
    }
  }

  return issues;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function errorsOnly(issues: readonly Issue[]): Issue[] {
  return issues.filter((i) => i.level === 'error');
}
