import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

// Next 는 앱 디렉터리(apps/web)의 .env 만 읽는다. 이 리포는 DATABASE_URL 같은 값을
// 모노레포 루트 .env 한 곳에 두므로(패키지마다 흩어지면 어느 게 진짜인지 알 수 없다)
// 루트 파일을 직접 얹어 준다. 이미 설정된 환경변수는 덮지 않는다 — 배포 환경이 이긴다.
const rootEnv = join(import.meta.dirname, '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  // 워크스페이스 패키지는 .ts 소스를 그대로 export 한다 (빌드 산출물 없음).
  // 엔진을 빌드 타임에 직접 호출해 정적 페이지를 만들기 위한 구조다 (PRD §11.2)
  transpilePackages: ['@runback/engine', '@runback/races', '@runback/db'],
  // TODO: 라우트가 확정되면 typedRoutes 를 켠다. 지금은 자리만 잡은 링크가 많다
  experimental: {
    // 대회 데이터가 커지면 정적 생성 시간이 늘어난다. 미리 열어둔다
    staticGenerationRetryCount: 1,
  },
};

export default nextConfig;
