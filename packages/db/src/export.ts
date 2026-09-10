/**
 * 내 데이터 내보내기 (F-19) — 정보주체의 열람권 행사 수단 (개인정보보호법 제35조).
 *
 * 원칙 하나: **우리가 가진 것을 빠짐없이 준다.** 보기 좋은 요약이 아니라
 * 실제 저장된 값 그대로다. 열람권은 "무엇을 가지고 있는지 확인할 권리"이므로
 * 우리 편의로 걸러내면 그 권리가 무의미해진다.
 *
 * 다만 `providerUserIdHash` 와 `passwordHash` 는 **뺀다.**
 *  - 본인 확인에 쓰이는 자격증명이라 파일로 돌아다니면 위험만 늘어난다
 *  - 해시라 사용자에게 알려 주는 정보도 없다 (원본은 본인이 이미 안다)
 * 대신 그런 값이 있다는 사실 자체는 알려 준다 — 숨기는 게 아니라는 뜻이다.
 */

import { prisma } from './client.ts';

export type UserExport = {
  exportedAt: string;
  account: {
    id: string;
    provider: string;
    nickname: string | null;
    createdAt: string;
    lastLoginAt: string;
    withdrawalRequestedAt: string | null;
    /** 자격증명은 값 대신 보유 여부만 */
    credentials: { providerIdentifierStored: 'hashed'; passwordStored: boolean };
  };
  savedPlans: Array<{
    id: string;
    title: string;
    raceSlug: string | null;
    engineVersion: string;
    input: unknown;
    createdAt: string;
    updatedAt: string;
  }>;
  sessionLogs: Array<{
    planId: string;
    date: string;
    status: string;
    actualDistanceKm: number | null;
    actualDurationSec: number | null;
    note: string | null;
    loggedAt: string;
  }>;
};

/** 탈퇴한 사용자는 null. 유예 기간이라도 접근은 이미 차단된 상태다 */
export async function exportUserData(userId: string): Promise<UserExport | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: {
      plans: { orderBy: { createdAt: 'asc' } },
      logs: { orderBy: { date: 'asc' } },
    },
  });
  if (!user) return null;

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      provider: user.provider,
      nickname: user.nickname,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
      withdrawalRequestedAt: user.deletedAt?.toISOString() ?? null,
      credentials: {
        providerIdentifierStored: 'hashed',
        passwordStored: user.passwordHash !== null,
      },
    },
    savedPlans: user.plans.map((p) => ({
      id: p.id,
      title: p.title,
      raceSlug: p.raceSlug,
      engineVersion: p.engineVersion,
      input: p.input,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    sessionLogs: user.logs.map((l) => ({
      planId: l.planId,
      date: l.date,
      status: l.status,
      actualDistanceKm: l.actualDistanceKm,
      actualDurationSec: l.actualDurationSec,
      note: l.note,
      loggedAt: l.loggedAt.toISOString(),
    })),
  };
}
