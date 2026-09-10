/**
 * 수행 기록 (F-12). 저장소만 먼저 둔다 — 화면은 Phase 5 에서 붙인다.
 *
 * ⚠️ 여기에 시드나 예시 데이터를 넣지 말 것. 실제로 뛰지 않은 기록을 화면에 띄우면
 * 진행률·캘린더가 거짓말을 한다 (CLAUDE.md §0-3).
 */

import { prisma } from './client.ts';

export type LogStatus = 'done' | 'skipped' | 'modified';

export type SessionLogRecord = {
  id: string;
  planId: string;
  /** ISO 'YYYY-MM-DD' (KST). DateTime 이 아닌 이유는 스키마 주석 참조 */
  date: string;
  status: LogStatus;
  actualDistanceKm: number | null;
  actualDurationSec: number | null;
  note: string | null;
  loggedAt: Date;
};

/** 한 플랜의 기록 전부. 화면은 날짜로 조회하므로 Map 으로 바꿔 쓰기 좋게 날짜순 */
export async function listLogs(userId: string, planId: string): Promise<SessionLogRecord[]> {
  return prisma.sessionLog.findMany({
    where: { userId, planId },
    orderBy: { date: 'asc' },
    select: SELECT,
  });
}

export type UpsertLogArgs = {
  userId: string;
  planId: string;
  date: string;
  status: LogStatus;
  actualDistanceKm?: number | undefined;
  actualDurationSec?: number | undefined;
  note?: string | undefined;
};

/** 같은 날짜에 다시 기록하면 덮어쓴다 — 체크는 토글처럼 동작해야 한다 */
export async function upsertLog(args: UpsertLogArgs): Promise<SessionLogRecord> {
  const data = {
    status: args.status,
    actualDistanceKm: args.actualDistanceKm ?? null,
    actualDurationSec: args.actualDurationSec ?? null,
    note: args.note ?? null,
  };
  return prisma.sessionLog.upsert({
    where: { planId_date: { planId: args.planId, date: args.date } },
    create: { userId: args.userId, planId: args.planId, date: args.date, ...data },
    update: data,
    select: SELECT,
  });
}

/** 체크 해제 */
export async function removeLog(userId: string, planId: string, date: string): Promise<boolean> {
  const { count } = await prisma.sessionLog.deleteMany({ where: { userId, planId, date } });
  return count > 0;
}

const SELECT = {
  id: true,
  planId: true,
  date: true,
  status: true,
  actualDistanceKm: true,
  actualDurationSec: true,
  note: true,
  loggedAt: true,
} as const;
