import type { Metadata } from 'next';
import { PlanWizard } from '@/components/plan/plan-wizard';
import { raceOptions } from '@/lib/race-options';
import { todayKst } from '@/lib/format';

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
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">플랜 만들기</h1>
      <PlanWizard
        races={raceOptions(today)}
        today={today}
        {...(race ? { initialRaceSlug: race } : {})}
        {...(parsedDistance && Number.isFinite(parsedDistance) ? { initialDistanceM: Math.round(parsedDistance * 10) / 10 } : {})}
      />
    </div>
  );
}
