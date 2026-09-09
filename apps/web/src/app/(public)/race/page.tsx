import type { Metadata } from 'next';
import Link from 'next/link';
import { upcomingRaces, type Race } from '@raceback/races';
import { ButtonLink } from '@/components/ui/button';
import { SITE_NAME } from '@/lib/config';
import { distanceLabel, formatDday, formatRaceDate, todayKst } from '@/lib/format';
import { daysBetween } from '@/lib/plan-view';

export const metadata: Metadata = {
  title: '국내 마라톤 대회 일정',
  description:
    '앞으로 열리는 국내 마라톤·러닝 대회 일정을 날짜순으로 모았습니다. 대회를 고르면 그날까지 역산한 주차별 훈련 플랜을 만들어 드립니다.',
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
 * ⚠️ 고유 콘텐츠(코스·날씨)가 없는 대회는 상세 페이지로 보내지 않고 바로 플랜 생성으로 보낸다.
 * 빈 페이지를 크롤러에게 82개 물려 주면 저품질 대량생성으로 판정될 수 있다 (§13.2).
 */
export default function RaceIndexPage() {
  const today = todayKst();
  const races = upcomingRaces(today);
  const months = groupByMonth(races);

  return (
    <div className="space-y-6 pt-2">
      <header>
        <h1 className="text-title leading-tight font-extrabold tracking-tight text-ink">
          국내 마라톤 대회 일정
        </h1>
        <p className="mt-2 text-body leading-relaxed text-ink-muted">
          앞으로 열리는 대회 {races.length}개입니다. 대회를 고르면 그날까지 남은 주를 역산해
          주차별 훈련 플랜을 만들어 드립니다.
        </p>
      </header>

      {months.map(([month, list]) => (
        <section key={month}>
          <h2 className="text-section font-bold text-ink">{monthLabel(month)}</h2>
          <ul className="mt-1 divide-y divide-line">
            {list.map((race) => {
              const detailed = Boolean(race.courseNote || race.weatherNote);
              return (
                <li key={race.slug}>
                  <Link
                    href={detailed ? `/race/${race.slug}` : `/plan/new?race=${race.slug}`}
                    className="pressable -mx-2 flex min-h-touch items-center gap-3 rounded-lg px-2 py-4 hover:bg-surface-sunken/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-bold text-ink">
                        {race.nameKo}
                        {race.status === 'uncertain' ? (
                          <span className="ml-2 rounded-full bg-surface-sunken px-2 py-0.5 align-middle text-micro font-semibold text-ink-muted">
                            개최 미확정
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-label text-ink-muted">
                        {formatRaceDate(race.date)} · {race.region}
                      </p>
                      <p className="mt-1 text-label text-ink-muted">
                        {race.distances.map(distanceLabel).join(' · ')}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-body font-bold text-brand-ink">
                      {formatDday(daysBetween(today, race.date))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

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

function monthLabel(month: string): string {
  return `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`;
}
