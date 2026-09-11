import { expect, test } from '@playwright/test';

/**
 * `/race` 대회 달력.
 *
 * 82개를 날짜순으로 늘어놓으면 "10월에 38개가 몰려 있다"는 사실이 안 읽힌다.
 * 달력이 하는 일이 그 밀도를 보여 주는 것이라, 여기서 보는 것은
 * **닷이 제대로 찍히는가**와 **빠져나갈 수 없는 자리가 없는가**다.
 */

test.describe('/race 대회 달력', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/race');
  });

  const monthTitle = (page: import('@playwright/test').Page) => page.locator('h2').first();
  const listTitle = (page: import('@playwright/test').Page) => page.locator('h3').first();

  test('오늘이 속한 달에서 열리고 그 달 대회가 아래에 나온다', async ({ page }) => {
    await expect(monthTitle(page)).toHaveText(/^\d{4}년 \d{1,2}월$/);
    // 날짜를 안 골랐으면 목록은 그 달 전체다 — 달력과 목록이 같은 것을 가리킨다
    await expect(listTitle(page)).toHaveText(/^\d+월 대회 \d+개$/);
  });

  test('대회가 있는 날에만 닷이 찍히고 없는 날은 누를 수 없다', async ({ page }) => {
    const withRaces = page.getByRole('button', { name: /대회 \d+개/ });
    const withNone = page.getByRole('button', { name: /대회 없음/ });

    expect(await withRaces.count(), '닷이 하나도 없다').toBeGreaterThan(0);
    // 빈 날을 눌러 봐야 아무 일도 안 일어난다. 누를 수 있게 두면 고장으로 읽힌다
    if ((await withNone.count()) > 0) await expect(withNone.first()).toBeDisabled();
  });

  test('날짜를 누르면 그날 대회만, 해제하면 다시 그 달 전체', async ({ page }) => {
    const monthHeading = await listTitle(page).innerText();

    const day = page.getByRole('button', { name: /대회 \d+개/ }).first();
    const label = (await day.innerText()).replace(/\s+/g, '');
    await day.click();

    await expect(listTitle(page)).toHaveText(/^\d+월 \d+일 \(.\)의 대회 \d+개$/);
    // 칸에 적힌 개수와 목록 제목의 개수가 같아야 한다
    const count = /대회(\d+)개/.exec(label)![1];
    await expect(listTitle(page)).toContainText(`대회 ${count}개`);

    await page.getByRole('button', { name: '이 달 전체 보기' }).click();
    await expect(listTitle(page)).toHaveText(monthHeading);
  });

  test('같은 날짜를 다시 누르면 선택이 풀린다', async ({ page }) => {
    const day = page.getByRole('button', { name: /대회 \d+개/ }).first();
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'false');
  });

  test('데이터 지평선 밖으로는 나갈 수 없다', async ({ page }) => {
    const prev = page.getByRole('button', { name: '이전 달' });
    const next = page.getByRole('button', { name: '다음 달' });

    // 지난 대회는 목록에 없다. 오늘 이전으로 갈 이유가 없다
    await expect(prev).toBeDisabled();

    // 마지막 대회가 있는 달에서 멈춘다 — 안 그러면 영원히 빈 달이 이어진다
    for (let i = 0; i < 24 && !(await next.isDisabled()); i += 1) await next.click();
    await expect(next).toBeDisabled();
  });

  test('대회가 없는 달은 막다른 길이 아니다', async ({ page }) => {
    const next = page.getByRole('button', { name: '다음 달' });

    for (let i = 0; i < 24; i += 1) {
      if (await page.getByText('이 달에는 대회가 없습니다.').isVisible()) break;
      if (await next.isDisabled()) break;
      await next.click();
    }

    const empty = page.getByText('이 달에는 대회가 없습니다.');
    test.skip(!(await empty.isVisible()), '지평선 안에 빈 달이 없다');

    // 갈 곳을 준다 — "없습니다"로 끝내지 않는다
    const jump = page.getByRole('button', { name: /^\d{4}년 \d{1,2}월로 이동/ });
    await expect(jump).toBeVisible();
    await jump.click();
    await expect(page.getByText('이 달에는 대회가 없습니다.')).toHaveCount(0);
  });

  test('달력에서 고른 대회로 실제로 갈 수 있다', async ({ page }) => {
    await page.getByRole('button', { name: /대회 \d+개/ }).first().click();
    const first = page.locator('[aria-live] a').first();
    const href = await first.getAttribute('href');
    expect(href).toMatch(/^\/(race\/|plan\/new\?race=)/);

    await first.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[?]/g, '\\?')));
  });
});
