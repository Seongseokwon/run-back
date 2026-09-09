import Link from 'next/link';
import { upcomingRaces } from '@raceback/races';
import { GOALS } from '@/lib/goals';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SceneBand } from '@/components/ui/scene';
import { distanceLabel, formatDday, formatRaceDate, todayKst } from '@/lib/format';
import { daysBetween } from '@/lib/plan-view';

/** 홈 — PRD §10.1. 검색 유입의 착지점이자 내부 링크 허브 */
// D-day 가 매일 바뀐다. 정적으로 굳히면 안 되고, 매 요청 렌더할 이유도 없다 → ISR
export const revalidate = 3600;

export default function HomePage() {
  const today = todayKst();
  const featured = upcomingRaces(today).slice(0, 6);

  return (
    <div className="space-y-8 pt-2">
      <section>
        {/* GEO/AEO 대비 — 질문형 H1 + 2~3문장 직답 (PRD §13.3) */}
        <h1 className="text-headline font-extrabold tracking-tight text-ink">
          대회까지 남은 기간에
          <br />
          뭘 해야 할까요?
        </h1>
        <p className="mt-3 text-body-lg text-ink-muted">
          대회 날짜를 넣으면 오늘부터 대회 당일까지 주차별로 무엇을 달릴지 만들어 드립니다. 남은
          기간에 무리인 목표라면 그것도 말씀드립니다.
        </p>
        <SceneBand name="sessionStart" className="mt-5" />
      </section>

      <ButtonLink href="/plan/new">내 대회로 플랜 만들기</ButtonLink>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-section font-bold text-ink">다가오는 대회</h2>
          <Link href="/race" className="text-label font-semibold text-brand-ink">
            전체 보기
          </Link>
        </div>

        <ul className="mt-3 space-y-3">
          {featured.map((race) => (
            <li key={race.slug}>
              <Link href={`/race/${race.slug}`} className="pressable block">
                <Card className="flex min-h-touch items-center gap-3 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-bold text-ink">{race.nameKo}</p>
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
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-section font-bold text-ink">목표 기록별로 보기</h2>
        <p className="mt-1 text-label text-ink-muted">필요한 페이스와 훈련 방향을 먼저 확인해 보세요.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <li key={goal.slug}>
              <Link
                href={`/goal/${goal.slug}`}
                className="pressable block rounded-full border border-line-strong bg-surface px-3.5 py-2.5 text-label font-semibold text-ink"
              >
                {goal.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-card bg-surface-sunken px-5 py-5">
        <h2 className="text-body font-bold text-ink">대회가 목록에 없나요?</h2>
        <p className="mt-1 text-label leading-relaxed text-ink-muted">
          날짜를 직접 입력해도 플랜을 만들 수 있습니다.
        </p>
        <Link href="/plan/new" className="mt-3 inline-block text-body font-bold text-brand-ink">
          날짜 직접 입력하기
        </Link>
      </section>
    </div>
  );
}
