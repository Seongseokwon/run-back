/**
 * 이메일 + 비밀번호 로그인.
 *
 * ⚠️ PRD §9.3 은 원래 이 방식을 만들지 않기로 했다 (비밀번호 유출 책임 + 재설정 플로우 +
 * 스팸가입 대응). 2026-09-10 에 **테스트 경로로 열되 프로덕션에 남을 수 있다**는 전제로
 * 되살렸다. 그래서 임시 코드처럼 짜지 않았다.
 *
 * 신원 모델은 소셜과 같다 — 이메일은 평문으로 저장하지 않고 `providerUserIdHash` 에
 * 넣는다 (schema.prisma 의 User 주석 참조). 그래서 활성 유니크 인덱스,
 * soft delete, 15일 purge 가 전부 그대로 적용된다.
 *
 * 로그인 실패는 **이유를 구분해서 알려 주지 않는다.** '없는 계정'과 '틀린 비밀번호'를
 * 구분하는 순간 가입 여부가 새어 나간다. 타이밍도 같게 맞춘다 (burnPasswordTime).
 */

import { prisma } from './client.ts';
import { hashProviderUserId, type UserRecord } from './users.ts';
import { burnPasswordTime, hashPassword, validatePassword, verifyPassword } from './password.ts';

/** 이 횟수만큼 연속으로 틀리면 잠근다 */
export const MAX_FAILED_ATTEMPTS = 10;
/** 잠금 시간 */
export const LOCKOUT_MINUTES = 15;

/**
 * 이메일 정규화. 로그인과 가입이 **반드시 같은 함수**를 거쳐야 한다 —
 * 한쪽만 소문자로 바꾸면 가입한 계정으로 로그인이 안 된다.
 */
export function normalizeEmail(email: string): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  // 완벽한 이메일 검증은 불가능하고 의미도 없다. 형태만 본다
  if (trimmed.length < 3 || trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) return null;
  return trimmed;
}

export type RegisterResult =
  | { ok: true; user: UserRecord }
  | { ok: false; reason: 'invalid-email' | 'weak-password' | 'taken' };

/**
 * 계정 생성.
 *
 * 공개 가입 화면은 아직 없다 — 지금 호출부는 CLI(`pnpm --filter @runback/db user:create`)뿐이다.
 * 공개하려면 스팸가입 대응(레이트 리밋·캡차)을 먼저 얹어야 한다 (§9.3 이 원래 걱정한 지점).
 */
export async function registerPasswordUser(args: {
  email: string;
  password: string;
  nickname?: string | undefined;
}): Promise<RegisterResult> {
  const email = normalizeEmail(args.email);
  if (!email) return { ok: false, reason: 'invalid-email' };
  if (validatePassword(args.password)) return { ok: false, reason: 'weak-password' };

  const providerUserIdHash = hashProviderUserId('password', email);

  const existing = await prisma.user.findFirst({
    where: { provider: 'password', providerUserIdHash, deletedAt: null },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: 'taken' };

  const passwordHash = await hashPassword(args.password);

  try {
    const user = await prisma.user.create({
      data: {
        provider: 'password',
        providerUserIdHash,
        passwordHash,
        nickname: args.nickname ?? null,
      },
      select: USER_SELECT,
    });
    return { ok: true, user };
  } catch {
    // 부분 유니크 인덱스가 잡은 경우 — 위 조회와 create 사이에 누가 먼저 만들었다
    return { ok: false, reason: 'taken' };
  }
}

/**
 * 로그인. 성공하면 사용자, 아니면 null 이다.
 *
 * null 의 이유를 밖으로 내보내지 않는 것이 핵심이다 — 호출부가 구분할 수 없어야
 * 화면 문구도 자연히 하나로 통일된다.
 */
export async function verifyPasswordLogin(args: {
  email: string;
  password: string;
  now?: Date;
}): Promise<UserRecord | null> {
  const now = args.now ?? new Date();
  const email = normalizeEmail(args.email);

  // 이메일 형태부터 틀렸어도 시간을 똑같이 쓴다
  if (!email || typeof args.password !== 'string' || args.password.length === 0) {
    await burnPasswordTime(typeof args.password === 'string' ? args.password : '');
    return null;
  }

  const providerUserIdHash = hashProviderUserId('password', email);
  const row = await prisma.user.findFirst({
    where: { provider: 'password', providerUserIdHash, deletedAt: null },
    select: { id: true, passwordHash: true, failedLoginCount: true, lockedUntil: true },
  });

  if (!row?.passwordHash) {
    await burnPasswordTime(args.password);
    return null;
  }

  // 잠긴 계정은 비밀번호를 맞혀도 통과시키지 않는다. 그래도 시간은 쓴다
  if (row.lockedUntil && row.lockedUntil > now) {
    await burnPasswordTime(args.password);
    return null;
  }

  const ok = await verifyPassword(args.password, row.passwordHash);

  if (!ok) {
    const failed = row.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: row.id },
      data: {
        failedLoginCount: failed,
        ...(failed >= MAX_FAILED_ATTEMPTS
          ? { lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000), failedLoginCount: 0 }
          : {}),
      },
    });
    return null;
  }

  return prisma.user.update({
    where: { id: row.id },
    data: { lastLoginAt: now, failedLoginCount: 0, lockedUntil: null },
    select: USER_SELECT,
  });
}

/** 비밀번호 변경. 현재 비밀번호를 확인한 뒤에만 바꾼다 */
export async function changePassword(args: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<boolean> {
  if (validatePassword(args.newPassword)) return false;

  const row = await prisma.user.findFirst({
    where: { id: args.userId, provider: 'password', deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  if (!row?.passwordHash) return false;
  if (!(await verifyPassword(args.currentPassword, row.passwordHash))) return false;

  await prisma.user.update({
    where: { id: row.id },
    data: {
      passwordHash: await hashPassword(args.newPassword),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  return true;
}

const USER_SELECT = {
  id: true,
  provider: true,
  nickname: true,
  createdAt: true,
  lastLoginAt: true,
} as const;
