'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { track } from '@/lib/analytics';
import type { EventName, EventParams } from '@/lib/analytics-events';

/**
 * 안에 있는 것을 **누를 때** 이벤트를 쏜다. 폼 제출 버튼과 링크 모두에 쓴다.
 *
 * 서버 액션의 **결과**는 브라우저가 알 수 없고(액션은 서버에서 돌고 화면은 revalidate 로
 * 갱신된다), 링크는 화면이 통째로 바뀐다. 그래서 '눌렀다'를 기준으로 센다.
 *
 * 이 타협을 알고 쓴다: 서버에서 실패하면 이벤트만 남는다. 다만 여기 붙는 동작
 * (수행 체크·목표 조정)은 실패 경로가 거의 없고, 실패해도 대시보드의 추세를 뒤집지 않는다.
 * 정확도가 중요한 이벤트(저장·전환)는 **리다이렉트 마커**로 결과를 확인해서 보낸다.
 *
 * ⚠️ React 의 `onClickCapture` 를 쓰지 않는다. 서버 컴포넌트가 넘겨준 `children` 을
 * 감싸는 구조에서는 합성 이벤트가 실제로 오지 않는 경우가 있었다 — 링크는 이동하는데
 * 이벤트만 조용히 빠졌다. **네이티브 리스너**는 DOM 트리만 보므로 그 영향을 받지 않는다.
 *
 * 캡처 단계에 붙이는 이유: 링크가 화면을 바꾸기 전에 먼저 잡아야 한다.
 */
export function TrackOnClick({
  name,
  params,
  children,
}: {
  name: EventName;
  params?: EventParams;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // params 는 매 렌더 새 객체다. 최신 값을 리스너에 흘려 넣되 재등록은 하지 않는다
  const latest = useRef({ name, params });
  latest.current = { name, params };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (): void => {
      track(latest.current.name, latest.current.params ?? {});
    };
    el.addEventListener('click', onClick, true);
    return () => el.removeEventListener('click', onClick, true);
  }, []);

  return (
    <span ref={ref} className="contents">
      {children}
    </span>
  );
}
