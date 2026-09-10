'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';
import type { EventName, EventParams } from '@/lib/analytics-events';

/**
 * 서버 컴포넌트가 이벤트를 쏘는 통로.
 *
 * `gtag` 는 브라우저에만 있어서 서버 컴포넌트에서 직접 못 부른다. 화면이 그려질 때
 * 한 번 발생하는 이벤트(`verdict_shown`, `plan_generated`, `login_prompted` …)는
 * 이 컴포넌트를 렌더해서 보낸다. 아무것도 그리지 않는다.
 *
 * `useRef` 로 한 번만 보낸다 — React 개발 모드의 이중 실행(StrictMode)과
 * 리렌더에서 같은 이벤트가 두 번 가면 코호트 숫자가 부풀려진다.
 *
 * `dedupeKey` 가 바뀌면 다시 보낸다. 같은 화면에서 대상이 바뀌는 경우
 * (예: 다른 플랜을 열었다)를 구분하려는 것이다.
 */
export function TrackEvent({
  name,
  params,
  dedupeKey,
}: {
  name: EventName;
  params?: EventParams;
  dedupeKey?: string;
}) {
  const sent = useRef<string | null>(null);
  const key = dedupeKey ?? name;

  useEffect(() => {
    if (sent.current === key) return;
    sent.current = key;
    track(name, params ?? {});
    // params 는 매 렌더 새 객체라 의존성에 넣지 않는다. 재전송 기준은 key 다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name]);

  return null;
}
