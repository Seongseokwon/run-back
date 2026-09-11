import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 설정 — `docs/qa-sheet.md` 의 자동화 가능한 항목을 옮긴 것.
 *
 * **프로덕션 빌드를 대상으로 돈다.** dev 서버는 정적/SSG 판정이 다르고 첫 요청에서
 * 컴파일이 끼어들어 §13 SEO 항목(사전 렌더 여부·sitemap)을 제대로 못 본다.
 *
 * 포트 3100 + `.next-agent` 를 쓰는 이유: 3000 과 `.next` 는 사람이 켜 두는 자리다.
 * Next 16 은 프로젝트당 dev 서버를 하나로 제한하므로 빌드 디렉터리를 갈라 준다.
 *
 * 모바일 우선 제품이라 기본 프로젝트가 **모바일 뷰포트**다 (PRD §10).
 * 데스크톱에서만 깨지는 것을 보려고 `desktop` 프로젝트를 따로 둔다.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // 순서 의존을 만들지 않는다. 계정 테스트도 각자 로그인한다
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  outputDir: './e2e/.results',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // 판정 문구·달력이 전부 KST 기준이다 (§4.2 today 입력)
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
  },

  projects: [
    /*
     * 화면은 두 뷰포트에서 본다 — 모바일 우선 제품이라 모바일이 기준이고,
     * 데스크톱은 넓은 화면에서만 깨지는 것을 잡는 보조다.
     */
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /account\.spec\.ts/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /account\.spec\.ts/ },
    /*
     * 계정은 **한 번만** 돈다.
     * 로그인은 뷰포트와 무관하고, 두 프로젝트가 같은 계정에 동시에 로그인하면
     * scrypt 비용과 실패 잠금이 겹쳐 로그인 자체가 흔들린다.
     */
    { name: 'account', use: { ...devices['Pixel 7'] }, testMatch: /account\.spec\.ts/ },
  ],

  webServer: {
    command: `pnpm --filter @runback/web build && pnpm --filter @runback/web start --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_DIST_DIR: '.next-agent',
      /*
       * ⚠️ 프로덕션 빌드를 http 로 띄우면 Auth.js 가 `__Secure-` 쿠키를 쓴다.
       * 브라우저는 http 오리진에서 그걸 버리므로 **로그인이 조용히 풀린다** —
       * 서버 로그에는 성공으로 남고 화면만 게스트다.
       * `AUTH_URL` 의 프로토콜이 쿠키 종류를 정하므로 http 로 못 박는다.
       */
      AUTH_URL: `http://localhost:${PORT}`,
      AUTH_TRUST_HOST: 'true',
    },
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
