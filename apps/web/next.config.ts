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
  /*
   * Prisma 생성 클라이언트가 쿼리 엔진을 찾느라 동적으로 파일 시스템을 읽는데,
   * Turbopack 의 정적 분석이 그걸 보고 **프로젝트 전체를 서버 번들에 끌어넣는다.**
   * 그러면 public/illustrations 의 89MB 가 서버리스 함수에 딸려 들어가
   * 배포가 느려지고 크기 제한(Vercel 250MB)에 걸릴 수 있다.
   *
   * 일러스트는 정적 자산으로 따로 서빙되므로 서버 코드에는 필요 없다.
   * 대회 목업·디자인 보드도 마찬가지다.
   */
  outputFileTracingExcludes: {
    '/api/**': ['public/illustrations/**/*', 'public/brand/**/*'],
    '/**': ['public/illustrations/**/*', 'public/brand/**/*'],
  },

  // TODO: 라우트가 확정되면 typedRoutes 를 켠다. 지금은 자리만 잡은 링크가 많다
  experimental: {
    // 대회 데이터가 커지면 정적 생성 시간이 늘어난다. 미리 열어둔다
    staticGenerationRetryCount: 1,
  },
};

export default nextConfig;
