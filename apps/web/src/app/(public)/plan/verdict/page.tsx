import type { Metadata } from 'next';
import Link from 'next/link';
import { generatePlan } from '@raceback/engine';
import { findRace } from '@raceback/races';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VerdictBadge } from '@/components/plan/verdict-badge';
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
        <p className="text-[18px] font-bold text-ink">플랜 정보를 읽을 수 없습니다</p>
        <p className="text-[15px] text-ink-muted">링크가 손상되었을 수 있습니다. 처음부터 다시 만들어 주세요.</p>
        <ButtonLink href="/plan/new">플랜 만들기</ButtonLink>
      </div>
    );
  }

  const plan = generatePlan(req.input);
  const f = plan.feasibility;
  const race = req.raceSlug ? findRace(req.raceSlug) : undefined;
  const km = req.input.raceDistanceM / 1000;

  /** 목표만 바꿔 다시 판정받는 링크 */
  const withGoal = (targetSec: number | null): string =>
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
      <section>
        <p className="text-[14px] font-semibold text-ink-muted">
          {race ? race.nameKo : formatRaceDate(req.input.raceDate)} · {distanceLabel(km)}
        </p>
        <div className="mt-2">
          <VerdictBadge verdict={plan.verdict} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {f.reasons.map((reason) => (
            <li key={reason} className="text-[16px] leading-relaxed text-ink">
              {reason}
            </li>
          ))}
        </ul>
      </section>

      {/* 남은 주차와 실력 차이를 숫자로 보여준다. 판정을 믿으려면 근거가 보여야 한다 */}
      <Card className="grid grid-cols-3 divide-x divide-line px-2 py-4 text-center">
        <div>
          <p className="text-[12px] font-semibold text-ink-muted">남은 기간</p>
          <p className="tabular mt-1 text-[20px] font-extrabold text-ink">{f.weeksAvailable}주</p>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-ink-muted">최소 권장</p>
          <p className="tabular mt-1 text-[20px] font-extrabold text-ink">{f.minWeeksRecommended}주</p>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-ink-muted">주당 훈련</p>
          <p className="tabular mt-1 text-[20px] font-extrabold text-ink">{req.input.daysPerWeek}일</p>
        </div>
      </Card>

      {plan.verdict === 'unrealistic' ? (
        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-ink">이 기간에 현실적인 목표</h2>
          <div className="space-y-2">
            {alternatives.map((alt) => (
              <Link key={alt.label} href={withGoal(alt.sec)} className="block">
                <Card className="flex items-baseline justify-between px-5 py-4">
                  <span className="text-[15px] font-semibold text-ink">{alt.label}</span>
                  <span className="tabular text-[22px] font-extrabold text-ink">{formatDuration(alt.sec)}</span>
                </Card>
              </Link>
            ))}
          </div>
          <ButtonLink href={withGoal(null)} variant="soft">
            완주 목표로 바꾸기
          </ButtonLink>
        </section>
      ) : null}

      {plan.verdict === 'safe' && req.input.goal.kind === 'time' ? (
        <section className="space-y-2">
          <h2 className="text-[18px] font-bold text-ink">목표를 높여 볼까요?</h2>
          <Link href={withGoal(f.achievableTimeSec)} className="block">
            <Card className="flex items-baseline justify-between px-5 py-4">
              <span className="text-[15px] font-semibold text-ink">같은 기간에 노려볼 만한 기록</span>
              <span className="tabular text-[22px] font-extrabold text-brand">
                {formatDuration(f.achievableTimeSec)}
              </span>
            </Card>
          </Link>
        </section>
      ) : null}

      {/*
        🔴 에서는 '그대로 진행'을 주 버튼에 두지 않는다 (§7.3 생성 차단의 취지).
        다만 막지도 않는다 — 사용자가 알고 선택하는 것까지 대신 결정할 일은 아니다
      */}
      <div className="space-y-2">
        {plan.verdict === 'unrealistic' ? (
          <>
            <Link
              href={planHref('/plan/result', req)}
              className="block py-2 text-center text-[15px] font-semibold text-ink-muted underline"
            >
              그래도 원래 목표로 플랜 보기
            </Link>
            <Link href="/plan/new" className="block py-2 text-center text-[15px] font-semibold text-ink-muted">
              입력 다시 하기
            </Link>
          </>
        ) : (
          <>
            <ButtonLink href={planHref('/plan/result', req)}>이 플랜으로 시작하기</ButtonLink>
            <Link href="/plan/new" className="block py-2 text-center text-[15px] font-semibold text-ink-muted">
              입력 다시 하기
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
