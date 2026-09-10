import { NextResponse, type NextRequest } from 'next/server';

/**
 * 루트 진입 갈라내기.
 *
 * `/` 는 검색 유입의 착지점이다 — 질문형 H1, 다가오는 대회, 목표 클러스터가 있고
 * 정적으로 사전 렌더된다 (PRD §13). 크롤러와 첫 방문자에게는 그대로 보여야 한다.
 * 이미 로그인한 사람에게만 앱 셸(`/today`)로 바꿔 준다.
 *
 * **이건 라우트를 막는 게 아니다.** §9.2 가 금지한 것은 콘텐츠를 로그인 벽 뒤에 두는 것인데,
 * 여기서는 로그인한 사람을 더 쓸모 있는 화면으로 보낼 뿐이고 비로그인은 아무것도 잃지 않는다.
 * 그래서 matcher 가 `/` 하나뿐이다 — 다른 경로는 이 파일이 건드리지 않는다.
 *
 * 쿠키의 **존재만** 본다. 서명 검증은 하지 않는다.
 *  - proxy 는 CDN 엣지에 배포될 수 있어 DB·비밀키에 기대면 안 된다
 *  - 틀려도 손해가 없다. 만료된 쿠키로 `/today` 에 가도 게스트 화면이 정상적으로 뜬다
 *    (로그인 없이도 동작하는 화면이라 리다이렉트 루프도 생기지 않는다)
 */

// Auth.js 기본 쿠키명. HTTPS 에서는 __Secure- 접두사가 붙는다
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

export function proxy(request: NextRequest): NextResponse {
  const signedIn = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!signedIn) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/today';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/',
};
