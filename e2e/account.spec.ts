import { expect, test, type Page } from '@playwright/test';
import { DISTANCE, resultUrl, signIn, todayKst, weeksFromToday } from './helpers';
import { E2E_EMAIL, E2E_PASSWORD } from './global-setup';

/**
 * QA 시트 §3·§4 — 계정과 앱 셸.
 *
 * **DB 가 없으면 통째로 skip 한다.** 게스트 경로는 DB 없이도 전부 돌아야 하므로(§9.5
 * "계정은 편의 레이어이지 단일 진실 공급원이 아니다") DB 부재를 실패로 만들면
 * 그 설계를 테스트가 부정하게 된다.
 *
 * 카카오는 외부 동의 화면이라 자동화하지 않는다 — QA 시트 3-1·3-2 는 수동 항목으로 남는다.
 */

/*
 * 이 파일만 병렬을 끈다 (`fullyParallel` 무시).
 * 같은 계정으로 여러 워커가 동시에 로그인하면 scrypt(N=2^15) 비용과 실패 잠금이 겹쳐
 * 로그인 자체가 흔들린다. 'default' 는 한 워커에서 차례로 돌리되,
 * 'serial' 과 달리 하나가 실패해도 나머지를 건너뛰지 않는다.
 */
test.describe.configure({ mode: 'default' });

async function loggedIn(page: Page): Promise<boolean> {
  await page.goto('/me');
  const anonymous = (await page.getByRole('link', { name: '로그인' }).count()) > 0;
  if (anonymous && process.env.E2E_DEBUG) {
    console.log('[e2e] 로그인 실패 — /me 상태:', (await page.locator('main').innerText()).slice(0, 200));
  }
  return !anonymous;
}

test.describe('§3 계정', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await signIn(page, E2E_EMAIL, E2E_PASSWORD);
    test.skip(!(await loggedIn(page)), 'DB 또는 테스트 계정이 없다 (게스트 경로는 영향 없음)');
  });

  test('3-3·3-4 이메일 폼은 접혀 있고 카카오가 주 버튼이다 (§10.7)', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');

    const details = page.locator('details');
    await expect(details).toHaveCount(1);
    // 접힌 상태에서는 입력이 보이지 않는다
    await expect(page.getByLabel('이메일')).toBeHidden();

    await page.locator('summary').click();
    await expect(page.getByLabel('이메일')).toBeVisible();
  });

  test('3-5 실패 문구가 하나뿐이다 (계정 열거 방어)', async ({ page, context }) => {
    const messages: string[] = [];

    for (const creds of [
      { email: 'nobody-here@runback.kr', password: 'wrong-password-1234' },
      { email: E2E_EMAIL, password: 'definitely-wrong-1234' },
    ]) {
      await context.clearCookies();
      await signIn(page, creds.email, creds.password);
      // Next 의 라우트 안내용 live region 도 role=alert 다. 폼 안으로 좁힌다
      const alert = page.locator('form').getByRole('alert');
      await expect(alert).toBeVisible();
      messages.push((await alert.innerText()).trim());
    }

    expect(messages[0], '없는 계정과 틀린 비밀번호의 문구가 다르다').toBe(messages[1]);
  });

  test('3-7·3-8 게스트 플랜이 로그인 뒤에도 살아남는다 (§9.5) — 재실행에도 중복되지 않는다', async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    const url = resultUrl({
      d: weeksFromToday(18),
      m: DISTANCE.HALF,
      t: todayKst(),
      f: [0, 10000, 3000],
      g: [0, 6600],
      w: 4,
      k: 30,
    });
    await page.goto(url);

    // 게스트에게는 저장이 로그인 유도로 보인다 — 생성 게이트가 아니라 저장 게이트다
    await page.getByRole('link', { name: /로그인하고 이 플랜 저장하기/ }).click();
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);

    await page.locator('summary').click();
    await page.getByLabel('이메일').fill(E2E_EMAIL);
    await page.getByLabel('비밀번호').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();

    // 로그인 뒤 플랜이 사라지면 §9.5 의 핵심 동선이 깨진 것이다
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto('/races');
    const before = await page.locator('a[href^="/races/"]').count();
    expect(before, '저장된 플랜이 목록에 없다').toBeGreaterThan(0);

    // 같은 플랜을 한 번 더 저장해도 늘지 않는다 (멱등)
    await page.goto(url);
    const again = page.getByRole('link', { name: /로그인하고 이 플랜 저장하기/ });
    if ((await again.count()) > 0) await again.click();
    await page.goto('/races');
    expect(await page.locator('a[href^="/races/"]').count()).toBe(before);
  });

  test('3-9·3-10 보관함이 저장된 플랜을 보여 준다 (F-17)', async ({ page }) => {
    await page.goto('/races');
    // 플랜이 없으면 빈 상태, 있으면 목록 — 둘 중 하나는 반드시 그려진다
    const hasPlans = (await page.locator('a[href^="/races/"]').count()) > 0;
    if (hasPlans) {
      await page.locator('a[href^="/races/"]').first().click();
      await expect(page).toHaveURL(/\/races\/.+/);
      await expect(page.getByRole('heading', { name: '훈련 일정' })).toBeVisible();
    } else {
      await expect(page.getByText(/새로운 목표/)).toBeVisible();
    }
  });

  test('3-12 내보내기가 해시 값을 노출하지 않는다 (F-19)', async ({ page }) => {
    const res = await page.request.get('/api/me/export');
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toContain('no-store');

    const body = await res.text();
    expect(body).not.toMatch(/scrypt\$/);
    // 해시가 '있다는 사실'은 알려도 값은 주지 않는다
    const json = JSON.parse(body);
    const flat = JSON.stringify(json);
    expect(flat).not.toMatch(/"passwordHash"\s*:\s*"[^"]{20,}"/);
    expect(flat).not.toMatch(/"providerUserIdHash"\s*:\s*"[^"]{20,}"/);
  });

  test('3-13 탈퇴 화면이 사라질 것을 정확히 보여 주고 붙잡지 않는다 (§9.6)', async ({ page }) => {
    await page.goto('/me/withdraw');
    await expect(page.getByRole('heading', { name: '정말 탈퇴하시겠어요?' })).toBeVisible();
    // 되묻는 단계를 늘리지 않는다 — 탈퇴는 가입만큼 쉬워야 한다
    await expect(page.getByRole('button', { name: '탈퇴하기' })).toBeEnabled();
    // 무엇이 사라지는지 정확히 — 플랜 개수까지 센다
    await expect(page.getByRole('listitem').filter({ hasText: /저장한 훈련 플랜/ })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: '계정 정보' })).toBeVisible();
  });

  test('3-18 파기 Cron 은 비밀 없이는 열리지 않는다', async ({ request }) => {
    const res = await request.get('/api/cron/purge');
    // 설정 누락이 곧 공개가 되면 안 된다
    expect([401, 403, 503]).toContain(res.status());
  });

  test('3-19 방침에 법정 필수 항목이 있다 (F-20·F-21)', async ({ page }) => {
    await page.goto('/privacy');
    const text = await page.locator('main').innerText();

    expect(text, '보호책임자 연락처 (법 제30조)').toMatch(/privacy@runback\.kr/);
    expect(text, '국외 이전 고지 (법 제28조의8)').toMatch(/국외/);
    expect(text, '보유기간 15일').toMatch(/15일/);
  });
});

test.describe('§4 앱 셸', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await signIn(page, E2E_EMAIL, E2E_PASSWORD);
    test.skip(!(await loggedIn(page)), 'DB 또는 테스트 계정이 없다');
  });

  test('탭 4개가 전부 열리고 탭바가 붙는다', async ({ page }) => {
    for (const path of ['/today', '/races', '/log', '/me']) {
      const res = await page.goto(path);
      expect(res!.status(), `${path}`).toBe(200);
      await expect(page.getByRole('navigation').last()).toBeVisible();
    }
  });

  test('4-5 훈련 일정 상세에서도 대회 탭이 켜져 있다', async ({ page }) => {
    await page.goto('/races');
    const first = page.locator('a[href^="/races/"]').first();
    test.skip((await first.count()) === 0, '저장된 플랜이 없다');

    await first.click();
    await expect(page).toHaveURL(/\/races\/.+/);
    // 사용자가 '어느 탭에 있는지'를 잃지 않는다
    await expect(page.getByRole('link', { name: '대회' })).toHaveAttribute('aria-current', 'page');
  });

  test('4-6 달력 아이콘이 그 플랜의 달력을 연다 (O16)', async ({ page }) => {
    await page.goto('/races');
    const first = page.locator('a[href^="/races/"]').first();
    test.skip((await first.count()) === 0, '저장된 플랜이 없다');

    await first.click();
    await page.getByRole('link', { name: '훈련 달력' }).click();
    await expect(page).toHaveURL(/\/log\?plan=.+/);
  });

  test('4-7 달력이 월요일에서 시작한다', async ({ page }) => {
    await page.goto('/log');
    /*
     * 달력은 `<table>` 이 아니라 grid 라 columnheader 롤이 없다.
     * 요일 줄은 7칸 격자의 첫 줄이므로 거기서 읽는다.
     */
    const dowRow = page.locator('.grid-cols-7').first();
    test.skip((await dowRow.count()) === 0, '달력이 그려지지 않았다 (플랜 없음)');

    // 일요일 시작이면 한 훈련 주차가 두 줄에 걸쳐 주간 볼륨이 안 읽힌다
    const labels = (await dowRow.innerText()).replace(/\s+/g, '');
    expect(labels).toBe('월화수목금토일');
  });

  test('로그인 상태의 루트는 오늘 탭으로 간다 (§5 proxy)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/today$/);
  });
});
