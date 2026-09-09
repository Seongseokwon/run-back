import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Illustration } from '@/components/ui/illustration';
import { AppHeader } from '@/components/layout/app-header';
import { AppScreen } from '@/components/layout/app-screen';
import { NextRaceCard } from '@/components/home/next-race-card';
import { TodayTrainingCard } from '@/components/home/today-training-card';
import { WeekList } from '@/components/home/week-list';
import { EmptyState } from '@/components/ui/empty-state';
import { primaryRace } from '@/lib/demo-plan';
import { formatPace, formatRaceDate, todayKst } from '@/lib/format';
import {
  currentWeek,
  daysBetween,
  planProgress,
  planStartDate,
  planStatus,
  sessionOn,
  sessionTitle,
  weekItems,
} from '@/lib/plan-view';
import { SAFETY_NOTICE } from '@/lib/config';

export const metadata: Metadata = { title: '오늘' };
// '오늘' 화면은 굳히면 안 된다. 계정이 붙으면 사용자별로도 갈린다
export const dynamic = 'force-dynamic';

function greeting(hour: number): string {
  if (hour < 5) return '늦은 밤이에요.';
  if (hour < 12) return '좋은 아침이에요.';
  if (hour < 18) return '좋은 오후예요.';
  return '좋은 저녁이에요.';
}

/** 오늘 세션 한 줄 요약. 러너가 이 화면에서 얻어 갈 건 결국 이 문장이다 */
function headline(typeLabel: string | undefined, started: boolean): string {
  if (!started) return '곧\n플랜이 시작됩니다.';
  switch (typeLabel) {
    case 'easy':
      return '오늘은\n천천히 달리는 날입니다.';
    case 'long':
      return '오늘은\n길게 달리는 날입니다.';
    case 'tempo':
    case 'interval':
    case 'repetition':
      return '오늘은\n강도를 올리는 날입니다.';
    case 'marathon-pace':
      return '오늘은\n레이스 페이스를 익히는 날입니다.';
    case 'race':
      return '오늘이\n대회 당일입니다.';
    default:
      return '오늘은\n쉬어 가는 날입니다.';
  }
}

export default function TodayPage() {
  const today = todayKst();
  const mine = primaryRace(today);

  // 목표 대회가 없으면 오늘 할 것도 없다. 빈 화면 대신 다음 할 일을 준다
  if (!mine) {
    return (
      <AppScreen header={<AppHeader />}>
        <div className="space-y-6 pt-2">
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">오늘</h1>
          <EmptyState
            title="아직 목표 대회가 없습니다"
            description="대회를 정하면 그날까지 역산해서 오늘 뭘 뛰어야 하는지 알려 드립니다."
            action={
              <ButtonLink href="/plan/new" size="md">
                플랜 만들기
              </ButtonLink>
            }
          />
        </div>
      </AppScreen>
    );
  }

  const { plan, race, goalLabel, distanceKm } = mine;
  const status = planStatus(plan, today);
  const startDate = planStartDate(plan);
  const week = currentWeek(plan, today);
  const session = sessionOn(plan, today);
  const daysLeft = daysBetween(today, plan.input.raceDate);
  const pace = session ? plan.paces[session.targetZone] : plan.paces.E;
  const scheduleHref = `/races/${race.slug}`;

  return (
    <AppScreen header={<AppHeader />}>
      <div className="space-y-7">
        <section className="pt-2">
          <p className="text-[15px] font-medium text-ink-muted">{greeting(new Date().getUTCHours() + 9)}</p>
          <div className="mt-1 flex items-start justify-between gap-2">
            <h1 className="text-[34px] leading-[1.15] font-extrabold tracking-tight whitespace-pre-line text-ink">
              {headline(session?.type, status !== 'before')}
            </h1>
            <Illustration name="heroShoe" width={140} className="-mt-2" />
          </div>
        </section>

        {/* 카드 전체가 훈련 일정 상세로 가는 입구다. D-day 를 본 다음 궁금한 건 언제나 '그래서 전체 일정은' 이다 */}
        <Link href={scheduleHref} className="pressable block">
          <NextRaceCard
            raceName={race.nameKo}
            distanceKm={distanceKm}
            daysLeft={daysLeft}
            goalLabel={goalLabel}
            progress={planProgress(plan, today)}
          />
        </Link>

        {status === 'before' ? (
          /* 대회 날짜에서 주 단위로 역산하므로 첫 주가 다음 주 월요일부터일 수 있다.
             그 상태를 '오늘은 휴식일'이라고 하면 플랜이 이미 돌고 있는 것처럼 읽힌다 */
          <section className="rounded-card border border-line bg-surface px-5 py-8 text-center">
            <p className="text-[18px] font-bold text-ink">
              플랜은 {formatRaceDate(startDate)}부터 시작합니다
            </p>
            <p className="tabular mt-1 text-[15px] text-ink-muted">
              시작까지 {daysBetween(today, startDate)}일 · 그때까지는 편하게 몸을 만들어 두세요
            </p>
          </section>
        ) : session && session.type !== 'rest' ? (
          <>
            <TodayTrainingCard
              typeLabel={sessionTitle(session.type)}
              distanceKm={session.distanceKm}
              paceRange={`${formatPace(pace.fastSecPerKm)} ~ ${formatPace(pace.slowSecPerKm)}`}
              {...(session.structure ? { note: session.structure } : {})}
            />
            <ButtonLink href={scheduleHref}>훈련 일정 보기</ButtonLink>
          </>
        ) : (
          <section className="rounded-card border border-line bg-surface px-5 py-8 text-center">
            <p className="text-[18px] font-bold text-ink">오늘은 휴식일입니다</p>
            <p className="mt-1 text-[15px] text-ink-muted">회복도 훈련입니다. 내일 세션을 위해 쉬어 가세요.</p>
          </section>
        )}

        <hr className="border-line" />

        <WeekList items={weekItems(week, today)} title={status === 'before' ? '첫 주' : '이번 주'} />

        {/* ACWR 클램프 등 엔진이 조용히 줄인 게 있으면 반드시 알린다 (PRD §7.10) */}
        {week.clamped ? (
          <p className="rounded-control bg-surface-sunken px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
            이번 주는 안전한 훈련량 증가 폭을 넘어서 거리를 줄였습니다. 부상 위험을 낮추기 위한 조정입니다.
          </p>
        ) : null}

        <p className="text-[12px] leading-relaxed text-ink-muted">{SAFETY_NOTICE}</p>
      </div>
    </AppScreen>
  );
}
