import type { Metadata } from 'next';
import { PlanWizard } from '@/components/plan/plan-wizard';
import { raceOptions } from '@/lib/race-options';
import { todayKst } from '@/lib/format';
import { TrackEvent } from '@/components/analytics/track-event';
import { EVENTS } from '@/lib/analytics-events';

export const metadata: Metadata = {
  title: '플랜 만들기',
  description: '대회 날짜와 지금 실력만 넣으면 대회 당일까지 주차별 훈련 플랜을 만들어 드립니다.',
};

/** 대회 목록이 매일 줄어든다 (지난 대회 제외) */
export const revalidate = 3600;

type Props = { searchParams: Promise<{ race?: string; distance?: string }> };

export default async function PlanNewPage({ searchParams }: Props) {
  const { race, distance } = await searchParams;
  const today = todayKst();
  const parsedDistance = distance ? Number(distance) * 1000 : undefined;

  return (
    <div className="space-y-6 pt-2">
      {/*
        §15 plan_start — 생성 완료율(§3.2 목표 60%)의 분모다.
        진입 경로를 남긴다: 대회 페이지에서 왔는지, 목표 페이지에서 왔는지, 직접인지.
      */}
      <TrackEvent
        name={EVENTS.planStart}
        dedupeKey={race ?? 'direct'}
        params={{ entry: race ? 'race' : 'direct', ...(race ? { race_slug: race } : {}) }}
      />
      <h1 className="text-title font-extrabold tracking-tight text-ink">플랜 만들기</h1>
      <PlanWizard
        races={raceOptions(today)}
        today={today}
        {...(race ? { initialRaceSlug: race } : {})}
        {...(parsedDistance && Number.isFinite(parsedDistance) ? { initialDistanceM: Math.round(parsedDistance * 10) / 10 } : {})}
      />
    </div>
  );
}
