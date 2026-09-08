'use client';

import { useState } from 'react';

/**
 * 링크 복사 — F-08 의 사용자 대면 형태.
 * "이 링크를 저장하면 언제든 다시 볼 수 있어요" 가 로그인 없는 저장의 전부다 (§10.6).
 */
export function CopyLinkButton() {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('failed');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        className="flex h-12 w-full items-center justify-center rounded-control border border-line-strong bg-surface text-[16px] font-bold text-ink"
      >
        {state === 'done' ? '링크를 복사했습니다' : '링크 복사해서 저장'}
      </button>
      <p className="mt-2 text-center text-[13px] text-ink-muted">
        {state === 'failed'
          ? '복사에 실패했습니다. 주소창의 링크를 직접 저장해 주세요.'
          : '이 링크를 저장하면 로그인 없이 언제든 같은 플랜을 다시 볼 수 있습니다'}
      </p>
    </div>
  );
}
