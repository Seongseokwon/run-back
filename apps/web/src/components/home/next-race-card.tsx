import { Card, SectionLabel } from '@/components/ui/card';
import { Illustration } from '@/components/ui/illustration';
import { ProgressBar } from '@/components/ui/progress-bar';
import { formatDday } from '@/lib/format';

/** 홈 상단 — 다음 대회와 D-day. 이 서비스의 앵커 그 자체다 (PRD §1) */
export function NextRaceCard({
  raceName,
  daysLeft,
  goalLabel,
  progress,
}: {
  raceName: string;
  daysLeft: number;
  /** '01:00:00' 또는 '완주' */
  goalLabel: string;
  /** 플랜 진행률 0~1 */
  progress: number;
}) {
  return (
    <Card className="relative overflow-hidden px-5 pt-5 pb-4">
      <div className="relative z-1">
        <SectionLabel>Next race</SectionLabel>
        <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">{raceName}</h2>
        <p className="tabular mt-2 text-[64px] leading-none font-extrabold tracking-tighter text-ink">
          {formatDday(daysLeft)}
        </p>
        <p className="mt-1 text-[14px] font-medium tracking-wide text-ink-muted uppercase">days to go</p>
      </div>

      {/* 일러스트는 카드 오른쪽 위에 겹쳐 놓는다 */}
      <div className="pointer-events-none absolute top-8 right-4">
        <Illustration name="raceScene" width={200} />
      </div>

      <div className="relative z-1 mt-5 flex justify-end">
        <p className="text-[17px] font-bold text-ink">
          <span className="mr-2 font-semibold text-ink-muted">목표</span>
          <span className="tabular">{goalLabel}</span>
        </p>
      </div>
      <div className="relative z-1 mt-3">
        <ProgressBar value={progress} label="플랜 진행률" />
      </div>
    </Card>
  );
}
