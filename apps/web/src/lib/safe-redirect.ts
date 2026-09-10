/**
 * 로그인 뒤 돌아갈 경로를 검증한다.
 *
 * **쿼리에서 온 값을 그대로 리다이렉트에 쓰면 오픈 리다이렉트가 된다.**
 * `/login?callbackUrl=https://evil.example` 같은 링크를 뿌리면 사용자는 우리 도메인에서
 * 로그인하고 남의 사이트로 튕겨 나간다 — 피싱의 고전적인 형태다.
 *
 * 그래서 **같은 사이트 안의 경로만** 통과시킨다. 판정은 문자열로 한다:
 *  - `/` 로 시작해야 하고
 *  - `//evil.com` 은 프로토콜 상대 URL 이라 막는다
 *  - `/\evil.com` 은 브라우저가 `//` 로 해석하는 경우가 있어 함께 막는다
 *  - 제어문자가 섞인 값은 브라우저마다 다르게 해석하므로 막는다
 */

import type { Route } from 'next';

/** 검증에 실패했을 때 돌아갈 곳 */
export const DEFAULT_AFTER_LOGIN = '/today' as Route;

/** 정규식 리터럴에 제어문자를 직접 적지 않는다 — 소스가 읽기 어려워진다 */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * 통과한 값은 **같은 사이트 안의 경로**임이 보장되므로 Route 로 단언한다.
 * (typedRoutes 는 조립된 문자열을 검증하지 못한다 — 검증은 위 규칙들이 한다)
 */
export function safeCallbackUrl(value: unknown): Route {
  if (typeof value !== 'string' || value.length === 0) return DEFAULT_AFTER_LOGIN;
  if (value.length > 2000) return DEFAULT_AFTER_LOGIN;
  if (!value.startsWith('/')) return DEFAULT_AFTER_LOGIN;
  if (value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_AFTER_LOGIN;
  if (hasControlChar(value)) return DEFAULT_AFTER_LOGIN;
  return value as Route;
}

/**
 * 로그인 성공을 도착 화면에 알리는 마커를 붙인다 (§15 `login_completed`).
 *
 * 서버에서는 gtag 를 못 부르고, 도착 화면은 그게 방금 로그인한 결과인지 모른다.
 * 그래서 목적지에 `li=<제공자>` 를 얹고 도착해서 읽는다
 * (components/analytics/redirect-markers.tsx 가 읽고 주소에서 지운다).
 *
 * 이미 검증된 내부 경로에만 쓴다 — 외부 주소는 safeCallbackUrl 에서 이미 걸러진다.
 */
export function withLoginMarker(path: Route, provider: 'kakao' | 'password'): Route {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}li=${provider}` as Route;
}
