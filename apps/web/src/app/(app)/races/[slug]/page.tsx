import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppScreen } from '@/components/layout/app-screen';
import { SubHeader } from '@/components/layout/sub-header';
import { PlanStateCard } from '@/components/home/plan-state-card';
import { TodayTrainingCard } from '@/components/home/today-training-card';
import { WeekList } from '@/components/home/week-list';
import { WeekAccordion } from '@/components/plan/week-accordion';
import { Button } from '@/components/ui/button';
import { BigStat } from '@/components/ui/stat';
import { Screen, Section } from '@/components/ui/section';
import { findMyRace } from '@/lib/my-races';
import { SessionCheck } from '@/components/plan/session-check';
import { distanceLabel, formatDday, formatPace, formatRaceDate, todayKst } from '@/lib/format';
import { sessionIllustration } from '@/lib/illustrations';
import {
  PHASE_LABEL,
  currentWeek,
  daysBetween,
  planStartDate,
  planStatus,
  sessionOn,
  sessionProgress,
  sessionTitle,
  weekItems,
} from '@/lib/plan-view';
import { SAFETY_NOTICE } from '@/lib/config';

export const metadata: Metadata = { title: '훈련 일정', robots: { index: false } };
// 오늘이 며칠이냐로 화면 전체가 달라진다
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

/**
 * 훈련 일정 상세 — 대회 탭에서 한 단계 들어간 화면.
 *
 * 홈('오늘')이 **오늘 하나**만 보여 준다면 여기는 **대회까지 전부**를 보여 준다.
 * 그래서 라우트를 `/races/<slug>` 로 둔다. 탭바의 활성 판정이 `startsWith('/races/')` 라
 * 여기 있는 동안 대회 탭이 그대로 켜져 있다 — 사용자가 '어느 탭에 있는지' 잃지 않는다.
 */
export default async function RaceSchedulePage({ params }: Props) {
  const { slug } = await params;
  const today = todayKst();
  const mine = await findMyRace(slug);
  if (!mine) notFound();

  const { plan, distanceKm, goalLabel } = mine;
  const status = planStatus(plan, today);
  const startDate = planStartDate(plan);
  const week = currentWeek(plan, today);
  const session = sessionOn(plan, today);
  const daysLeft = daysBetween(today, mine.date);
  const pace = session ? plan.paces[session.targetZone] : plan.paces.E;
  const progress = sessionProgress(plan, mine.logs);

  return (
    <AppScreen header={<SubHeader title="훈련 일정" action={<CalendarLink />} />}>
      <Screen>
        {/* 히어로는 카드가 아니다 — 아래 '오늘의 훈련' 카드가 이 화면의 주인공이라
            여기서 카드를 한 번 더 쓰면 둘이 같은 무게로 경쟁한다 */}
        <section>
          <p className="truncate text-body font-semibold text-ink-muted">
            {mine.name} · {distanceLabel(distanceKm)}
          </p>
          <div className="mt-1">
            <BigStat value={formatDday(daysLeft)} size="lg" />
          </div>
          <p className="mt-2 text-body text-ink">
            <span className="text-ink-muted">{formatRaceDate(mine.date)} · 목표 </span>
            <span className="tabular font-bold">{goalLabel}</span>
          </p>
        </section>

        {status === 'before' ? (
          <PlanStateCard
            title={`플랜은 ${formatRaceDate(startDate)}부터 시작합니다`}
            detail={`시작까지 ${daysBetween(today, startDate)}일`}
            illustration={sessionIllustration(undefined, 'before')}
          />
        ) : session && session.type !== 'rest' ? (
          <TodayTrainingCard
            variant="card"
            label="오늘의 훈련"
            typeLabel={sessionTitle(session.type)}
            distanceKm={session.distanceKm}
            paceRange={`${formatPace(pace.fastSecPerKm)} ~ ${formatPace(pace.slowSecPerKm)}`}
            illustration={sessionIllustration(session.type)}
            {...(session.structure ? { note: session.structure } : {})}
            action={
              <SessionCheck
                planId={mine.planId}
                date={session.date}
                status={mine.logs.get(session.date)?.status}
              />
            }
          />
        ) : (
          <PlanStateCard
            title="오늘은 휴식일입니다"
            detail="회복도 훈련입니다."
            illustration={sessionIllustration('rest')}
          />
        )}

        <div>
          <WeekList
            items={weekItems(week, today, mine.logs)}
            title={`이번 주 훈련 · ${week.index + 1}주차 ${PHASE_LABEL[week.phase]}`}
          />
          <WeekDots
            current={week.index}
            total={plan.weeks.length}
            done={progress.done}
            sessions={progress.total}
          />
        </div>

        <Section title="전체 주차" description="주차를 누르면 그 주의 세션이 펼쳐집니다.">
          <WeekAccordion weeks={plan.weeks} today={today} />
        </Section>

        <p className="border-t border-line pt-4 text-micro text-ink-muted">{SAFETY_NOTICE}</p>
      </Screen>
    </AppScreen>
  );
}

/** 헤더 우측 — 달력으로. 이 화면이 '이번 주'라면 달력은 '전체 기간'이다 */
function CalendarLink() {
  return (
    <Link
      href="/log"
      aria-label="훈련 달력"
      className="pressable -mr-2 flex size-touch shrink-0 items-center justify-center rounded-full text-ink"
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

/**
 * 주차 점 인디케이터 + 세션 카운터.
 *
 * 점 하나가 한 주다. 진행률 막대 대신 점을 쓰는 이유는 이 플랜이 **주 단위로 역산된 것**이라
 * '몇 퍼센트'보다 '몇 주째'가 러너가 실제로 세는 단위이기 때문이다.
 */
function WeekDots({
  current,
  total,
  done,
  sessions,
}: {
  current: number;
  total: number;
  done: number;
  sessions: number;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span
        className="flex flex-wrap items-center gap-1.5"
        role="img"
        aria-label={`총 ${total}주 중 ${current + 1}주차`}
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`block size-2 rounded-full ${
              i < current ? 'bg-brand-line' : i === current ? 'bg-brand' : 'bg-line-strong'
            }`}
          />
        ))}
      </span>
      <p className="tabular shrink-0 text-body text-ink-muted">
        <span className="font-extrabold text-brand-ink">{done}</span> / {sessions} sessions
      </p>
    </div>
  );
}
