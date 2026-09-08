import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { Illustration } from '@/components/ui/illustration';
import { NextRaceCard } from '@/components/home/next-race-card';
import { TodayTrainingCard } from '@/components/home/today-training-card';
import { WeekList } from '@/components/home/week-list';
import { demoPlan } from '@/lib/demo-plan';
import { formatDuration, formatPace, todayKst } from '@/lib/format';
import { currentWeek, daysBetween, planProgress, sessionOn, sessionTitle, weekItems } from '@/lib/plan-view';
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
function headline(typeLabel: string | undefined): string {
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
  const { plan, race } = demoPlan(today);

  const week = currentWeek(plan, today);
  const session = sessionOn(plan, today);
  const daysLeft = daysBetween(today, plan.input.raceDate);
  const goalLabel =
    plan.input.goal.kind === 'time' ? formatDuration(plan.input.goal.targetSec) : '완주';
  const pace = session ? plan.paces[session.targetZone] : plan.paces.E;

  return (
    <div className="space-y-7">
      <section className="pt-2">
        <p className="text-[15px] font-medium text-ink-muted">{greeting(new Date().getUTCHours() + 9)}</p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h1 className="text-[34px] leading-[1.15] font-extrabold tracking-tight whitespace-pre-line text-ink">
            {headline(session?.type)}
          </h1>
          <Illustration name="heroShoe" width={140} className="-mt-2" />
        </div>
      </section>

      <NextRaceCard
        raceName={race.nameKo}
        daysLeft={daysLeft}
        goalLabel={goalLabel}
        progress={planProgress(plan, today)}
      />

      {session && session.type !== 'rest' ? (
        <>
          <TodayTrainingCard
            typeLabel={sessionTitle(session.type)}
            distanceKm={session.distanceKm}
            paceRange={`${formatPace(pace.fastSecPerKm)} ~ ${formatPace(pace.slowSecPerKm)}`}
            {...(session.structure ? { note: session.structure } : {})}
          />
          <ButtonLink href="/today">오늘 달리기</ButtonLink>
        </>
      ) : (
        <section className="rounded-card border border-line bg-surface px-5 py-8 text-center">
          <p className="text-[18px] font-bold text-ink">오늘은 휴식일입니다</p>
          <p className="mt-1 text-[15px] text-ink-muted">회복도 훈련입니다. 내일 세션을 위해 쉬어 가세요.</p>
        </section>
      )}

      <hr className="border-line" />

      <WeekList items={weekItems(week, today)} />

      {/* ACWR 클램프 등 엔진이 조용히 줄인 게 있으면 반드시 알린다 (PRD §7.10) */}
      {week.clamped ? (
        <p className="rounded-control bg-surface-sunken px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
          이번 주는 안전한 훈련량 증가 폭을 넘어서 거리를 줄였습니다. 부상 위험을 낮추기 위한 조정입니다.
        </p>
      ) : null}

      <p className="text-[12px] leading-relaxed text-ink-faint">{SAFETY_NOTICE}</p>
    </div>
  );
}
