import type { ReactNode } from 'react';
import { SceneSurface } from '@/components/ui/scene';
import type { IllustrationName } from '@/lib/illustrations';

/**
 * 플랜이 '오늘 할 일'을 주지 않는 상태를 알리는 카드 — 시작 전 / 휴식일.
 *
 * 두 상태를 한 모양으로 묶되 문구와 그림은 절대 섞지 않는다.
 * 대회 날짜에서 주 단위로 역산하므로 첫 주가 다음 주 월요일부터일 수 있는데,
 * 그걸 '오늘은 휴식일'이라고 하면 플랜이 이미 돌아가는 것처럼 읽힌다.
 */
export function PlanStateCard({
  title,
  detail,
  illustration,
}: {
  title: ReactNode;
  detail: ReactNode;
  illustration: IllustrationName;
}) {
  return (
    <SceneSurface
      name={illustration}
      minHeight={210}
      className="rounded-card border border-line shadow-lifted"
    >
      <div className="px-5 pt-6 text-center">
        <p className="text-body-lg font-bold text-ink">{title}</p>
        <p className="mt-1.5 text-body text-ink-muted">{detail}</p>
      </div>
    </SceneSurface>
  );
}
