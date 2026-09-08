import { Card, SectionLabel } from '@/components/ui/card';
import { BigStat } from '@/components/ui/stat';
import { Illustration } from '@/components/ui/illustration';
import { ProgressBar } from '@/components/ui/progress-bar';
import { distanceLabel, formatDday } from '@/lib/format';

/** 홈 상단 — 다음 대회와 D-day. 이 서비스의 앵커 그 자체다 (PRD §1) */
export function NextRaceCard({
  raceName,
  distanceKm,
  daysLeft,
  goalLabel,
  progress,
}: {
  raceName: string;
  distanceKm: number;
  daysLeft: number;
  /** '01:00:00' 또는 '완주' */
  goalLabel: string;
  /** 플랜 진행률 0~1 */
  progress: number;
}) {
  return (
    <Card lifted className="relative overflow-hidden px-5 pt-5 pb-4">
      {/* 일러스트를 먼저 깔고 텍스트를 그 위에 올린다.
          텍스트 열에 max-width 를 줘서 그림 위로 글자가 올라타지 않게 한다 */}
      <div aria-hidden className="pointer-events-none absolute -top-2 -right-4 opacity-90">
        <Illustration name="raceScene" width={215} />
      </div>

      <div className="relative max-w-[62%]">
        <SectionLabel>Next race</SectionLabel>
        <h2 className="mt-1 line-clamp-2 text-[22px] leading-tight font-extrabold tracking-tight text-ink">
          {raceName}
        </h2>
        <div className="mt-3">
          <BigStat value={formatDday(daysLeft)} size="hero" caption="days to go" />
        </div>
        <p className="tabular mt-2 text-[17px] font-bold text-ink-muted">{distanceLabel(distanceKm)}</p>
      </div>

      <div className="relative mt-5 flex justify-end">
        <p className="text-[17px] text-ink">
          <span className="mr-2 font-semibold text-ink-muted">목표</span>
          <span className="tabular font-bold">{goalLabel}</span>
        </p>
      </div>
      <div className="relative mt-3">
        <ProgressBar value={progress} label="플랜 진행률" />
      </div>
    </Card>
  );
}
