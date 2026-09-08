import type { ReactNode } from 'react';
import { Illustration } from '@/components/ui/illustration';
import type { IllustrationName } from '@/lib/illustrations';

/**
 * 빈 상태. 목업의 "새로운 목표를 추가해보세요" 카드가 기준이다.
 *
 * 빈 화면에 "데이터가 없습니다"만 띄우는 건 막다른 길이다.
 * 여기서 뭘 하면 되는지를 같이 준다.
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
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
      <Illustration name={illustration} width={150} />
      <div>
        <p className="text-[16px] font-bold text-ink">{title}</p>
        {description ? <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="w-full max-w-[16rem]">{action}</div> : null}
    </div>
  );
}
