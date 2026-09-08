import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RACE_DISTANCE_M, paceTable, predictRaceTimeSec, vdotFromRace } from '@raceback/engine';
import { racesWithDistance } from '@raceback/races';
import { ButtonLink } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { PaceTable } from '@/components/plan/pace-table';
import { GOALS, findGoal } from '@/lib/goals';
import { SITE_NAME } from '@/lib/config';
import { distanceLabel, formatDday, formatDuration, formatPace, formatRaceDate, todayKst } from '@/lib/format';
import { daysBetween } from '@/lib/plan-view';

/**
 * 목표 기록별 페이지 — PRD §13.1.
 *
 * 문장은 손으로 쓰고(§13.2 규칙 3), 숫자는 전부 엔진에서 뽑는다.
 * "서브4에 필요한 페이스"를 사람이 적으면 언젠가 틀린다.
 */
export function generateStaticParams() {
  return GOALS.map((goal) => ({ slug: goal.slug }));
}

export const dynamicParams = false;
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const goal = findGoal(slug);
  if (!goal) return {};
  return {
    title: `${goal.label} 훈련 플랜`,
    description: goal.lead,
    alternates: { canonical: `/goal/${goal.slug}` },
  };
}

export default async function GoalPage({ params }: Props) {
  const { slug } = await params;
  const goal = findGoal(slug);
  if (!goal) notFound();

  const today = todayKst();
  const km = goal.distanceM / 1000;
  const requiredVdot = vdotFromRace(goal.distanceM, goal.targetSec).vdot;
  const paces = paceTable(requiredVdot);
  const goalPaceSec = goal.targetSec / km;

  // 이 목표를 달성하는 사람의 다른 거리 예상 기록. 자기 실력을 가늠하는 기준이 된다
  const equivalents = (Object.keys(RACE_DISTANCE_M) as (keyof typeof RACE_DISTANCE_M)[])
    .map((key) => ({ key, distanceM: RACE_DISTANCE_M[key] }))
    .filter((d) => d.distanceM !== goal.distanceM)
    .map((d) => ({ ...d, sec: predictRaceTimeSec(requiredVdot, d.distanceM) }));

  const races = racesWithDistance(km, today).slice(0, 5);

  // AEO — 질문과 직답을 구조화 데이터로도 준다 (§13.3)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: goal.question,
        acceptedAnswer: { '@type': 'Answer', text: goal.lead },
      },
    ],
  };

  return (
    <div className="space-y-7 pt-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-ink">{goal.question}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink">{goal.lead}</p>
      </section>

      <Card className="px-5 py-5">
        <SectionLabel>{goal.label}</SectionLabel>
        <div className="mt-3 flex items-baseline gap-3">
          <p className="tabular text-[34px] leading-none font-extrabold text-ink">
            {formatPace(goalPaceSec)}
          </p>
          <p className="text-[16px] font-semibold text-ink-muted">/km</p>
        </div>
        <p className="mt-2 text-[14px] text-ink-muted">
          {distanceLabel(km)}를 {formatDuration(goal.targetSec)}에 완주하는 페이스입니다
        </p>
      </Card>

      <section>
        <h2 className="text-[18px] font-bold text-ink">이 기록이면 다른 거리는</h2>
        <p className="mt-1 text-[14px] text-ink-muted">
          같은 실력으로 환산한 예상 기록입니다. 지금 자기 기록과 비교해 보세요.
        </p>
        <Card className="mt-3 divide-y divide-line px-5 py-1">
          {equivalents.map((e) => (
            <div key={e.key} className="flex items-baseline justify-between py-3">
              <span className="text-[15px] font-semibold text-ink">{distanceLabel(e.distanceM / 1000)}</span>
              <span className="tabular text-[17px] font-bold text-ink">{formatDuration(e.sec)}</span>
            </div>
          ))}
        </Card>
      </section>

      <section className="space-y-3">
        {goal.body.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-relaxed text-ink">
            {paragraph}
          </p>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-[18px] font-bold text-ink">이 목표의 훈련 페이스</h2>
        <PaceTable paces={paces} level="full" />
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          목표를 이미 달성한 상태 기준입니다. 지금 실력에 맞는 페이스는 플랜을 만들면 따로 계산해 드립니다.
        </p>
      </section>

      <ButtonLink href={`/plan/new?goal=${goal.slug}`}>내 대회로 플랜 만들기</ButtonLink>

      {/* 내부 링크로 크롤 경로를 만든다 (§13.1) */}
      {races.length > 0 ? (
        <section>
          <h2 className="text-[18px] font-bold text-ink">{distanceLabel(km)} 종목이 있는 대회</h2>
          <ul className="mt-3 divide-y divide-line">
            {races.map((race) => (
              <li key={race.slug}>
                <Link href={`/race/${race.slug}`} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{race.nameKo}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-muted">
                      {formatRaceDate(race.date)} · {race.region}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-[14px] font-bold text-brand-ink">
                    {formatDday(daysBetween(today, race.date))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="border-t border-line pt-4 text-[12px] leading-relaxed text-ink-muted">
        페이스와 환산 기록은 {SITE_NAME}의 훈련 플랜 엔진이 계산한 값입니다. 일반적인 훈련 정보이며 의학적
        조언이 아닙니다.
      </footer>
    </div>
  );
}
