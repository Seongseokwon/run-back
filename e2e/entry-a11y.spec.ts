import { expect, test, type Page } from '@playwright/test';
import { DISTANCE, VERDICT_BADGE, resultUrl, todayKst, verdictUrl, weeksFromToday } from './helpers';

/**
 * QA 시트 §6·§7 — 접근성·반응형·진입.
 *
 * §7-1 이 이 파일에서 가장 중요하다. 루트를 로그인 화면으로 바꾸면 §13 SEO 전략과
 * §9.2 저장 게이트가 **동시에** 깨진다. PRD 가 "타협 불가 금지사항"으로 적어 둔 자리다.
 */

test.describe('§7 진입', () => {
  test('7-1 로그아웃 상태의 루트는 정적 랜딩이다 (§9.2 타협 불가)', async ({ page, context }) => {
    await context.clearCookies();
    const res = await page.goto('/');

    expect(res!.status()).toBe(200);
    await expect(page).toHaveURL(/\/$/);
    // 로그인 화면으로 보내지 않는다
    await expect(page.getByLabel('비밀번호')).toHaveCount(0);
    await expect(page.locator('h1')).not.toBeEmpty();
    // 크롤러가 볼 것 — 대회로 가는 길이 열려 있다
    await expect(page.getByRole('link', { name: /플랜 만들기/ }).first()).toBeVisible();
  });

  test('공개 경로는 로그인 없이 전부 열린다 (§9.2)', async ({ page, context }) => {
    await context.clearCookies();
    for (const path of ['/', '/race', '/plan/new', '/privacy', '/terms', '/tools/pace', '/tools/vdot']) {
      const res = await page.goto(path);
      expect(res!.status(), `${path} 가 열리지 않는다`).toBe(200);
    }
  });

  test('manifest 가 앱 실행 지점과 배경색을 정한다 (PWA)', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = JSON.parse(await res.text());

    expect(manifest.start_url).toBe('/today');
    // 실행 순간 배경이 튀지 않으려면 캔버스 크림과 같아야 한다
    expect(manifest.background_color?.toLowerCase()).toBe('#fbf7f0');
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });

  test('7-4·7-5 파비콘이 라이트/다크 탭 각각에 준비돼 있다', async ({ page }) => {
    await page.goto('/');
    const icons = page.locator('link[rel="icon"]');
    const media = await icons.evaluateAll((els) => els.map((e) => e.getAttribute('media')));

    expect(media.some((m) => m?.includes('dark')), '다크 탭 전용 파비콘이 없다').toBe(true);
    // 조건 없는 항목이 앞서면 일부 브라우저가 media 항목을 무시한다
    expect(media[0], '다크 항목이 먼저 와야 한다').toContain('dark');
  });
});

test.describe('§6 접근성', () => {
  test('6-1 판정을 색 없이도 읽을 수 있다 (WCAG 1.4.1)', async ({ page }) => {
    await page.goto(
      verdictUrl({ d: weeksFromToday(20), m: DISTANCE.HALF, t: todayKst(), f: [0, 21097.5, 6600], g: [0, 6600], w: 4, k: 40 }),
    );
    // 이모지 + 한글 라벨이 함께 간다
    await expect(page.getByText(VERDICT_BADGE).first()).toBeVisible();
  });

  test('6-4 키보드만으로 위저드 1스텝을 넘길 수 있다', async ({ page }) => {
    await page.goto('/plan/new');
    await page.locator('input[type="date"]').fill(weeksFromToday(12));
    await page.getByRole('button', { name: '하프', exact: true }).click();

    const next = page.getByRole('button', { name: '다음' });
    await next.focus();
    await expect(next).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('지금 실력이 어느 정도인가요?')).toBeVisible();
  });

  /** 눌러야 하는 것 중 44px 미만인 것을 모은다 (`--spacing-touch`) */
  async function smallTargets(page: Page, scope: string): Promise<string[]> {
    const found: string[] = [];
    for (const el of await page.locator(`${scope} button:visible, ${scope} a:visible`).all()) {
      const box = await el.boundingBox();
      if (!box) continue;
      if (box.height < 44) found.push(`${(await el.textContent())?.trim().slice(0, 16) || '(이름 없음)'} ${Math.round(box.height)}px`);
    }
    return found;
  }

  test('6-5 화면 안의 컨트롤이 전부 44px 이상이다', async ({ page }) => {
    for (const path of ['/plan/new', '/tools/pace', '/tools/vdot']) {
      await page.goto(path);
      const small = await smallTargets(page, 'main');
      expect(small, `${path} — ${small.join(' / ')}`).toHaveLength(0);
    }
  });

  /*
   * 헤더·푸터는 화면마다 같은 것이 붙는다. 여기서 미달이 나면 **모든 화면**이 미달이다.
   * 본문과 분리해 두면 회귀가 어디서 왔는지 바로 읽힌다.
   */
  test('6-5b 헤더·푸터 링크가 44px 이상이다', async ({ page }) => {
    await page.goto('/');
    const small = [...(await smallTargets(page, 'header')), ...(await smallTargets(page, 'footer'))];
    expect(small, `헤더·푸터 — ${small.join(' / ')}`).toHaveLength(0);
  });

  test('6-7 폭 320px 에서 가로 스크롤이 생기지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });

    const paths = [
      '/',
      '/race',
      '/plan/new',
      '/tools/pace',
      '/tools/vdot',
      resultUrl({ d: weeksFromToday(20), m: DISTANCE.FULL, t: todayKst(), f: [0, 21097.5, 6900], g: [0, 14400], w: 5, k: 45 }),
    ];

    for (const path of paths) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} 에서 가로로 ${overflow}px 넘친다`).toBeLessThanOrEqual(1);
    }
  });

  test('6-8 한글이 어절 중간에서 끊기지 않는다', async ({ page }) => {
    await page.goto('/');
    const wordBreak = await page.evaluate(() => getComputedStyle(document.body).wordBreak);
    expect(wordBreak).toBe('keep-all');
  });

  test('페이지마다 h1 이 하나씩 있다', async ({ page }) => {
    for (const path of ['/', '/race', '/tools/pace', '/tools/vdot', '/privacy', '/terms']) {
      await page.goto(path);
      const count = await page.locator('h1').count();
      expect(count, `${path} 의 h1 이 ${count}개다`).toBe(1);
    }
  });

  test('이미지에 alt 가 빠지지 않았다', async ({ page }) => {
    for (const path of ['/', '/race', '/login']) {
      await page.goto(path);
      const missing = await page.locator('img:not([alt])').count();
      expect(missing, `${path} 에 alt 없는 이미지가 ${missing}개`).toBe(0);
    }
  });
});
