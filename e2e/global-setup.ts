import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Playwright 는 --env-file 을 쓰지 않는다. 저장소를 부르기 전에 루트 .env 를 직접 얹는다
process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), '..', '.env'));

const { registerPasswordUser } = await import('../packages/db/src/password-auth.ts');
const { prisma } = await import('../packages/db/src/client.ts');

/**
 * 계정 테스트용 사용자를 만든다.
 *
 * **왜 여기서 만드나.** 공개 가입 화면이 없다 (PRD §9.3 — 열린 가입 엔드포인트는
 * 스팸 대응이 먼저다). 그래서 계정은 CLI 나 이 파일처럼 저장소를 직접 부르는 자리에서만
 * 생긴다. 테스트가 사람이 쓰는 계정에 붙으면 탈퇴 테스트가 그 계정을 지워 버린다.
 *
 * 이미 있으면 그대로 쓴다(멱등). DB 가 꺼져 있으면 **실패시키지 않고 넘어간다** —
 * 게스트 경로는 DB 없이도 전부 돌아야 하고(§9.5), 계정 테스트는 스스로 skip 한다.
 */

export const E2E_EMAIL = 'e2e@runback.kr';
export const E2E_PASSWORD = 'e2e-playwright-1234';

export default async function globalSetup(): Promise<void> {
  try {
    const result = await registerPasswordUser({ email: E2E_EMAIL, password: E2E_PASSWORD });
    if (result.ok) {
      console.log(`[e2e] 테스트 계정 생성: ${E2E_EMAIL}`);
    } else if (result.reason === 'taken') {
      console.log(`[e2e] 테스트 계정 재사용: ${E2E_EMAIL}`);
    } else {
      console.warn(`[e2e] 테스트 계정을 만들지 못했다 (${result.reason}) — 계정 테스트는 skip 된다`);
    }
  } catch (error) {
    console.warn('[e2e] DB 에 붙지 못했다 — 계정 테스트는 skip 된다:', (error as Error).message);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
