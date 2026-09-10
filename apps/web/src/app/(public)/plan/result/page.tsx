import type { Metadata } from 'next';
import Link from 'next/link';
import { generatePlan } from '@runback/engine';
import { findRace } from '@runback/races';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CopyLinkButton } from '@/components/plan/copy-link';
import { SavePlanButton } from '@/components/plan/save-plan-button';
import { CalendarExportButton } from '@/components/plan/calendar-export';
import { TrackEvent } from '@/components/analytics/track-event';
import { EVENTS, distanceLabel as gaDistance, elapsedBucket } from '@/lib/analytics-events';
import { PaceTable } from '@/components/plan/pace-table';
import { VerdictBadge } from '@/components/plan/verdict-badge';
import { WeekAccordion } from '@/components/plan/week-accordion';
import { decodePlanRequest, planHref } from '@/lib/plan-url';
import { distanceLabel, formatDday, formatDuration, formatRaceDate, todayKst } from '@/lib/format';
import { daysBetween } from '@/lib/plan-view';
import { SAFETY_NOTICE } from '@/lib/config';

export const metadata: Metadata = { title: '내 훈련 플랜', robots: { index: false } };

type Props = { searchParams: Promise<{ p?: string }> };

/**
 * 플랜 결과 — PRD §10.5.
 *
 * 서버에 아무것도 저장하지 않는다. URL 의 `p` 만으로 엔진을 다시 돌려 같은 플랜을 만든다.
 * 결정론이 이걸 가능하게 한다 (§7 도입부).
 */
export default async function PlanResultPage({ searchParams }: Props) {
  const { p } = await searchParams;
  const req = decodePlanRequest(p);

  if (!req) {
    return (
      <div className="space-y-4 pt-6 text-center">
        <p className="text-section font-bold text-ink">플랜 정보를 읽을 수 없습니다</p>
        <p className="text-body text-ink-muted">링크가 손상되었을 수 있습니다. 처음부터 다시 만들어 주세요.</p>
        <ButtonLink href="/plan/new">플랜 만들기</ButtonLink>
      </div>
    );
  }

  const plan = generatePlan(req.input);
  const today = todayKst();
  const race = req.raceSlug ? findRace(req.raceSlug) : undefined;
  const km = req.input.raceDistanceM / 1000;
  const daysLeft = daysBetween(today, req.input.raceDate);
  const level = req.input.fitness.kind === 'novice' ? 'novice' : 'full';

  /*
   * §15 대시보드 1순위가 '생성일 기준 코호트별 재방문 곡선'이다.
   * 플랜은 만든 날(input.today)을 URL 에 박아 두므로, 오늘과 다르면 **재방문**이다.
   * 링크를 다시 연 것도 재방문으로 센다 — 그게 H1 이 묻는 행동이다.
   */
  const elapsedDays = daysBetween(req.input.today, today);
  const isRevisit = elapsedDays > 0;

  return (
    <div className="space-y-6 pt-2">
      <TrackEvent
        name={isRevisit ? EVENTS.planRevisit : EVENTS.planGenerated}
        dedupeKey={`${p}:${isRevisit}`}
        params={{
          distance: gaDistance(req.input.raceDistanceM),
          verdict: plan.verdict,
          weeks: plan.weeks.length,
          days_per_week: req.input.daysPerWeek,
          fitness_kind: req.input.fitness.kind,
          from_race: Boolean(req.raceSlug),
          ...(isRevisit ? { elapsed: elapsedBucket(elapsedDays) } : {}),
        }}
      />
      <section>
        <p className="text-label font-semibold text-ink-muted">
          {race ? race.nameKo : formatRaceDate(req.input.raceDate)} · {distanceLabel(km)}
        </p>
        <p className="tabular mt-1 text-figure leading-none font-extrabold tracking-tighter text-ink">
          {formatDday(daysLeft)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <VerdictBadge verdict={plan.verdict} size="sm" />
          <p className="text-body text-ink">
            <span className="text-ink-muted">목표 </span>
            <span className="tabular font-bold">
              {req.input.goal.kind === 'time' ? formatDuration(req.input.goal.targetSec) : '완주'}
            </span>
          </p>
          <p className="text-body text-ink">
            <span className="text-ink-muted">총 </span>
            <span className="tabular font-bold">{plan.weeks.length}주</span>
          </p>
        </div>
        {/*
          예상 기록은 언제나 범위로 (§7.2 정직성 원칙).
          '지금 실력 기준'을 붙이는 이유: 이 값은 훈련 전 예측이라 목표보다 느린 게 정상인데,
          그냥 '예상 기록'이라고 쓰면 판정과 모순돼 보인다
        */}
        <p className="mt-2 text-body text-ink-muted">
          지금 실력 기준 예상{' '}
          <span className="tabular">
            {formatDuration(plan.predicted.fastSec)} ~ {formatDuration(plan.predicted.slowSec)}
          </span>
        </p>
        <Link
          href={planHref('/plan/verdict', req)}
          className="mt-2 inline-block text-label font-semibold text-brand-ink"
        >
          판정 근거 다시 보기
        </Link>
      </section>

      <PaceTable paces={plan.paces} level={level} />

      <section>
        <h2 className="text-section font-bold text-ink">주차별 플랜</h2>
        <p className="mt-1 text-label text-ink-muted">
          피크 주간 거리 {plan.peakWeeklyKm}km · 주 {req.input.daysPerWeek}일
        </p>
        <div className="mt-3">
          <WeekAccordion weeks={plan.weeks} today={today} />
        </div>
      </section>

      {/* 엔진이 안전 규칙으로 플랜을 조정했다면 반드시 알린다 (§7.10) */}
      {plan.notices.filter((n) => n !== SAFETY_NOTICE).length > 0 ? (
        <Card className="space-y-2 px-5 py-4">
          {plan.notices
            .filter((n) => n !== SAFETY_NOTICE)
            .map((notice) => (
              <p key={notice} className="text-label leading-relaxed text-ink">
                {notice}
              </p>
            ))}
        </Card>
      ) : null}

      {/* §9.2 저장 게이트 — 플랜을 다 본 다음이라 전환율이 가장 높은 지점이다 */}
      <SavePlanButton encoded={p!} />

      {/* F-11 — 로그인 없이도 받는다. 캘린더는 앱을 열지 않아도 먼저 말을 건다 (§3.2 H1) */}
      <CalendarExportButton href={`/api/calendar?p=${p}`} />

      <CopyLinkButton />

      <p className="border-t border-line pt-4 text-micro leading-relaxed text-ink-muted">{SAFETY_NOTICE}</p>
    </div>
  );
}
