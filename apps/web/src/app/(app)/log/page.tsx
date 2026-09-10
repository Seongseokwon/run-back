import type { Metadata } from 'next';
import { AppHeader } from '@/components/layout/app-header';
import { AppScreen } from '@/components/layout/app-screen';
import { MonthCalendar, type MonthData } from '@/components/log/month-calendar';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageTitle, Screen, Section } from '@/components/ui/section';
import { primaryRace } from '@/lib/my-races';
import { todayKst } from '@/lib/format';
import { monthGrid, monthKeyOf, monthLabel, monthSummary, planMonths } from '@/lib/plan-view';

export const metadata: Metadata = { title: '기록' };
// 오늘이 어디냐에 따라 '지난 세션'과 '예정'이 갈린다
export const dynamic = 'force-dynamic';

/**
 * 기록 탭 — 월 캘린더.
 *
 * 지금 이 캘린더가 그리는 건 **플랜**이다. 실제 수행 기록(F-12)이 아니다.
 * 그래서 '최근 러닝'은 빈 상태로 둔다 — 목업에는 날짜·거리·시간·페이스·기분이 채워져 있지만,
 * 뛰지도 않은 거리를 지어내서 채우면 이 화면을 보고 판단을 할 수 없게 된다.
 */
export default async function LogPage() {
  const today = todayKst();
  const mine = await primaryRace();

  if (!mine) {
    return (
      <AppScreen header={<AppHeader />}>
        <Screen>
          <PageTitle>기록</PageTitle>
          <EmptyState
            title="아직 기록이 없습니다"
            description="플랜을 만들면 훈련 일정이 달력에 채워집니다."
            action={
              <ButtonLink href="/plan/new" size="md">
                플랜 만들기
              </ButtonLink>
            }
          />
        </Screen>
      </AppScreen>
    );
  }

  const { plan } = mine;
  const months: MonthData[] = planMonths(plan).map((key) => ({
    key,
    label: monthLabel(key),
    cells: monthGrid(plan, key, today),
    ...monthSummary(plan, key, today),
  }));

  return (
    <AppScreen header={<AppHeader />}>
      <Screen>
        <PageTitle sub={`${mine.name}까지의 훈련 달력입니다.`}>기록</PageTitle>

        <MonthCalendar months={months} initialKey={monthKeyOf(today)} />

        <Section title="최근 러닝">
          <EmptyState
            illustration="emptyLog"
            title="아직 남긴 러닝이 없습니다"
            description="달린 거리와 시간을 직접 남기는 기능은 준비 중입니다. 붙으면 여기에 날짜·거리·시간·페이스가 쌓입니다."
          />
        </Section>
      </Screen>
    </AppScreen>
  );
}
