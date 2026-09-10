import type { Route } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { SceneBand } from '@/components/ui/scene';
import { distanceLabel, formatRaceDate } from '@/lib/format';

/**
 * 내 대회 한 줄.
 *
 * 위에 이미 NEXT RACE 카드가 D-day·진행률을 크게 보여 주고 있으므로
 * 여기서는 같은 숫자를 되풀이하지 않는다 — 목록은 '무엇을 준비 중인지'만 답한다.
 * 목업이 이 행을 이름·날짜·목표 세 가지로만 둔 이유도 같다.
 */
export function MyRaceRow({
  href,
  name,
  date,
  distanceKm,
  goalLabel,
}: {
  href: Route;
  name: string;
  date: string;
  distanceKm: number;
  goalLabel: string;
}) {
  return (
    <Link href={href} className="pressable block">
      <Card className="flex min-h-touch items-center gap-3 px-4 py-4 hover:bg-surface-raised">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-lg font-bold text-ink">{name}</p>
          <p className="mt-0.5 text-label text-ink-muted">
            {formatRaceDate(date)} · {distanceLabel(distanceKm)}
          </p>
        </div>
        <p className="shrink-0 text-body text-ink">
          <span className="mr-1.5 text-ink-muted">목표</span>
          <span className="tabular font-bold">{goalLabel}</span>
        </p>
        <svg
          viewBox="0 0 20 20"
          className="size-4 shrink-0 text-ink-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Card>
    </Link>
  );
}

/**
 * 목록 끝에 항상 붙는 '새 목표' 자리.
 * 빈 상태 화면이 아니라 목록의 마지막 칸이다 — 목표는 하나로 끝나지 않는다.
 */
export function AddGoalSlot() {
  return (
    <Link
      href="/plan/new"
      className="pressable block overflow-hidden rounded-card border border-line bg-surface-raised hover:border-brand-line"
    >
      <SceneBand name="emptyPlan" rounded={false} aspect={2.8} />
      <span className="flex items-center justify-center gap-2 px-4 py-4 text-body font-bold text-brand-ink">
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-full bg-brand-soft"
        >
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.6}>
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
        </span>
        새로운 목표를 추가해보세요
      </span>
    </Link>
  );
}
