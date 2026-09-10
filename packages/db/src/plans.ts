/**
 * 저장된 플랜 읽기·쓰기.
 *
 * 이 패키지는 **엔진을 모른다.** input 을 JSON 으로 넣고 그대로 꺼낼 뿐,
 * 그걸로 플랜을 만드는 건 웹 어댑터의 일이다 (apps/web/src/lib/my-races.ts).
 * 저장소가 엔진을 알기 시작하면 엔진 버전이 올라갈 때마다 저장소도 같이 흔들린다.
 */

import { prisma } from './client.ts';

export type SavedPlanRecord = {
  id: string;
  /** PlanInput. 여기서는 검증하지 않는다 — 꺼내 쓰는 쪽이 엔진 타입으로 확인한다 */
  input: unknown;
  /** 저장 시점의 엔진 버전. 이 값으로 고정 렌더링한다 (PRD §9.7) */
  engineVersion: string;
  raceSlug: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

/** 내가 저장한 플랜 전부. 최근 저장한 것이 앞 */
export async function listSavedPlans(userId: string): Promise<SavedPlanRecord[]> {
  return prisma.savedPlan.findMany({
    where: { userId, user: { deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    select: SELECT,
  });
}

/** 한 건. 남의 플랜을 못 읽도록 userId 를 반드시 함께 건다 */
export async function findSavedPlan(userId: string, id: string): Promise<SavedPlanRecord | null> {
  return prisma.savedPlan.findFirst({
    where: { id, userId, user: { deletedAt: null } },
    select: SELECT,
  });
}

export type SavePlanArgs = {
  userId: string;
  input: unknown;
  engineVersion: string;
  title: string;
  raceSlug?: string | undefined;
};

export async function savePlan(args: SavePlanArgs): Promise<SavedPlanRecord> {
  return prisma.savedPlan.create({
    data: {
      userId: args.userId,
      input: args.input as never,
      engineVersion: args.engineVersion,
      title: args.title,
      raceSlug: args.raceSlug ?? null,
    },
    select: SELECT,
  });
}

/** 플랜 삭제. 수행 기록은 스키마의 onDelete: Cascade 가 같이 지운다 */
export async function deleteSavedPlan(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.savedPlan.deleteMany({ where: { id, userId } });
  return count > 0;
}

const SELECT = {
  id: true,
  input: true,
  engineVersion: true,
  raceSlug: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} as const;
