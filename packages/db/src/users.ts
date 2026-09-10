/**
 * 계정. 소셜 식별자의 원본은 저장하지 않는다 (PRD §9.8).
 *
 * 탈퇴는 soft delete 다 — deletedAt 이 채워지면 즉시 접근이 막히고,
 * 15일 뒤 purgeDeletedUsers() 가 행을 지운다. 여기 있는 모든 조회는
 * deletedAt: null 을 조건에 걸어야 한다. 하나라도 빠지면 탈퇴한 사람이 다시 보인다.
 */

import { createHash } from 'node:crypto';
import { prisma } from './client.ts';

export type Provider = 'kakao' | 'apple' | 'google';

export type UserRecord = {
  id: string;
  provider: Provider;
  nickname: string | null;
  createdAt: Date;
  lastLoginAt: Date;
};

/** 탈퇴 후 완전 삭제까지의 유예. PRD O11 결정값 */
export const HARD_DELETE_AFTER_DAYS = 15;

/**
 * 제공자 식별자를 단방향 해시로 바꾼다.
 *
 * ⚠️ AUTH_ID_PEPPER 가 바뀌면 기존 사용자가 전부 다른 사람이 된다. 한 번 정하면 바꾸지 않는다.
 */
export function hashProviderUserId(provider: Provider, providerUserId: string): string {
  const pepper = process.env.AUTH_ID_PEPPER;
  if (!pepper) throw new Error('AUTH_ID_PEPPER 가 설정되지 않았습니다');
  return createHash('sha256').update(`${provider}:${providerUserId}:${pepper}`).digest('hex');
}

/** 로그인 — 있으면 lastLoginAt 만 갱신하고, 없으면 만든다 */
export async function upsertUserOnLogin(args: {
  provider: Provider;
  providerUserId: string;
  nickname?: string | undefined;
}): Promise<UserRecord> {
  const providerUserIdHash = hashProviderUserId(args.provider, args.providerUserId);

  // 부분 유니크 인덱스(WHERE deletedAt IS NULL)는 Prisma 의 upsert 가 쓰지 못한다.
  // 활성 계정을 먼저 찾고 없으면 만드는 2단계로 간다.
  const active = await prisma.user.findFirst({
    where: { provider: args.provider, providerUserIdHash, deletedAt: null },
    select: SELECT,
  });

  if (active) {
    return prisma.user.update({
      where: { id: active.id },
      data: { lastLoginAt: new Date(), ...(args.nickname ? { nickname: args.nickname } : {}) },
      select: SELECT,
    });
  }

  // 탈퇴 유예 중인 행이 있어도 새 계정을 만든다 — 재가입은 복구가 아니다 (방침 제9항)
  return prisma.user.create({
    data: {
      provider: args.provider,
      providerUserIdHash,
      nickname: args.nickname ?? null,
    },
    select: SELECT,
  });
}

export async function findActiveUser(id: string): Promise<UserRecord | null> {
  return prisma.user.findFirst({ where: { id, deletedAt: null }, select: SELECT });
}

/**
 * 탈퇴 요청 (F-18). 즉시 접근 차단, 실제 삭제는 15일 뒤.
 * 절차는 가입만큼 쉬워야 한다 — 되묻는 단계를 늘리지 않는다 (§9.6 다크패턴 금지).
 */
export async function requestWithdrawal(userId: string): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count > 0;
}

/**
 * 유예가 지난 계정을 실제로 지운다. 저장 플랜·수행 기록은 Cascade 로 함께 사라진다.
 *
 * ⚠️ 이 함수를 **주기적으로 실행하는 장치가 반드시 있어야 한다.**
 * 방침에 "15일 이내 삭제"라고 적어 놓고 실행기가 없으면 그 자체가 위반이다.
 */
export async function purgeDeletedUsers(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - HARD_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.user.deleteMany({ where: { deletedAt: { lt: cutoff } } });
  return count;
}

const SELECT = {
  id: true,
  provider: true,
  nickname: true,
  createdAt: true,
  lastLoginAt: true,
} as const;
