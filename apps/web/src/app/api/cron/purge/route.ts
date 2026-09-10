import { purgeDeletedUsers, HARD_DELETE_AFTER_DAYS } from '@runback/db';

/**
 * 탈퇴 유예가 지난 계정을 실제로 파기한다 (F-18 의 나머지 절반).
 *
 * ⚠️ **이 엔드포인트가 돌지 않으면 개인정보처리방침이 거짓말이 된다.**
 * 방침 제4·9항이 "15일 이내 완전 삭제"를 약속하고 있는데, soft delete 만 하고
 * 실제로 지우는 장치가 없으면 그 자체가 위반이다. vercel.json 의 crons 가 이걸 부른다.
 *
 * 보호: Vercel Cron 은 `Authorization: Bearer $CRON_SECRET` 을 붙여 준다.
 * 공개 엔드포인트라 이 검사가 없으면 누구나 파기를 트리거할 수 있다 —
 * 파기는 되돌릴 수 없으므로 인증 없이 열어 두면 안 된다.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // 비밀값이 없으면 열어 두지 않는다. 설정 누락이 곧 공개가 되면 안 된다
    return new Response('CRON_SECRET not configured', { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const purged = await purgeDeletedUsers();

  return Response.json(
    { purged, thresholdDays: HARD_DELETE_AFTER_DAYS, ranAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
