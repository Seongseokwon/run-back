/**
 * 이벤트 전송 (GA4).
 *
 * 측정 ID 가 없으면 **아무것도 하지 않는다.** 로컬·프리뷰에서 실수로 실데이터에
 * 섞이는 것을 막고, 스크립트 자체도 로드되지 않는다 (google-analytics.tsx).
 *
 * 실패해도 조용히 넘어간다 — 계측 때문에 화면이 깨지면 본말이 뒤집힌다.
 * 광고 차단기가 gtag 를 지우는 일이 흔하다.
 */

import type { EventName, EventParams } from './analytics-events.ts';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';

export function isAnalyticsEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}

type Gtag = (command: 'event', name: string, params?: EventParams) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

/** undefined 인 속성은 빼고 보낸다. GA4 에서 빈 값이 하나의 값처럼 집계된다 */
function clean(params: EventParams): EventParams {
  const out: EventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * 이벤트 전송.
 *
 * `window.gtag` 를 부른다. shim 은 `beforeInteractive` 로 하이드레이션 전에 정의되므로
 * 이펙트가 아무리 일찍 돌아도 항상 존재한다 (google-analytics.tsx 주석 참조).
 *
 * ⚠️ `dataLayer` 에 직접 배열을 밀어 넣지 말 것. GA 는 `arguments` 객체를 기대하고,
 * 배열은 **조용히 버린다** — 로그에는 보내진 것처럼 찍히는데 집계에는 안 잡힌다.
 * 아래 폴백도 같은 이유로 함수 표현식(arguments 사용)이다.
 */
export function track(name: EventName, params: EventParams = {}): void {
  if (typeof window === 'undefined' || !isAnalyticsEnabled()) return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, clean(params));
      return;
    }
    // 스크립트가 아직 없다면(광고 차단기 등) 큐만 쌓아 둔다
    const queue = (window.dataLayer = window.dataLayer ?? []);
    const push = function (this: unknown, ..._args: unknown[]): void {
      // eslint-disable-next-line prefer-rest-params
      queue.push(arguments);
    };
    push('event', name, clean(params));
  } catch {
    // 계측 실패가 화면을 막지 않는다
  }
}
