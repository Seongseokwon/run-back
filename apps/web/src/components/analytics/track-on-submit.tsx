'use client';

import type { ReactNode } from 'react';
import { track } from '@/lib/analytics';
import type { EventName, EventParams } from '@/lib/analytics-events';

/**
 * 폼을 제출할 때 이벤트를 쏜다.
 *
 * 서버 액션의 **결과**는 브라우저가 알 수 없다 — 액션은 서버에서 돌고 화면은 revalidate 로
 * 갱신되기 때문에 gtag 를 부를 자리가 없다. 그래서 '눌렀다'를 기준으로 센다.
 *
 * 이 타협을 알고 쓴다: 서버에서 실패하면 이벤트만 남는다. 다만 여기 붙는 동작
 * (수행 체크·탈퇴)은 실패 경로가 거의 없고, 실패해도 대시보드의 추세를 뒤집지 않는다.
 * 정확도가 중요한 이벤트(저장·전환)는 **리다이렉트 마커**로 결과를 확인해서 보낸다.
 */
export function TrackOnSubmit({
  name,
  params,
  children,
}: {
  name: EventName;
  params?: EventParams;
  children: ReactNode;
}) {
  return (
    <span
      onClickCapture={() => {
        track(name, params ?? {});
      }}
      className="contents"
    >
      {children}
    </span>
  );
}
