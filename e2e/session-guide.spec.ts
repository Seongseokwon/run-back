import { expect, test } from '@playwright/test';
import { DISTANCE, resultUrl, todayKst, weeksFromToday } from './helpers';

/**
 * 세션 수행 가이드 — 입문자(§2 P1)가 'EASY RUN 6km' 를 받고 무엇을 해야 하는지.
 *
 * 유닛 테스트(`apps/web/test/session-guide.test.ts`)는 **문장이 엔진과 이어져 있는지**를 본다.
 * 여기서 보는 것은 다르다 — **그게 화면에 실제로 떴는가**, 그리고
 * **떠서는 안 되는 사람에게는 안 떴는가**. 조건부 렌더는 조용히 사라져도 아무도 모른다.
 */

/** '잘 모르겠어요' — 쉬지 않고 20분 */
const NOVICE = {
  d: weeksFromToday(16),
  m: DISTANCE['10K'],
  t: todayKst(),
  f: [2, 20] as [2, number],
  g: [1] as [1],
  w: 4 as const,
};

/** 10K 45분 — 최근 대회 기록이 있는 사람 */
const EXPERIENCED = {
  d: weeksFromToday(16),
  m: DISTANCE['10K'],
  t: todayKst(),
  f: [0, DISTANCE['10K'], 2700] as [0, number, number],
  g: [0, 2580] as [0, number],
  w: 4 as const,
};

test.describe('세션 수행 가이드 (입문자)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('입문자 플랜에는 세션을 어떻게 뛰는지가 나온다', async ({ page }) => {
    await page.goto(resultUrl(NOVICE));

    const guide = page.getByRole('main').getByText('세션을 어떻게 뛰나요');
    await expect(guide).toBeVisible();

    // 주 3~4일 입문자 플랜에 반드시 있는 두 가지
    await expect(page.getByRole('main').getByText('EASY RUN', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('LONG RUN', { exact: true })).toBeVisible();

    // 강도를 숫자가 아니라 느낌으로 말한다 — 숫자는 엔진 몫이다
    await expect(page.getByText('옆 사람과 대화가 되는 속도')).toBeVisible();
  });

  test('경험자 플랜에는 나오지 않는다 — §7.8 존을 접는 기준과 같다', async ({ page }) => {
    await page.goto(resultUrl(EXPERIENCED));

    // 플랜 자체는 정상으로 떠 있어야 한다. 그래야 '가이드만 없다'가 의미를 갖는다
    await expect(page.getByRole('heading', { name: '주차별 플랜' })).toBeVisible();
    await expect(page.getByText('세션을 어떻게 뛰나요')).toHaveCount(0);
  });

  test('structure 에 뜬 용어를 그 화면에서 설명한다', async ({ page }) => {
    await page.goto(resultUrl(NOVICE));

    /*
     * §7.8 은 입문자에게 존을 E·M 두 개만 노출하기로 했는데, 정작 첫 주 첫 세션에
     * `이지런 후 스트라이드 20초 × 4` 가 그대로 나오고 있었다. 존 배지는 가려 놓고
     * 용어는 통과시키니 읽고도 모르는 상태였다. 그 구멍을 지킨다.
     */
    const main = page.getByRole('main');
    await expect(main.getByText(/스트라이드/).first()).toBeVisible();
    await expect(page.getByText(/전력질주가 아니라/)).toBeVisible();
  });

  test('이 플랜에 없는 세션은 설명하지 않는다', async ({ page }) => {
    await page.goto(resultUrl(NOVICE));

    const guide = page.getByRole('main');
    await expect(guide.getByText('이 플랜에 나오는 훈련만 모았습니다')).toBeVisible();

    /*
     * 가이드가 말하는 종류는 주차 아코디언에 실제로 있는 것이어야 한다.
     * 여기서 엔진을 다시 계산하지 않는다 — 화면에 뜬 것끼리 대조할 뿐이다.
     */
    const headings = await guide.locator('li p.font-bold').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    // 휴식은 '수행 방법'이 궁금한 세션이 아니라 일부러 뺐다
    expect(headings).not.toContain('REST');
  });

  test('가이드가 판정·안전 고지를 밀어내지 않는다', async ({ page }) => {
    await page.goto(resultUrl(NOVICE));

    /*
     * §7.10 고정 고지는 가이드가 생겨도 그대로 있어야 한다.
     * `main` 으로 좁힌다 — 푸터에도 같은 취지의 문장이 있어서 페이지 전체로 잡으면
     * 둘이 걸려 strict mode 에서 터진다. 여기서 보려는 것은 **플랜 화면의** 고지다.
     */
    await expect(page.getByRole('main').getByText(/의학적 조언이 아닙니다/)).toBeVisible();

    /*
     * 페이스표가 여전히 **먼저**다. 가이드는 페이스표를 본 다음에 오는 질문
     * ('그래서 이걸 어떻게 뛰나')에 답하는 자리라 순서가 뒤집히면 뜻이 달라진다.
     * `exact` 를 주는 이유는 표의 sr-only 캡션('훈련 존별 목표 페이스 …')도 같이 걸려서다.
     */
    const labels = await page
      .getByRole('main')
      .getByText(/^(목표 페이스|세션을 어떻게 뛰나요)$/)
      .allTextContents();
    expect(labels).toEqual(['목표 페이스', '세션을 어떻게 뛰나요']);
  });
});
