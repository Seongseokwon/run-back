'use server';

import { revalidatePath } from 'next/cache';
import { listLogs, removeLog, upsertLog, type LogStatus } from '@runback/db';
import { currentUserId } from './session.ts';

/**
 * 수행 체크 (F-12).
 *
 * 이게 붙어야 진행률·캘린더·'최근 러닝'이 진짜가 된다. 그전까지는 '날짜가 지났으면 완료'로
 * 대신하고 있었는데(O17), 그러면 일주일을 통째로 쉰 사람에게도 진행률이 올라간다.
 *
 * planId 는 화면에서 넘어오므로 **소유자 확인을 여기서 한다.** 저장소 함수가
 * userId 를 함께 걸기 때문에 남의 플랜에 기록을 남길 수는 없다.
 */

export type ToggleResult = { ok: boolean };

/**
 * 완료 토글. 이미 완료면 기록을 지우고(체크 해제), 아니면 완료로 남긴다.
 *
 * 지우는 쪽을 '건너뜀'으로 바꾸지 않는다 — 잘못 눌렀을 때 되돌릴 방법이 있어야 하고,
 * '건너뜀'은 사용자가 의도적으로 고르는 상태다.
 */
export async function toggleSessionDone(planId: string, date: string): Promise<ToggleResult> {
  const userId = await currentUserId();
  if (!userId || !isIsoDate(date)) return { ok: false };

  const existing = (await listLogs(userId, planId)).find((l) => l.date === date);

  if (existing && existing.status !== 'skipped') {
    await removeLog(userId, planId, date);
  } else {
    await upsertLog({ userId, planId, date, status: 'done' });
  }

  revalidateScreens();
  return { ok: true };
}

/** '건너뜀'처럼 명시적인 상태를 남긴다. 같은 상태를 다시 누르면 기록을 지운다 */
export async function setSessionStatus(
  planId: string,
  date: string,
  status: LogStatus,
): Promise<ToggleResult> {
  const userId = await currentUserId();
  if (!userId || !isIsoDate(date)) return { ok: false };

  const existing = (await listLogs(userId, planId)).find((l) => l.date === date);
  if (existing?.status === status) {
    await removeLog(userId, planId, date);
  } else {
    await upsertLog({ userId, planId, date, status });
  }

  revalidateScreens();
  return { ok: true };
}

/**
 * 기록 하나가 바뀌면 네 화면이 같이 바뀐다 — 진행률·이번 주·캘린더·최근 러닝.
 * 한 곳만 갱신하면 다른 탭이 옛 숫자를 들고 있어서 사용자가 뭘 믿어야 할지 모른다.
 */
function revalidateScreens(): void {
  revalidatePath('/today');
  revalidatePath('/races');
  revalidatePath('/races/[slug]', 'page');
  revalidatePath('/log');
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (v: string): boolean => typeof v === 'string' && ISO.test(v);
