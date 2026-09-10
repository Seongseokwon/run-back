/**
 * 카카오 연동 해제 (PRD §9.6 "소셜 연동 해제 포함").
 *
 * **삭제를 여기에 걸지 않는다.** 이 함수가 실패해도, 카카오가 죽어 있어도,
 * 토큰이 만료됐어도 탈퇴는 그대로 진행된다. 외부 API 사정 때문에 정보주체의
 * 삭제 요구가 막히면 그게 더 큰 문제다 (법 제36조는 지체 없는 처리를 요구한다).
 *
 * 왜 자주 실패하는가: 우리는 카카오 회원번호를 해시로만 저장하고(§9.8) 액세스 토큰도
 * DB 에 두지 않는다. 남은 수단이 세션 쿠키 안의 토큰뿐인데 그건 몇 시간이면 만료된다.
 * **식별자를 덜 갖는 대가**이고, 그 거래는 의도한 것이다.
 * 그래서 탈퇴 화면은 수동 해제 방법을 함께 안내한다.
 */

const UNLINK_URL = 'https://kapi.kakao.com/v1/user/unlink';

export type UnlinkResult = 'unlinked' | 'no-token' | 'failed';

export async function unlinkKakao(accessToken: string | undefined): Promise<UnlinkResult> {
  if (!accessToken) return 'no-token';

  try {
    const res = await fetch(UNLINK_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      // 탈퇴 응답이 외부 API 때문에 늘어지지 않게 한다
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? 'unlinked' : 'failed';
  } catch {
    return 'failed';
  }
}
