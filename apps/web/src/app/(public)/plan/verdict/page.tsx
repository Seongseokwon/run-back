import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { generatePlan } from '@runback/engine';
import { findRace } from '@runback/races';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VerdictBadge } from '@/components/plan/verdict-badge';
import { TrackEvent } from '@/components/analytics/track-event';
import { TrackOnClick } from '@/components/analytics/track-on-click';
import { EVENTS, distanceLabel as gaDistance } from '@/lib/analytics-events';
import { decodePlanRequest, planHref } from '@/lib/plan-url';
import { formatDuration, formatRaceDate } from '@/lib/format';
import { distanceLabel } from '@/lib/format';

export const metadata: Metadata = { title: '목표 판정', robots: { index: false } };

type Props = { searchParams: Promise<{ p?: string }> };

/**
 * 판정 화면 — PRD §10.4, §7.3.
 *
 * 경쟁 생성기 대부분이 하지 않는 일이다. 불가능한 목표를 그냥 플랜으로 만들어 주는 게
 * 가장 무책임하고, 여기서 신뢰가 갈린다.
 *
 * 문구 원칙: 겁주지 말고 **대안을 즉시 제시할 것.**
 * 그래서 🔴에서도 되돌아가지 않고 이 화면에서 바로 목표를 바꿀 수 있게 한다.
 */
export default async function VerdictPage({ searchParams }: Props) {
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
  const f = plan.feasibility;
  const race = req.raceSlug ? findRace(req.raceSlug) : undefined;
  const km = req.input.raceDistanceM / 1000;

  /*
   * 화면은 **엔진이 실제로 쓴 목표**를 기준으로 갈린다 (`effectiveGoal`), 사용자가 적어 낸
   * 목표가 아니다. 풀코스 기간 미달이면 엔진이 기록 목표를 완주로 바꿔 버리는데(§7.3),
   * 그때도 `req.input.goal` 을 보면 화면이 "완주 목표로 전환했습니다"라고 말해 놓고
   * 바로 아래에서 "4:28:35 를 노려보라"고 권한다 — 그리고 그 링크를 누르면
   * 목표만 바뀐 채 같은 🔴 화면으로 돌아온다. 빠져나갈 수 없는 고리였다.
   */
  const goalKind = f.effectiveGoal.kind;

  /** 목표만 바꿔 다시 판정받는 링크 */
  const withGoal = (targetSec: number | null): Route =>
    planHref('/plan/verdict', {
      ...req,
      input: {
        ...req.input,
        goal: targetSec === null ? { kind: 'finish' } : { kind: 'time', targetSec: Math.round(targetSec) },
      },
    });

  // 두 대안이 사실상 같은 값이면 선택지가 있는 척일 뿐이다. 하나만 보여준다.
  // 절대값이 아니라 비율로 본다 — 풀코스에서 1분과 5K에서 1분은 다른 크기다
  const gap = f.comfortableTimeSec - f.achievableTimeSec;
  const alternatives =
    gap < Math.max(60, f.achievableTimeSec * 0.015)
      ? [{ label: '현실적으로 노려볼 기록', sec: f.comfortableTimeSec }]
      : [
          { label: '도전적으로 잡으면', sec: f.achievableTimeSec },
          { label: '안정권으로 잡으면', sec: f.comfortableTimeSec },
        ];

  return (
    <div className="space-y-6 pt-2">
      {/* §15 verdict_shown — 🔴 이후 재조정률(H3)을 세려면 판정이 먼저 기록돼야 한다 */}
      <TrackEvent
        name={EVENTS.verdictShown}
        dedupeKey={`${plan.verdict}:${req.input.raceDate}:${req.input.raceDistanceM}`}
        params={{
          verdict: plan.verdict,
          distance: gaDistance(req.input.raceDistanceM),
          weeks_available: plan.weeks.length,
          goal_kind: req.input.goal.kind,
          from_race: Boolean(req.raceSlug),
        }}
      />
      <section>
        <p className="text-label font-semibold text-ink-muted">
          {race ? race.nameKo : formatRaceDate(req.input.raceDate)} · {distanceLabel(km)}
        </p>
        <div className="mt-2">
          <VerdictBadge verdict={plan.verdict} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {f.reasons.map((reason) => (
            <li key={reason} className="text-body leading-relaxed text-ink">
              {reason}
            </li>
          ))}
        </ul>
      </section>

      {/* 남은 주차와 실력 차이를 숫자로 보여준다. 판정을 믿으려면 근거가 보여야 한다 */}
      <Card className="grid grid-cols-3 divide-x divide-line px-2 py-4 text-center">
        <div>
          <p className="text-micro font-semibold text-ink-muted">남은 기간</p>
          <p className="tabular mt-1 text-section font-extrabold text-ink">{f.weeksAvailable}주</p>
        </div>
        <div>
          <p className="text-micro font-semibold text-ink-muted">최소 권장</p>
          <p className="tabular mt-1 text-section font-extrabold text-ink">{f.minWeeksRecommended}주</p>
        </div>
        <div>
          <p className="text-micro font-semibold text-ink-muted">주당 훈련</p>
          <p className="tabular mt-1 text-section font-extrabold text-ink">{req.input.daysPerWeek}일</p>
        </div>
      </Card>

      {/*
        🔴 에서 **다음에 할 일이 하나로 읽혀야 한다.**
        기록 목표라면 낮출 여지가 있으므로 대안과 '완주로 바꾸기'를 준다.
        이미 완주 목표라면 더 낮출 목표가 없다 — 그때 대안 기록을 들이미는 건 모순이다.
        "완주가 어렵다"고 말해 놓고 "2:32 는 노려볼 만하다"고 하면 사용자는 뭘 믿어야 할지 모른다.
      */}
      {plan.verdict === 'unrealistic' && goalKind === 'time' ? (
        <section className="space-y-3">
          <h2 className="text-section font-bold text-ink">이 기간에 현실적인 목표</h2>
          <div className="space-y-2">
            {alternatives.map((alt) => (
              /* §15 goal_adjusted — 🔴 이후 재조정률이 H3 가설의 검증 수단이다 */
              <TrackOnClick
                key={alt.label}
                name={EVENTS.goalAdjusted}
                params={{
                  from_verdict: plan.verdict,
                  to: 'time',
                  distance: gaDistance(req.input.raceDistanceM),
                  weeks_available: plan.weeks.length,
                }}
              >
                <Link href={withGoal(alt.sec)} className="block">
                  <Card className="flex items-baseline justify-between px-5 py-4">
                    <span className="text-body font-semibold text-ink">{alt.label}</span>
                    <span className="tabular text-card font-extrabold text-ink">{formatDuration(alt.sec)}</span>
                  </Card>
                </Link>
              </TrackOnClick>
            ))}
          </div>
          <TrackOnClick
            name={EVENTS.goalAdjusted}
            params={{
              from_verdict: plan.verdict,
              to: 'finish',
              distance: gaDistance(req.input.raceDistanceM),
              weeks_available: plan.weeks.length,
            }}
          >
            <ButtonLink href={withGoal(null)} variant="soft">
              완주 목표로 바꾸기
            </ButtonLink>
          </TrackOnClick>
        </section>
      ) : null}

      {plan.verdict === 'unrealistic' && goalKind === 'finish' ? (
        <section className="space-y-3">
          <h2 className="text-section font-bold text-ink">무엇을 바꿀 수 있나요</h2>
          <Card tone="sunken">
            <ul className="space-y-2 text-body text-ink">
              <li>· 기간이 더 남은 대회를 고르기</li>
              <li>· 주당 훈련 일수를 늘리기 (지금 주 {req.input.daysPerWeek}일)</li>
              <li>· 더 짧은 종목으로 참가하기</li>
            </ul>
          </Card>
          {/* 완주 목표에서는 낮출 목표가 없다. 바꿀 수 있는 건 입력뿐이라 그게 주 동선이다 */}
          <ButtonLink href="/plan/new" variant="soft">
            입력 바꿔서 다시 보기
          </ButtonLink>
        </section>
      ) : null}

      {plan.verdict === 'safe' && goalKind === 'time' ? (
        <section className="space-y-2">
          <h2 className="text-section font-bold text-ink">목표를 높여 볼까요?</h2>
          <TrackOnClick
            name={EVENTS.goalAdjusted}
            params={{ from_verdict: plan.verdict, to: 'harder', distance: gaDistance(req.input.raceDistanceM) }}
          >
          <Link href={withGoal(f.achievableTimeSec)} className="block">
            <Card className="flex items-baseline justify-between px-5 py-4">
              <span className="text-body font-semibold text-ink">같은 기간에 노려볼 만한 기록</span>
              <span className="tabular text-card font-extrabold text-brand-ink">
                {formatDuration(f.achievableTimeSec)}
              </span>
            </Card>
          </Link>
          </TrackOnClick>
        </section>
      ) : null}

      {/*
        🔴 에서는 '그대로 진행'을 주 버튼에 두지 않는다 (§7.3 생성 차단의 취지).
        다만 막지도 않는다 — 사용자가 알고 선택하는 것까지 대신 결정할 일은 아니다.

        문구는 **지금 목표**를 가리킨다. 한때 "그래도 **원래 목표로** 플랜 보기" 로 고정돼
        있었는데, 완주로 바꾼 뒤에는 그게 이미 '원래 목표'가 아니라 문구가 사실과 달랐다.
        그리고 밑줄 링크 하나만 있어서 **어디를 눌러야 다음으로 가는지** 읽히지 않았다.
      */}
      <div className="space-y-2">
        {plan.verdict === 'unrealistic' ? (
          <>
            <ButtonLink href={planHref('/plan/result', req)} variant="ghost" size="md">
              {goalKind === 'finish'
                ? '그래도 완주 목표로 플랜 보기'
                : '그래도 이 목표로 플랜 보기'}
            </ButtonLink>
            <p className="text-center text-label text-ink-muted">
              플랜은 만들어지지만 권장하지 않습니다
            </p>
          </>
        ) : (
          <>
            <ButtonLink href={planHref('/plan/result', req)}>이 플랜으로 시작하기</ButtonLink>
            <Link href="/plan/new" className="block py-2 text-center text-body font-semibold text-ink-muted">
              입력 다시 하기
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
