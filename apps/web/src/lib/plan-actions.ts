'use server';

import { ENGINE_VERSION } from '@runback/engine';
import { savePlan } from '@runback/db';
import { decodePlanRequest } from './plan-url.ts';
import { planTitle } from './plan-title.ts';
import { currentUserId } from './session.ts';

export type SaveResult =
  | { ok: true; planId: string }
  /** 로그인이 필요하다. 호출부는 로그인으로 보내되 **플랜을 잃지 않아야 한다** */
  | { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'invalid' };

/**
 * 플랜 저장 (F-17).
 *
 * 인코딩된 `p` 를 그대로 받아 **여기서 다시 검증한다.** 화면에서 이미 디코드했더라도
 * 서버 액션은 클라이언트가 부르는 경계라 넘어온 값을 신뢰하지 않는다.
 *
 * 저장하는 것은 `input` 과 `engineVersion` 뿐이다 — 플랜 본문은 넣지 않는다 (§9.7).
 */
export async function savePlanAction(encoded: string): Promise<SaveResult> {
  const req = decodePlanRequest(encoded);
  if (!req) return { ok: false, reason: 'invalid' };

  const userId = await currentUserId();
  if (!userId) return { ok: false, reason: 'unauthenticated' };

  const saved = await savePlan({
    userId,
    input: req.input,
    engineVersion: ENGINE_VERSION,
    title: planTitle(req),
    raceSlug: req.raceSlug,
  });

  return { ok: true, planId: saved.id };
}
