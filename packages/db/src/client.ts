/**
 * Prisma 클라이언트 싱글턴.
 *
 * Next 개발 서버는 파일이 바뀔 때마다 모듈을 다시 평가한다. 그때마다 new PrismaClient()
 * 를 만들면 커넥션이 계속 쌓여 몇 분 만에 Postgres 의 max_connections 를 넘긴다.
 * globalThis 에 붙여 두는 게 이 문제의 표준 처방이다.
 */

import { PrismaClient } from '../generated/client/index.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
