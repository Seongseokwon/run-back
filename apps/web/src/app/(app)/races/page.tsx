import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/app-header';
import { AppScreen } from '@/components/layout/app-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { PageTitle, Screen, Section, SectionAction } from '@/components/ui/section';
import { NextRaceCard } from '@/components/home/next-race-card';
import { AddGoalSlot, MyRaceRow } from '@/components/races/my-race-row';
import { myRaces } from '@/lib/my-races';
import { todayKst } from '@/lib/format';
import { daysBetween, planProgress } from '@/lib/plan-view';

export const metadata: Metadata = { title: '대회' };
// 내가 등록한 대회의 D-day 와 진행률은 매일 달라진다. 굳히면 안 된다
export const dynamic = 'force-dynamic';

/**
 * 대회 탭 = **내가 준비 중인 대회**.
 *
 * 전체 대회 브라우징은 이 탭이 아니라 공개 라우트(`/race`)에 둔다.
 * 로그인 사용자가 이 탭에 오는 이유는 "내가 준비 중인 대회가 어떻게 되고 있나"이지
 * "무슨 대회가 있나"가 아니다. 둘을 한 화면에 섞으면 둘 다 잘 안 보인다.
 *
 * 맨 위 NEXT RACE 카드는 홈과 같은 카드다. 목표가 여럿이어도 **가장 가까운 하나**는
 * 늘 크게 서 있어야 한다 — 목록만 있으면 어느 게 급한지 매번 날짜를 세어 봐야 한다.
 */
export default async function MyRacesPage() {
  const today = todayKst();
  const races = await myRaces();
  const next = races[0];

  return (
    <AppScreen header={<AppHeader />}>
      <Screen>
        <PageTitle>대회</PageTitle>

        {!next ? (
          <EmptyState
            title="아직 등록한 대회가 없습니다"
            description="목표 대회를 정하면 그날까지 역산한 주차별 플랜을 만들어 드립니다."
            action={
              <ButtonLink href="/plan/new" size="md">
                첫 목표 정하기
              </ButtonLink>
            }
          />
        ) : (
          <>
            <Link href={`/races/${next.key}`} className="pressable rise block">
              <NextRaceCard
                raceName={next.name}
                distanceKm={next.distanceKm}
                daysLeft={daysBetween(today, next.date)}
                goalLabel={next.goalLabel}
                progress={planProgress(next.plan, next.logs)}
              />
            </Link>

            <Section title="내 대회" action={<SectionAction href="/race">둘러보기</SectionAction>}>
              <ul className="space-y-3">
                {races.map((item) => (
                  <li key={item.key}>
                    <MyRaceRow
                      href={`/races/${item.key}`}
                      name={item.name}
                      date={item.date}
                      distanceKm={item.distanceKm}
                      goalLabel={item.goalLabel}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <AddGoalSlot />
              </div>
            </Section>
          </>
        )}
      </Screen>
    </AppScreen>
  );
}
