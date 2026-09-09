import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppScreen } from '@/components/layout/app-screen';
import { SubHeader } from '@/components/layout/sub-header';
import { TodayTrainingCard } from '@/components/home/today-training-card';
import { WeekList } from '@/components/home/week-list';
import { WeekAccordion } from '@/components/plan/week-accordion';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionLabel } from '@/components/ui/card';
import { findMyRace } from '@/lib/demo-plan';
import { distanceLabel, formatDday, formatPace, formatRaceDate, todayKst } from '@/lib/format';
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
  const mine = findMyRace(slug, today);
  if (!mine) notFound();

  const { plan, race, distanceKm, goalLabel } = mine;
  const status = planStatus(plan, today);
  const startDate = planStartDate(plan);
  const week = currentWeek(plan, today);
  const session = sessionOn(plan, today);
  const daysLeft = daysBetween(today, race.date);
  const pace = session ? plan.paces[session.targetZone] : plan.paces.E;
  const progress = sessionProgress(plan, today);

  return (
    <AppScreen header={<SubHeader title="훈련 일정" />}>
      <div className="space-y-7">
        <section>
          <p className="text-[15px] font-semibold text-ink-muted">
            {race.nameKo} · {distanceLabel(distanceKm)}
          </p>
          <p className="tabular mt-1 text-[56px] leading-none font-extrabold tracking-tighter text-ink">
            {formatDday(daysLeft)}
          </p>
          <p className="mt-2 text-[15px] text-ink">
            <span className="text-ink-muted">{formatRaceDate(race.date)} · 목표 </span>
            <span className="tabular font-bold">{goalLabel}</span>
          </p>
        </section>

        {/* 세션 카운터 — 목업의 `12 / 15 sessions`. 며칠 지났는지가 아니라 몇 번 뛰었는지로 센다 */}
        <section className="rounded-card border border-line bg-surface px-5 py-4">
          <div className="flex items-baseline justify-between">
            <SectionLabel>Sessions</SectionLabel>
            <p className="tabular text-[17px] font-bold text-ink">
              {progress.done} <span className="text-ink-muted">/ {progress.total}</span>
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress.ratio} label="세션 진행률" />
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            총 {plan.weeks.length}주 · 주 {plan.input.daysPerWeek}일 · 피크 주간 {plan.peakWeeklyKm}km
          </p>
        </section>

        {status === 'before' ? (
          <section className="rounded-card border border-line bg-surface px-5 py-8 text-center">
            <p className="text-[18px] font-bold text-ink">
              플랜은 {formatRaceDate(startDate)}부터 시작합니다
            </p>
            <p className="tabular mt-1 text-[15px] text-ink-muted">
              시작까지 {daysBetween(today, startDate)}일
            </p>
          </section>
        ) : session && session.type !== 'rest' ? (
          <section className="space-y-4">
            <TodayTrainingCard
              typeLabel={sessionTitle(session.type)}
              distanceKm={session.distanceKm}
              paceRange={`${formatPace(pace.fastSecPerKm)} ~ ${formatPace(pace.slowSecPerKm)}`}
              {...(session.structure ? { note: session.structure } : {})}
            />
            {/*
              목업의 '훈련 기록하기'. 지금은 누를 수 없다 —
              수행 로그 저장(F-12)이 아직 없는데 버튼만 살려 두면 눌러 보고 아무 일도 안 일어난다.
              눌리지 않는 이유를 옆에 적어 두는 편이 낫다.
            */}
            <div>
              <Button variant="outline" disabled>
                훈련 기록하기
              </Button>
              <p className="mt-2 text-center text-[13px] text-ink-muted">
                수행 기록 저장은 아직 준비 중입니다
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-card border border-line bg-surface px-5 py-8 text-center">
            <p className="text-[18px] font-bold text-ink">오늘은 휴식일입니다</p>
            <p className="mt-1 text-[15px] text-ink-muted">회복도 훈련입니다.</p>
          </section>
        )}

        <hr className="border-line" />

        <WeekList
          items={weekItems(week, today)}
          title={`${status === 'before' ? '첫 주' : '이번 주'} · ${week.index + 1}주차 ${PHASE_LABEL[week.phase]}`}
        />

        <section>
          <h3 className="text-[18px] font-bold text-ink">전체 주차</h3>
          <p className="mt-1 text-[14px] text-ink-muted">주차를 누르면 그 주의 세션이 펼쳐집니다.</p>
          <div className="mt-3">
            <WeekAccordion weeks={plan.weeks} today={today} />
          </div>
        </section>

        <p className="border-t border-line pt-4 text-[12px] leading-relaxed text-ink-muted">{SAFETY_NOTICE}</p>
      </div>
    </AppScreen>
  );
}
