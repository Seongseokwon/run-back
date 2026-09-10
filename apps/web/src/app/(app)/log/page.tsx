import type { Metadata } from 'next';
import { AppHeader } from '@/components/layout/app-header';
import { AppScreen } from '@/components/layout/app-screen';
import { MonthCalendar, type MonthData } from '@/components/log/month-calendar';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageTitle, Screen, Section } from '@/components/ui/section';
import { primaryRace } from '@/lib/my-races';
import { todayKst } from '@/lib/format';
import { toggleSessionDone } from '@/lib/log-actions';
import { monthGrid, monthKeyOf, monthLabel, monthSummary, planMonths, recentRuns } from '@/lib/plan-view';
import { formatRaceDate } from '@/lib/format';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: '기록' };
// 오늘이 어디냐에 따라 '지난 세션'과 '예정'이 갈린다
export const dynamic = 'force-dynamic';

/**
 * 기록 탭 — 월 캘린더.
 *
 * 캘린더는 플랜 위에 **실제 수행 기록**을 얹어서 그린다 (F-12).
 * '최근 러닝'도 지어내지 않는다 — 사용자가 직접 체크한 세션만 올라온다.
 * 아직 체크한 게 없으면 빈 상태다. 지나간 계획을 뛴 것처럼 보여 주지 않는다 (§0-3).
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
    cells: monthGrid(plan, key, today, mine.logs),
    ...monthSummary(plan, key, mine.logs),
  }));

  const runs = recentRuns(plan, mine.logs);
  const { planId } = mine;

  return (
    <AppScreen header={<AppHeader />}>
      <Screen>
        <PageTitle sub={`${mine.name}까지의 훈련 달력입니다.`}>기록</PageTitle>

        <MonthCalendar
          months={months}
          initialKey={monthKeyOf(today)}
          onToggle={async (date: string) => {
            'use server';
            await toggleSessionDone(planId, date);
          }}
        />

        <Section title="최근 러닝">
          {runs.length === 0 ? (
            <EmptyState
              illustration="emptyLog"
              title="아직 남긴 러닝이 없습니다"
              description="훈련을 마치면 '훈련 완료로 기록하기'를 눌러 두세요. 여기에 쌓입니다."
            />
          ) : (
            <Card>
              <ul>
                {runs.map((run) => (
                  <li
                    key={run.date}
                    className="flex min-h-touch items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
                  >
                    <span className="w-24 shrink-0 text-label text-ink-muted">
                      {formatRaceDate(run.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-lg text-ink">
                      {run.title}
                    </span>
                    {/*
                      계획 거리다. 실제로 몇 km 를 뛰었는지는 아직 받지 않는다 —
                      받지 않은 값을 실제인 척 보여 주지 않으려고 라벨을 '계획'으로 둔다
                    */}
                    <span className="shrink-0 tabular text-body text-ink-muted">
                      계획 {run.plannedKm}km
                    </span>
                    <span className="shrink-0 text-label font-semibold text-brand-ink">
                      {run.status === 'skipped' ? '건너뜀' : '완료'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </Section>
      </Screen>
    </AppScreen>
  );
}
