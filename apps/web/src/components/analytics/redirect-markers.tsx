'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { track } from '@/lib/analytics';
import { EVENTS } from '@/lib/analytics-events';

/**
 * 리다이렉트에 실린 마커를 읽어 이벤트를 쏜다.
 *
 * 로그인 완료·플랜 저장·게스트 이전은 **서버에서 일어나고 리다이렉트로 끝난다.**
 * 서버에서는 gtag 를 부를 수 없고, 도착 화면은 그게 방금 일어난 일인지 모른다.
 * 그래서 리다이렉트 목적지에 짧은 마커를 실어 보내고 여기서 읽는다.
 *
 * 마커는 **결과가 확정된 뒤에만** 붙으므로 '눌렀다'가 아니라 '됐다'를 센다.
 *
 * 읽고 나면 `history.replaceState` 로 주소에서 지운다 — 내비게이션 없이 URL 만 정리한다.
 * 남겨 두면 사용자가 그 링크를 공유했을 때 남의 방문이 우리 전환으로 집계된다.
 */
export function RedirectMarkers() {
  const params = useSearchParams();
  const handled = useRef(false);

  const li = params.get('li');
  const saved = params.get('saved');

  useEffect(() => {
    if (handled.current) return;
    if (!li && !saved) return;
    handled.current = true;

    // li=kakao | password — §15 login_completed(제공자)
    if (li) track(EVENTS.loginCompleted, { provider: li });

    // saved=new | migrated — §15 plan_saved / plan_migrated
    if (saved === 'migrated') {
      track(EVENTS.planMigrated, { result: 'success' });
      track(EVENTS.planSaved, { method: 'account', from: 'guest' });
    } else if (saved) {
      track(EVENTS.planSaved, { method: 'account', from: 'account' });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('li');
    url.searchParams.delete('saved');
    window.history.replaceState(null, '', url.toString());
  }, [li, saved]);

  return null;
}
