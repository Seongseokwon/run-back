import { exportUserData } from '@runback/db';
import { currentUserId } from '@/lib/session';

/**
 * 내 데이터 내보내기 (F-19) — 정보주체 열람권 (개인정보보호법 제35조).
 *
 * route handler 인 이유: 파일 다운로드는 Content-Disposition 헤더가 필요해서
 * 서버 컴포넌트로는 안 된다. 응답을 만드는 게 목적인 몇 안 되는 경우다.
 *
 * 캐시 금지가 중요하다 — 개인 데이터가 CDN 이나 브라우저 캐시에 남으면 안 된다.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const userId = await currentUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const data = await exportUserData(userId);
  if (!data) return new Response('Not Found', { status: 404 });

  const filename = `runback-my-data-${data.exportedAt.slice(0, 10)}.json`;

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, private',
    },
  });
}
