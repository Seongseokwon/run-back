import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findRace, seoReadyRaces } from '@raceback/races';
import { ButtonLink } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { Illustration } from '@/components/ui/illustration';
import { SITE_NAME, SITE_URL } from '@/lib/config';
import { distanceLabel, formatCutoff, formatDday, formatRaceDate, splitRegion, todayKst } from '@/lib/format';
import { daysBetween } from '@/lib/plan-view';

/**
 * 대회 페이지 — SEO 주 진입점 (PRD §10.2, §13.1).
 *
 * ⚠️ 정적 생성 대상은 `races` 전체가 아니라 `seoReadyRaces` 다.
 * 코스·날씨 같은 고유 콘텐츠가 없는 대회로 페이지를 찍어내면 저품질 대량생성으로
 * 판정될 수 있고, 그러면 사이트 전체가 죽는다 (§13.2).
 */
export function generateStaticParams() {
  return seoReadyRaces(todayKst()).map((race) => ({ slug: race.slug }));
}

export const dynamicParams = true;
// D-day 표시 때문에 하루 단위로는 갱신돼야 한다 (PRD §11.1 SSG/ISR)
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const race = findRace(slug);
  if (!race) return {};
  return {
    title: `${race.nameKo} 훈련 플랜`,
    description: `${race.nameKo}(${formatRaceDate(race.date)}, ${race.region})까지 남은 기간을 역산한 주차별 훈련 플랜을 만들어 드립니다.`,
    alternates: { canonical: `/race/${race.slug}` },
  };
}

export default async function RacePage({ params }: Props) {
  const { slug } = await params;
  const race = findRace(slug);
  if (!race) notFound();

  const today = todayKst();
  const daysLeft = daysBetween(today, race.date);
  const standard = race.distances.filter((d) => [5, 10, 21.0975, 42.195].includes(d));
  const addr = splitRegion(race.region);

  // §13.3 구조화 데이터
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.nameKo,
    startDate: race.date,
    location: {
      '@type': 'Place',
      name: race.region,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: addr.region,
        ...(addr.locality ? { addressLocality: addr.locality } : {}),
      },
    },
    sport: 'Running',
    ...(race.officialUrl ? { url: race.officialUrl } : {}),
    organizer: { '@type': 'Organization', name: race.nameKo },
  };

  return (
    <div className="space-y-7 pt-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-ink">
          {race.nameKo}
        </h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          {formatRaceDate(race.date)} · {race.region}
        </p>
        <p className="tabular mt-3 text-[44px] leading-none font-extrabold text-brand-ink">
          {formatDday(daysLeft)}
        </p>
      </section>

      {race.status === 'uncertain' && race.statusNote ? (
        <p className="rounded-control border border-line-strong bg-surface-sunken px-4 py-3 text-[14px] leading-relaxed text-ink">
          ⚠️ {race.statusNote}
        </p>
      ) : null}

      {/* 이 대회만의 콘텐츠. 자동생성 페이지가 아니라는 신호이자 실제 훈련 정보다 (§12) */}
      {race.courseNote || race.weatherNote ? (
        <Card className="space-y-3 px-5 py-5">
          <SectionLabel>코스와 날씨</SectionLabel>
          {race.courseNote ? <p className="text-[15px] leading-relaxed text-ink">{race.courseNote}</p> : null}
          {race.weatherNote ? (
            <p className="text-[15px] leading-relaxed text-ink-muted">{race.weatherNote}</p>
          ) : null}
          {race.cutoffHours ? (
            <p className="text-[14px] text-ink-muted">제한시간 {formatCutoff(race.cutoffHours)}</p>
          ) : null}
        </Card>
      ) : null}

      <section>
        <h2 className="text-[18px] font-bold text-ink">종목별 플랜 만들기</h2>
        <div className="mt-3 space-y-2">
          {standard.map((km) => (
            <ButtonLink
              key={km}
              href={`/plan/new?race=${race.slug}&distance=${km}`}
              variant="soft"
              size="md"
            >
              {distanceLabel(km)} 목표 플랜
            </ButtonLink>
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <Illustration name="raceScene" width={280} />
      </div>

      {/* 날짜 변경·취소 리스크 대응 — 출처와 확인일을 노출한다 (§12, §17 R5) */}
      <footer className="space-y-1 border-t border-line pt-4 text-[12px] text-ink-muted">
        <p>최종 확인 {race.updatedAt}</p>
        <p>
          대회 정보는 변경될 수 있습니다.{' '}
          <a href={race.officialUrl ?? race.sourceUrl} className="underline" rel="nofollow noopener" target="_blank">
            공식 안내 확인하기
          </a>
        </p>
        <p className="pt-2">
          {SITE_NAME} · {SITE_URL}
        </p>
      </footer>
    </div>
  );
}
