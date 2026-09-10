/**
 * 현재 로그인 사용자.
 *
 * Phase 2(Auth.js + 카카오)가 붙으면 **이 파일만 바뀐다.** 화면과 어댑터는
 * currentUserId() 하나만 알고 있으면 되도록 좁혀 뒀다.
 *
 * 지금은 인증이 없어서 .env 의 RUNBACK_DEV_USER_ID 를 읽는다. 도그푸딩용 통로다 —
 * 값이 없으면 null 이고, 그러면 앱 셸 화면들은 '아직 플랜이 없는' 상태로 그려진다.
 * 로그인한 척하는 가짜 세션을 만들지 않는다.
 */

export async function currentUserId(): Promise<string | null> {
  return process.env.RUNBACK_DEV_USER_ID ?? null;
}
