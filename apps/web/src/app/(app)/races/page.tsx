import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/app-header';
import { AppScreen } from '@/components/layout/app-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { MyRaceRow } from '@/components/races/my-race-row';
import { myRaces } from '@/lib/demo-plan';
import { todayKst } from '@/lib/format';
import { daysBetween, planProgress, sessionProgress } from '@/lib/plan-view';

export const metadata: Metadata = { title: '대회' };
// 내가 등록한 대회의 D-day 와 진행률은 매일 달라진다. 굳히면 안 된다
export const dynamic = 'force-dynamic';

/**
 * 대회 탭 = **내 대회**.
 *
 * 전체 대회 브라우징은 이 탭이 아니라 공개 라우트(`/race`)에 둔다.
 * 로그인 사용자가 이 탭에 오는 이유는 "내가 준비 중인 대회가 어떻게 되고 있나"이지
 * "무슨 대회가 있나"가 아니다. 둘을 한 화면에 섞으면 둘 다 잘 안 보인다.
 */
export default function MyRacesPage() {
  const today = todayKst();
  const races = myRaces(today);

  return (
    <AppScreen header={<AppHeader />}>
      <div className="space-y-5 pt-2">
        <header className="flex items-baseline justify-between gap-2">
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">내 대회</h1>
          <Link href="/race" className="shrink-0 text-[14px] font-bold text-brand-ink">
            대회 둘러보기
          </Link>
        </header>

        {races.length === 0 ? (
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
            <ul className="space-y-3">
              {races.map((item) => {
                const progress = sessionProgress(item.plan, today);
                return (
                  <li key={item.race.slug}>
                    <MyRaceRow
                      href={`/races/${item.race.slug}`}
                      name={item.race.nameKo}
                      date={item.race.date}
                      distanceKm={item.distanceKm}
                      daysLeft={daysBetween(today, item.race.date)}
                      goalLabel={item.goalLabel}
                      progress={planProgress(item.plan, today)}
                      sessionsDone={progress.done}
                      sessionsTotal={progress.total}
                    />
                  </li>
                );
              })}
            </ul>

            {/*
              목업의 "새로운 목표를 추가해보세요" 슬롯.
              빈 상태 화면이 아니라 목록 끝에 항상 붙는 자리다 — 목표는 하나로 끝나지 않는다
            */}
            <Link
              href="/plan/new"
              className="pressable flex min-h-touch items-center justify-center gap-2 rounded-card border border-dashed border-line-strong px-4 py-6 text-[15px] font-bold text-brand-ink hover:bg-brand-soft/30"
            >
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
              새로운 목표를 추가해보세요
            </Link>
          </>
        )}
      </div>
    </AppScreen>
  );
}
