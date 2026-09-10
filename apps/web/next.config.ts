import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

// Next 는 앱 디렉터리(apps/web)의 .env 만 읽는다. 이 리포는 DATABASE_URL 같은 값을
// 모노레포 루트 .env 한 곳에 두므로(패키지마다 흩어지면 어느 게 진짜인지 알 수 없다)
// 루트 파일을 직접 얹어 준다. 이미 설정된 환경변수는 덮지 않는다 — 배포 환경이 이긴다.
const rootEnv = join(import.meta.dirname, '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  /*
   * Next 16 은 프로젝트당 dev 서버를 하나로 제한한다 (`.next/dev/lock`).
   * 빌드 디렉터리를 갈라 주면 두 대를 나란히 띄울 수 있다 —
   * 사람이 3000 을 켜 두고 보는 동안 에이전트가 다른 포트에서 검증할 때 쓴다.
   *
   *   NEXT_DIST_DIR=.next-agent pnpm dev --port 3100
   *
   * 기본값은 그대로 `.next` 라 평소 동작에는 영향이 없다.
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',

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

  /*
   * 라우트를 타입으로 검사한다. Next 16 에서 안정화되어 experimental 밖으로 나왔다.
   * 이제 켜는 이유: 라우트가 확정됐고, `/races/[slug]` 처럼 **키가 slug 이거나 planId 인**
   * 경로가 생겨서 손으로 쓴 문자열이 조용히 깨질 여지가 늘었다.
   */
  typedRoutes: true,

  experimental: {
    // 대회 데이터가 커지면 정적 생성 시간이 늘어난다. 미리 열어둔다
    staticGenerationRetryCount: 1,
  },
};

export default nextConfig;
