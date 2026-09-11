import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { upcomingRaces, type Race } from '@runback/races';
import { ButtonLink } from '@/components/ui/button';
import { RaceCalendar, type CalendarRace } from '@/components/races/race-calendar';
import { SITE_NAME } from '@/lib/config';
import { distanceLabel, formatDday, todayKst } from '@/lib/format';
import { monthLabel, monthOf, monthRange } from '@/lib/month-grid';
import { daysBetween } from '@/lib/plan-view';

export const metadata: Metadata = {
  title: '국내 마라톤 대회 일정',
  description:
    '앞으로 열리는 국내 마라톤·러닝 대회 일정을 달력으로 모았습니다. 대회를 고르면 그날까지 역산한 주차별 훈련 플랜을 만들어 드립니다.',
  alternates: { canonical: '/race' },
};

// 지난 대회가 매일 빠진다
export const revalidate = 3600;

/**
 * 전체 대회 목록 — 공개 라우트.
 *
 * 앱 셸(대회 탭)이 아니라 여기 두는 이유:
 *  1. 이건 검색으로 들어오는 사람이 보는 화면이다. 하단 탭은 그들에게 소음이다
 *  2. 로그인 사용자의 '대회 탭'은 브라우징이 아니라 **내 목표 관리**여야 한다
 *
 * **화면이 두 겹이다.**
 *  - 위: 달력. 사람이 실제로 쓰는 부분. 국내 대회가 봄·가을에 몰려 있어서
 *    "언제가 붐비는가"가 대회를 고를 때 쓰는 정보다. 82개를 날짜순으로 늘어놓으면 그게 안 읽힌다
 *  - 아래: 월별 전체 목록. **크롤러가 16개 상세로 들어가는 링크가 여기 있다.**
 *    달력만 두면 한 번에 한 달치 링크만 HTML 에 남아 §13 SEO 전략이 무너진다.
 *    JS 가 꺼져 있어도 이쪽은 그대로 동작한다
 *
 * ⚠️ 고유 콘텐츠(코스·날씨)가 없는 대회는 상세 페이지로 보내지 않고 바로 플랜 생성으로 보낸다.
 * 빈 페이지를 크롤러에게 82개 물려 주면 저품질 대량생성으로 판정될 수 있다 (§13.2).
 */
export default function RaceIndexPage() {
  const today = todayKst();
  const races = upcomingRaces(today);
  const months = groupByMonth(races);

  return (
    <div className="space-y-8 pt-2">
      <header>
        <h1 className="text-title leading-tight font-extrabold tracking-tight text-ink">
          국내 마라톤 대회 일정
        </h1>
        <p className="mt-2 text-body leading-relaxed text-ink-muted">
          앞으로 열리는 대회 {races.length}개입니다. 날짜를 누르면 그날 대회가 아래에 나옵니다.
          대회를 고르면 그날까지 남은 주를 역산해 주차별 훈련 플랜을 만들어 드립니다.
        </p>
      </header>

      {races.length > 0 ? (
        <RaceCalendar
          months={monthRange(monthOf(today), monthOf(races[races.length - 1]!.date))}
          initialMonth={monthOf(today)}
          racesByDate={indexByDate(races, today)}
          today={today}
        />
      ) : null}

      {/*
        전체 일정 — 크롤러가 §13.1 SSG 16개로 들어가는 링크 그래프이자 JS 없는 사용자의 경로다.

        **한 줄짜리 색인으로 둔다.** 위 달력 목록과 같은 3줄 카드로 그리면 같은 것이 두 번
        보여서 어느 쪽이 주인공인지 안 읽힌다. 모양이 달라야 '색인'으로 읽힌다.
        종목(5K·10K·하프)은 뺐다 — 82번 반복되는 일반 명사라 색인에서 하는 일이 없고,
        지역은 검색어라 남긴다.
      */}
      <section>
        <h2 className="text-section font-bold text-ink">전체 일정</h2>
        <p className="mt-1 text-label text-ink-muted">
          다가오는 대회 {races.length}개 전부입니다. 달력에서 못 찾았다면 여기서 찾으세요.
        </p>
        <div className="mt-3 space-y-5">
          {months.map(([month, list]) => (
            <section key={month}>
              <h3 className="text-label font-bold tracking-[0.06em] text-brand-ink">
                {monthLabel(month)}
              </h3>
              <ul className="mt-1 divide-y divide-line">
                {list.map((race) => (
                  <li key={race.slug}>
                    <Link
                      href={hrefFor(race)}
                      className="pressable -mx-2 flex min-h-touch items-center gap-2 rounded-lg px-2 hover:bg-surface-sunken/50"
                    >
                      <span className="tabular w-[4.5rem] shrink-0 text-label font-semibold text-ink-muted">
                        {shortDate(race.date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body text-ink">
                        {race.nameKo}
                        <span className="text-ink-muted"> · {race.region}</span>
                        {race.status === 'uncertain' ? (
                          <span className="ml-1.5 rounded-full bg-surface-sunken px-1.5 py-0.5 align-middle text-micro font-semibold text-ink-muted">
                            미확정
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular shrink-0 text-label font-bold text-brand-ink">
                        {formatDday(daysBetween(today, race.date))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface px-5 py-6 text-center">
        <p className="text-body-lg font-bold text-ink">찾는 대회가 없나요?</p>
        <p className="mt-1 text-body text-ink-muted">날짜를 직접 넣어도 플랜을 만들 수 있습니다.</p>
        <div className="mt-4">
          <ButtonLink href="/plan/new" size="md">
            날짜 직접 입력하기
          </ButtonLink>
        </div>
      </section>

      <p className="text-micro leading-relaxed text-ink-muted">
        {SITE_NAME}의 대회 정보는 사람이 직접 확인해 올립니다. 참가 신청과 최종 일정은 반드시 각 대회
        공식 사이트에서 다시 확인해 주세요.
      </p>
    </div>
  );
}

/**
 * 고유 콘텐츠가 있으면 상세로, 없으면 플랜 생성으로 (§13.2).
 * 이 분기가 저품질 대량생성 방어의 실체라 **한 곳에만** 둔다.
 */
function hrefFor(race: Race): Route {
  const detailed = Boolean(race.courseNote || race.weatherNote);
  return (detailed ? `/race/${race.slug}` : `/plan/new?race=${race.slug}`) as Route;
}

/** 달력이 칸마다 찾아 쓸 수 있게 날짜로 색인한다 */
function indexByDate(races: Race[], today: string): Record<string, CalendarRace[]> {
  const out: Record<string, CalendarRace[]> = {};
  for (const race of races) {
    (out[race.date] ??= []).push({
      slug: race.slug,
      nameKo: race.nameKo,
      date: race.date,
      region: race.region,
      distances: race.distances.map(distanceLabel).join(' · '),
      dday: formatDday(daysBetween(today, race.date)),
      uncertain: race.status === 'uncertain',
      href: hrefFor(race),
    });
  }
  return out;
}

/** 'YYYY-MM' 오름차순 그룹 */
function groupByMonth(races: Race[]): [string, Race[]][] {
  const map = new Map<string, Race[]>();
  for (const race of [...races].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = race.date.slice(0, 7);
    const bucket = map.get(key);
    if (bucket) bucket.push(race);
    else map.set(key, [race]);
  }
  return [...map.entries()];
}

/** '2026-11-15' → '11/15 (일)'. 색인 줄은 폭이 빠듯해 짧게 쓴다 */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${dow})`;
}
