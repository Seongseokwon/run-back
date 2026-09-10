import { generatePlan } from '@runback/engine';
import { findRace } from '@runback/races';
import { planToIcs } from '@/lib/calendar-ics';
import { decodePlanRequest } from '@/lib/plan-url';
import { planTitle } from '@/lib/plan-title';
import { findMyRace } from '@/lib/my-races';

/**
 * 훈련 플랜 캘린더 내보내기 (F-11).
 *
 * **게스트와 회원이 같은 경로를 쓴다.**
 *  - `?p=<인코딩된 입력>` — 로그인 없이. 플랜 결과 화면에서 바로 받는다
 *  - `?plan=<key>` — 저장된 플랜. 로그인 필요
 *
 * 엔진이 결정론적이라 둘 다 같은 결과를 낸다 (§4.2). 게스트 경로를 남겨 두는 이유는
 * 로그인 벽 없이 플랜을 끝까지 쓸 수 있어야 하기 때문이다 (§9.2).
 *
 * 이 리포에서 route handler 를 쓰는 몇 안 되는 경우다 — 파일 응답이라
 * Content-Type·Content-Disposition 을 직접 만들어야 한다.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const encoded = url.searchParams.get('p');
  const planKey = url.searchParams.get('plan');

  const found = encoded ? fromEncoded(encoded) : planKey ? await fromSaved(planKey) : null;
  if (!found) return new Response('Not Found', { status: 404 });

  const ics = planToIcs(found.plan, { calendarName: found.name, planKey: found.key });

  return new Response(ics, {
    headers: {
      // charset 을 붙이지 않으면 한글 요약이 깨지는 캘린더가 있다
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${asciiFilename(found.name)}"; filename*=UTF-8''${encodeURIComponent(`${found.name}.ics`)}`,
      // 개인 훈련 일정이다. CDN 이나 공용 캐시에 남으면 안 된다
      'Cache-Control': 'no-store, private',
    },
  });
}

type Found = { plan: ReturnType<typeof generatePlan>; name: string; key: string };

/** 게스트 경로 — URL 에 실린 입력에서 그대로 만든다 */
function fromEncoded(encoded: string): Found | null {
  const req = decodePlanRequest(encoded);
  if (!req) return null;

  const race = req.raceSlug ? findRace(req.raceSlug) : undefined;
  return {
    plan: generatePlan(req.input),
    name: race?.nameKo ?? planTitle(req),
    // 인코딩된 입력이 곧 플랜의 정체성이다. 같은 플랜을 다시 받아도 UID 가 유지된다
    key: encoded.slice(0, 40),
  };
}

/** 회원 경로 — 저장된 플랜. 남의 플랜은 findMyRace 가 걸러 준다 */
async function fromSaved(key: string): Promise<Found | null> {
  const mine = await findMyRace(key);
  if (!mine) return null;
  return { plan: mine.plan, name: mine.name, key: mine.planId };
}

/**
 * 구형 클라이언트를 위한 ASCII 파일명. 한글 이름은 `filename*` 쪽이 담는다.
 * 헤더에 그대로 넣으면 따옴표·개행으로 헤더가 깨질 수 있어 걷어낸다.
 */
function asciiFilename(name: string): string {
  const safe = name.replaceAll(/[^\w.-]+/g, '-').replaceAll(/^-+|-+$/g, '');
  return `${safe || 'runback-plan'}.ics`;
}
