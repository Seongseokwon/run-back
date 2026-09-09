import { SectionLabel } from '@/components/ui/card';
import { BigStat } from '@/components/ui/stat';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SceneSurface } from '@/components/ui/scene';
import { distanceLabel, formatDday } from '@/lib/format';

/**
 * 다음 대회와 D-day. 이 서비스의 앵커 그 자체다 (PRD §1).
 *
 * 목업 기준으로 **밝은 카드에 검정 D-day**다. 보라는 라벨과 진행률에만 쓴다.
 * 다만 그림을 구석에 오려 붙이지 않고 카드 바탕으로 깐다 — 아트워크의 위쪽 절반이
 * 비어 있는 하늘이라 거기에 글자를 올리라고 만든 그림이다.
 *
 * 목표와 진행바는 그림 **밖** 흰 바닥에 앉힌다. 그림 위에 반투명 띠로 얹어 봤더니
 * 씬의 아래쪽(러너와 길)을 정확히 덮어서 그림이 있으나 마나 했다.
 */
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
    <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-lifted">
      <SceneSurface name="raceScene" minHeight={300}>
        <div className="px-5 pt-5">
          <SectionLabel>Next race</SectionLabel>
          <h2 className="mt-1.5 line-clamp-2 text-card font-extrabold tracking-tight text-ink">
            {raceName}
          </h2>
          <div className="mt-2">
            <BigStat value={formatDday(daysLeft)} size="hero" />
          </div>
          {/* 캡션과 거리를 한 줄로 붙인다 — 두 줄로 내리면 씬의 러너를 가린다 */}
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-label font-semibold tracking-[0.08em] text-ink-muted uppercase">
              days to go
            </span>
            <span className="tabular text-body-lg font-bold text-ink">
              {distanceLabel(distanceKm)}
            </span>
          </p>
        </div>
      </SceneSurface>

      <div className="border-t border-line px-5 py-3.5">
        <p className="text-right text-body-lg text-ink">
          <span className="mr-2 font-semibold text-ink-muted">목표</span>
          <span className="tabular font-bold">{goalLabel}</span>
        </p>
        <div className="mt-2">
          <ProgressBar value={progress} label="플랜 진행률" />
        </div>
      </div>
    </div>
  );
}
