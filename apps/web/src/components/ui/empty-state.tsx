import type { ReactNode } from 'react';
import { SceneBand } from '@/components/ui/scene';
import type { IllustrationName } from '@/lib/illustrations';

/**
 * 빈 상태.
 *
 * 빈 화면에 "데이터가 없습니다"만 띄우는 건 막다른 길이다.
 * 여기서 뭘 하면 되는지를 같이 준다.
 *
 * 점선 상자 대신 씬을 깐다 — 점선 상자는 '아직 안 만든 화면'처럼 읽히는데,
 * 빈 상태는 미완성이 아니라 **정상적인 한 상태**다.
 */
export function EmptyState({
  illustration = 'emptyPlan',
  title,
  description,
  action,
}: {
  illustration?: IllustrationName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface-raised">
      <SceneBand name={illustration} rounded={false} aspect={2.4} />
      <div className="flex flex-col items-center gap-4 px-6 pt-5 pb-6 text-center">
        <div>
          <p className="text-body-lg font-bold text-ink">{title}</p>
          {description ? <p className="mt-1.5 text-body text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="w-full max-w-[16rem]">{action}</div> : null}
      </div>
    </div>
  );
}
