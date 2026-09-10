/**
 * 현재 로그인 사용자.
 *
 * 화면과 어댑터는 이 두 함수만 안다. 세션의 출처가 바뀌어도 고칠 파일은 여기뿐이다.
 *
 * 한때 .env 의 RUNBACK_DEV_USER_ID 를 읽는 개발 통로가 있었는데 걷어냈다.
 * 비밀번호 로그인이 생겨서 필요가 없어졌고, 무엇보다 **개발 중에 항상 로그인 상태로
 * 보여서 게스트 경로를 테스트할 수 없었다.** 게스트 흐름은 이 제품의 주 동선이다 (§9.2).
 */

import { auth } from '@/auth';

export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** 표시용. 닉네임을 카카오에서 받지 않으므로(§9.4) 대개 null 이다 */
export async function currentUser(): Promise<{ id: string; nickname: string | null } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, nickname: session.user.nickname };
}
