import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI 설정.
 *
 * `package.json` 의 `"prisma"` 필드를 대체한다 — 그쪽은 deprecated 이고
 * **Prisma 7 에서 제거된다.** 지금 옮겨 두면 나중에 버전을 올릴 때 걸리지 않는다.
 *
 * ⚠️ **설정 파일이 생기면 Prisma 가 `.env` 를 스스로 읽지 않는다**
 * ("Prisma config detected, skipping environment variable loading"). 그래서 여기서
 * 직접 얹는다. 안 하면 `prisma migrate` 가 DATABASE_URL 을 못 찾는다.
 *
 * 이 리포는 환경 변수를 **모노레포 루트 `.env` 한 곳**에 둔다 (next.config.ts 도 같은 이유로
 * 같은 일을 한다). 이미 설정된 값은 덮지 않는다 — CI·배포 환경이 이긴다.
 */
const rootEnv = join(import.meta.dirname, '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  // 마이그레이션 디렉터리는 스키마 옆이 기본값이라 적지 않는다
  schema: 'prisma/schema.prisma',
});
