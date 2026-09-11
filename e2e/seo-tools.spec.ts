import { expect, test } from '@playwright/test';

/**
 * QA 시트 §5 — SEO 와 계산기 (PRD §13).
 *
 * §13.2 는 "저품질 대량생성으로 판정되면 사이트 전체가 죽는다"고 적어 뒀다.
 * 그래서 여기서 보는 것은 **페이지가 뜨는가**가 아니라
 * **색인 대상에 넣지 말아야 할 것이 들어가지 않았는가**다.
 */

test.describe('§5 SEO', () => {
  test('5-1 sitemap 에 가치 있는 페이지만 있다 (§13.2 규칙 5)', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);

    // 개인 데이터·로그인 화면은 절대 들어가면 안 된다
    for (const forbidden of ['/plan/result', '/plan/verdict', '/plan/new', '/login', '/me', '/today', '/log']) {
      expect(urls.filter((u) => u.includes(forbidden)), `${forbidden} 이 sitemap 에 있다`).toHaveLength(0);
    }

    expect(urls.filter((u) => /\/race\/[^/]+$/.test(u)), '고유 콘텐츠가 있는 대회만 등록한다').toHaveLength(16);
    expect(urls.filter((u) => u.includes('/goal/'))).toHaveLength(13);
    expect(urls.filter((u) => u.includes('/tools/'))).toHaveLength(2);
    expect(urls.some((u) => u.endsWith('/privacy'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/terms'))).toBe(true);
  });

  test('5-2 robots 가 개인 화면을 막는다', async ({ request }) => {
    const txt = await (await request.get('/robots.txt')).text();
    for (const path of ['/plan/result', '/plan/verdict', '/today', '/log', '/me']) {
      expect(txt).toContain(`Disallow: ${path}`);
    }
    expect(txt).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test('5-2b 색인하지 않을 화면에 noindex 가 붙어 있다', async ({ page }) => {
    for (const path of ['/login', '/plan/verdict?p=x']) {
      await page.goto(path);
      await expect(
        page.locator('meta[name="robots"]'),
        `${path} 에 noindex 가 없다`,
      ).toHaveAttribute('content', /noindex/);
    }
  });

  test('5-3 고유 콘텐츠 없는 대회는 상세로 보내지 않는다 (§13.2)', async ({ page }) => {
    await page.goto('/race');

    /*
     * 달력과 전체 목록에 같은 대회가 두 번 나온다. **고유 주소**로 센다 —
     * 중복은 사람이 보는 화면의 사정이고, 여기서 보는 것은 링크 그래프다.
     */
    const unique = async (prefix: string): Promise<Set<string>> =>
      new Set(await page.locator(`a[href^="${prefix}"]`).evaluateAll((els) => els.map((e) => e.getAttribute('href')!)));

    const detail = await unique('/race/');
    const direct = await unique('/plan/new?race=');

    // 82개 전부가 상세로 가면 안 된다 (저품질 대량생성 방어)
    expect(detail.size).toBeLessThanOrEqual(16);
    expect(detail.size + direct.size).toBeGreaterThan(16);
  });

  /*
   * 달력은 **탐색 보조**이지 목록의 대체가 아니다.
   * 한 번에 한 달치 링크만 남으면 크롤러가 16개 상세에 도달할 길이 끊긴다 (§13).
   */
  test('5-3b 달력이 있어도 전체 일정이 HTML 에 그대로 있다', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/race');

    const detail = new Set(
      await page.locator('a[href^="/race/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!)),
    );
    const direct = new Set(
      await page.locator('a[href^="/plan/new?race="]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!)),
    );

    expect(detail.size, 'SSG 대상 16개로 가는 링크가 끊겼다').toBe(16);
    expect(detail.size + direct.size, '다가오는 대회 전부가 HTML 에 있어야 한다').toBeGreaterThan(50);
    await expect(page.getByRole('heading', { name: '전체 일정' })).toBeVisible();
    await context.close();
  });

  test('5-4 대회 상세에 구조화 데이터가 있다 (§13.3)', async ({ page, request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const slug = /<loc>[^<]*\/race\/([^<]+)<\/loc>/.exec(xml)?.[1];
    expect(slug, 'sitemap 에 대회 상세가 없다').toBeTruthy();

    await page.goto(`/race/${slug}`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);

    const types = blocks.map((b) => JSON.parse(b)['@type']);
    expect(types).toContain('SportsEvent');
  });

  test('5-5 목표 페이지 13개의 문장이 서로 다르다 (§13.2 규칙 3)', async ({ page, request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const slugs = [...xml.matchAll(/<loc>[^<]*\/goal\/([^<]+)<\/loc>/g)].map((m) => m[1]!);
    expect(slugs).toHaveLength(13);

    const leads = new Set<string>();
    for (const slug of slugs) {
      await page.goto(`/goal/${slug}`);
      const h1 = await page.locator('h1').innerText();
      const lead = await page.locator('h1 + p').innerText();
      expect(h1.length).toBeGreaterThan(5);
      leads.add(lead);
    }
    // 템플릿에 숫자만 바꾼 페이지면 여기서 겹친다
    expect(leads.size, '목표 페이지의 직답 문장이 중복된다').toBe(13);
  });
});

test.describe('§5 계산기 (F-SEO /tools)', () => {
  test('5-6 기록 → 페이스와 구간 통과 시간', async ({ page }) => {
    await page.goto('/tools/pace');
    await page.getByRole('radio', { name: '하프', exact: true }).click();
    await page.getByLabel('목표 기록').fill('1:50:00');

    // 결과 카드의 큰 숫자. 구간표에도 같은 값이 나오므로 카드로 좁힌다
    await expect(page.locator('p.figure')).toHaveText(/^5:13/);
    // 마지막 줄이 결승선이어야 한다 — 5km 배수만 찍으면 목표 기록이 표에서 빠진다
    const lastRow = page.locator('table').last().locator('tr').last();
    await expect(lastRow).toContainText('21.0975 km');
    await expect(lastRow).toContainText('1:50:00');
  });

  test('5-7 페이스 → 기록', async ({ page }) => {
    await page.goto('/tools/pace');
    await page.getByRole('radio', { name: '페이스 → 기록' }).click();
    await page.getByRole('radio', { name: '풀', exact: true }).click();
    await page.getByLabel('1km 페이스').fill('5:30');
    await expect(page.locator('p.figure')).toHaveText('3:52:04');
  });

  test('5-8 말이 안 되는 거리는 계산하지 않는다', async ({ page }) => {
    await page.goto('/tools/pace');
    await page.getByRole('radio', { name: '직접', exact: true }).click();
    await page.getByLabel('거리 (km)').fill('0');
    await expect(page.getByText(/거리를 0보다 크게/)).toBeVisible();
  });

  test('5-9 VDOT 계산기가 세 가지를 낸다', async ({ page }) => {
    await page.goto('/tools/vdot');
    await page.getByRole('radio', { name: '10K', exact: true }).click();
    await page.getByLabel('기록', { exact: true }).fill('50:00');

    await expect(page.locator('p.figure')).toHaveText('40.0');
    // 입력한 거리를 뺀 나머지 3종
    await expect(page.getByRole('rowheader', { name: '5K' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: '하프' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: '풀코스' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: '10K' })).toHaveCount(0);

    for (const zone of ['E', 'M', 'T', 'I', 'R']) {
      await expect(page.getByRole('rowheader', { name: new RegExp(`^${zone} ·`) })).toBeVisible();
    }
  });

  test('5-10 범위를 벗어나면 조용히 자르지 않고 알린다 (§7.10)', async ({ page }) => {
    await page.goto('/tools/vdot');
    await page.getByRole('radio', { name: '5K', exact: true }).click();
    await page.getByLabel('기록', { exact: true }).fill('12:00');
    await expect(page.getByText(/범위.*벗어나|가장자리 값/)).toBeVisible();
  });

  test('5-11 JS 없이도 글이 그대로 보인다 (검색 유입의 실체)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    for (const slug of ['pace', 'vdot']) {
      await page.goto(`/tools/${slug}`);
      await expect(page.locator('h1')).not.toBeEmpty();
      await expect(page.getByRole('heading', { name: '자주 묻는 질문' })).toBeVisible();
      // AEO 용 구조화 데이터도 HTML 에 있어야 한다 (§13.3)
      const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
      expect(JSON.parse(ld!)['@type']).toBe('FAQPage');
    }
    await context.close();
  });

  test('5-12 도구가 서로 이어진다', async ({ page }) => {
    // 푸터에도 같은 이름의 링크가 있다. 본문 안의 이음 카드로 좁힌다
    await page.goto('/tools/pace');
    await page.locator('main').getByRole('link', { name: /VDOT 계산기/ }).click();
    await expect(page).toHaveURL(/\/tools\/vdot$/);

    await page.locator('main').getByRole('link', { name: /페이스 계산기/ }).click();
    await expect(page).toHaveURL(/\/tools\/pace$/);
  });

  test('계산기가 플랜 생성으로 이어진다', async ({ page }) => {
    await page.goto('/tools/vdot');
    await page.getByRole('link', { name: '내 대회로 플랜 만들기' }).click();
    await expect(page).toHaveURL(/\/plan\/new$/);
  });
});
