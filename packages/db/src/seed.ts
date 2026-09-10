/**
 * 개발용 시드 — 도그푸딩 플랜 한 건.
 *
 * PRD §12 의 실제 목표 대회(MBN 서울마라톤 하프)를 넣는다. 화면을 채우려는 목적만이
 * 아니라 **엔진 → 저장소 → 화면 배선이 실제로 도는지** 확인하는 역할이다.
 *
 * ⚠️ 수행 기록(SessionLog)은 만들지 않는다. 실제로 뛴 거리·페이스가 아직 없고,
 * 없는 걸 있는 것처럼 보여 주면 진행률과 캘린더가 거짓말을 한다 (CLAUDE.md §0-3).
 *
 *   pnpm --filter @runback/db seed -- <이메일>     (기본값: test@runback.kr)
 */

import { prisma } from './client.ts';
import { hashProviderUserId } from './users.ts';
import { normalizeEmail } from './password-auth.ts';

/**
 * 플랜을 붙일 계정. 먼저 만들어 둬야 한다:
 *   pnpm --filter @runback/db user:create -- <이메일> <비밀번호10자이상>
 *
 * 예전엔 'dev-user' 를 직접 만들어 붙였는데, 그러면 **로그인할 수 없는 계정**에
 * 플랜이 달려서 실제 화면으로 확인이 안 된다.
 */
const DEFAULT_EMAIL = 'test@runback.kr';

/** PRD §12 도그푸딩 — 하프까지 10주는 §7.3 최소 권장 주차에 정확히 걸리는 경계값이다 */
const PLAN_INPUT = {
  raceDate: '2026-11-15',
  raceDistanceM: 21097.5,
  today: '2026-09-07',
  fitness: { kind: 'race', distanceM: 10000, timeSec: 50 * 60 },
  goal: { kind: 'time', targetSec: 115 * 60 },
  daysPerWeek: 4,
  currentWeeklyKm: 30,
};

async function main(): Promise<void> {
  const email = normalizeEmail(process.argv.slice(2).filter((a) => a !== '--')[0] ?? DEFAULT_EMAIL);
  if (!email) throw new Error('이메일 형식이 올바르지 않습니다');

  const user = await prisma.user.findFirst({
    where: {
      provider: 'password',
      providerUserIdHash: hashProviderUserId('password', email),
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!user) {
    console.error(`계정을 찾을 수 없습니다: ${email}`);
    console.error("먼저 만드세요:  pnpm --filter @runback/db user:create -- <이메일> <비밀번호>");
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.savedPlan.findFirst({
    where: { userId: user.id, raceSlug: 'mbn-seoul-marathon-2026' },
  });
  if (existing) {
    console.log('시드 플랜이 이미 있습니다:', existing.id);
    return;
  }

  const plan = await prisma.savedPlan.create({
    data: {
      userId: user.id,
      input: PLAN_INPUT,
      // 저장 시점의 엔진 버전 (§9.7). 엔진이 올라가면 이 플랜은 outdated 로 표시된다
      engineVersion: '0.2.0',
      raceSlug: 'mbn-seoul-marathon-2026',
      title: '2026 MBN 서울마라톤 하프 1:55',
    },
  });
  console.log('시드 플랜 생성:', plan.id, plan.title);
}

await main();
await prisma.$disconnect();
