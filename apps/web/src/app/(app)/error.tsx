'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * 앱 셸 오류 화면.
 * 사용자에게 스택 트레이스를 보여줄 이유는 없다. 다시 시도할 방법과 돌아갈 길만 준다.
 */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-5 pt-6">
      <EmptyState
        title="화면을 불러오지 못했습니다"
        description="일시적인 문제일 수 있습니다. 다시 시도해 보세요."
        action={
          <div className="space-y-2">
            <Button onClick={reset} size="md">
              다시 시도
            </Button>
            <ButtonLink href="/today" variant="ghost" size="md">
              오늘로
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
