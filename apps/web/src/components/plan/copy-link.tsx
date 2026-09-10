'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { EVENTS } from '@/lib/analytics-events';

/**
 * 링크 복사 — F-08 의 사용자 대면 형태.
 * "이 링크를 저장하면 언제든 다시 볼 수 있어요" 가 로그인 없는 저장의 전부다 (§10.6).
 */
/**
 * @param signedIn 로그인 상태. 비로그인일 때의 복사는 **로그인 대신 링크를 택한 것**이라
 *   §15 `login_dismissed` 로 센다 — PRD 가 정의한 신호가 "링크 복사로 대체했는지 여부"다.
 *
 *   ⚠️ 한계를 알고 쓴다: 로그인 화면을 열었다가 그냥 떠난 경우는 잡지 못한다.
 *   브라우저가 '떠남'을 신뢰성 있게 알려 주지 않는다. 여기서 세는 것은 **대체 행동**이다.
 */
export function CopyLinkButton({ signedIn = false }: { signedIn?: boolean }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState('done');
      if (!signedIn) track(EVENTS.loginDismissed, { trigger: 'save', replaced_with: 'link' });
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
        className="flex h-12 w-full items-center justify-center rounded-control border border-line-strong bg-surface text-body font-bold text-ink"
      >
        {state === 'done' ? '링크를 복사했습니다' : '링크 복사해서 저장'}
      </button>
      <p className="mt-2 text-center text-label text-ink-muted">
        {state === 'failed'
          ? '복사에 실패했습니다. 주소창의 링크를 직접 저장해 주세요.'
          : '이 링크를 저장하면 로그인 없이 언제든 같은 플랜을 다시 볼 수 있습니다'}
      </p>
    </div>
  );
}
