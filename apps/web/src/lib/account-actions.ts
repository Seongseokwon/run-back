'use server';

import { redirect } from 'next/navigation';
import { requestWithdrawal } from '@runback/db';
import { auth, signOut } from '@/auth';
import { unlinkKakao } from './kakao-unlink.ts';

/**
 * 회원 탈퇴 (F-18). **법적 의무이고 미구현 시 릴리즈 불가다** (PRD §9.6).
 *
 * 순서가 중요하다.
 *  1. 세션에서 사용자와 카카오 토큰을 꺼낸다 (로그아웃하면 못 꺼낸다)
 *  2. 접근 차단 — deletedAt 을 찍는다. **이게 실패하면 아무것도 하지 않고 멈춘다**
 *  3. 카카오 연동 해제 — best-effort. 실패해도 2번은 이미 끝났다
 *  4. 로그아웃
 *
 * 실제 파기는 15일 뒤 Cron 이 한다 (`/api/cron/purge`).
 * 방침에 적은 기한을 지키는 건 **그 Cron 이 도는지**에 달려 있다.
 */
export async function withdrawAction(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/me');

  const accessToken =
    typeof session?.kakaoAccessToken === 'string' ? session.kakaoAccessToken : undefined;

  const ok = await requestWithdrawal(userId);
  if (!ok) redirect('/me');

  // 여기부터는 실패해도 탈퇴를 되돌리지 않는다
  await unlinkKakao(accessToken);

  await signOut({ redirectTo: '/me/withdraw/done' });
}
