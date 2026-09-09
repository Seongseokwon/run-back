import Link from 'next/link';
import { ProgressBar } from '@/components/ui/progress-bar';
import { distanceLabel, formatDday, formatRaceDate } from '@/lib/format';

/**
 * 내 대회 한 줄 — 대회 탭의 본체.
 *
 * 여기 담기는 건 '대회 정보'가 아니라 **내 목표의 상태**다.
 * 그래서 지역·종목 목록이 아니라 D-day / 목표 / 진행률을 보여 준다.
 */
export function MyRaceRow({
  href,
  name,
  date,
  distanceKm,
  daysLeft,
  goalLabel,
  progress,
  sessionsDone,
  sessionsTotal,
}: {
  href: string;
  name: string;
  date: string;
  distanceKm: number;
  daysLeft: number;
  goalLabel: string;
  progress: number;
  sessionsDone: number;
  sessionsTotal: number;
}) {
  return (
    <Link
      href={href}
      className="pressable block rounded-card border border-line bg-surface px-4 py-4 hover:bg-surface-sunken/40"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-ink">{name}</p>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {formatRaceDate(date)} · {distanceLabel(distanceKm)}
          </p>
        </div>
        <span className="tabular shrink-0 text-[17px] font-extrabold text-brand-ink">
          {formatDday(daysLeft)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[14px]">
        <p className="text-ink">
          <span className="text-ink-muted">목표 </span>
          <span className="tabular font-bold">{goalLabel}</span>
        </p>
        <p className="tabular text-ink-muted">
          {sessionsDone} / {sessionsTotal} 세션
        </p>
      </div>

      <div className="mt-2">
        <ProgressBar value={progress} label={`${name} 진행률`} />
      </div>
    </Link>
  );
}
