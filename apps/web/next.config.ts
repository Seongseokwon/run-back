import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 워크스페이스 패키지는 .ts 소스를 그대로 export 한다 (빌드 산출물 없음).
  // 엔진을 빌드 타임에 직접 호출해 정적 페이지를 만들기 위한 구조다 (PRD §11.2)
  transpilePackages: ['@raceback/engine', '@raceback/races'],
  // TODO: 라우트가 확정되면 typedRoutes 를 켠다. 지금은 자리만 잡은 링크가 많다
  experimental: {
    // 대회 데이터가 커지면 정적 생성 시간이 늘어난다. 미리 열어둔다
    staticGenerationRetryCount: 1,
  },
};

export default nextConfig;
