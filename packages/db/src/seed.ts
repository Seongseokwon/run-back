/**
 * 개발용 시드 — 도그푸딩 플랜 한 건.
 *
 * PRD §12 의 실제 목표 대회(MBN 서울마라톤 하프)를 넣는다. 화면을 채우려는 목적만이
 * 아니라 **엔진 → 저장소 → 화면 배선이 실제로 도는지** 확인하는 역할이다.
 *
 * ⚠️ 수행 기록(SessionLog)은 만들지 않는다. 실제로 뛴 거리·페이스가 아직 없고,
 * 없는 걸 있는 것처럼 보여 주면 진행률과 캘린더가 거짓말을 한다 (CLAUDE.md §0-3).
 *
 *   docker compose up -d && pnpm --filter @runback/db seed
 */

import { prisma } from './client.ts';

/** .env 의 RUNBACK_DEV_USER_ID 와 같은 값이어야 한다 (apps/web/src/lib/session.ts) */
const DEV_USER_ID = 'dev-user';

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
  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {},
    create: {
      id: DEV_USER_ID,
      provider: 'kakao',
      // 인증 전이라 실제 해시가 아니다. Phase 2 가 붙으면 이 사용자는 지우고 진짜로 로그인한다
      providerUserIdHash: 'dev-seed-not-a-real-hash',
      nickname: '도그푸딩',
    },
  });

  const existing = await prisma.savedPlan.findFirst({
    where: { userId: DEV_USER_ID, raceSlug: 'mbn-seoul-marathon-2026' },
  });
  if (existing) {
    console.log('시드 플랜이 이미 있습니다:', existing.id);
    return;
  }

  const plan = await prisma.savedPlan.create({
    data: {
      userId: DEV_USER_ID,
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
