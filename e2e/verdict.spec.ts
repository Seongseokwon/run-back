import { expect, test } from '@playwright/test';
import { DISTANCE, readVerdict, todayKst, verdictUrl, weeksFromToday } from './helpers';

/**
 * QA 시트 §2 — 판정 화면 (PRD §7.3 · §10.4).
 *
 * 2026-09-10·11 에 두 번 고친 자리다. 고친 것이 전부 **같은 모양의 결함**이었다 —
 * 달력·볼륨 규칙이나 입력값이 **실제 판정·실제 목표를 덮어쓰는** 것.
 * 그래서 여기 있는 케이스는 전부 회귀 감시용이고, 하나라도 뒤집히면 그 자체가 버그다.
 */

const T = todayKst();

test.describe('§2 판정 화면', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('2-1 🟢 이면 상향 목표를 하나 제안한다', async ({ page }) => {
    // 하프 1:50 러너가 20주에 1:50 — 여유가 있다
    await page.goto(
      verdictUrl({ d: weeksFromToday(20), m: DISTANCE.HALF, t: T, f: [0, 21097.5, 6600], g: [0, 6600], w: 4, k: 40 }),
    );

    expect(await readVerdict(page)).toBe('안정권');
    await expect(page.getByRole('heading', { name: '목표를 높여 볼까요?' })).toBeVisible();
    await expect(page.getByText('같은 기간에 노려볼 만한 기록')).toBeVisible();
    await expect(page.getByRole('link', { name: '이 플랜으로 시작하기' })).toBeVisible();
  });

  test('2-2 완충 1.15 — capacity 를 살짝 넘어도 🔴 이 아니다', async ({ page }) => {
    /*
     * 하프 1:50 러너 · 14주 · 목표 1:45:30. gap/capacity 가 1.04 로 **capacity 를 넘는데**
     * 도전적이어야 한다. capacity 는 ADR-0002 가 안전계수 0.5 를 이미 곱해 둔 보수적
     * 추정이라, 몇 초 넘겼다고 '불가능'이라 하면 모델보다 판정이 더 단정적이게 된다.
     *
     * 경계 자체의 정확도는 엔진 테스트가 본다 — 여기서는 **화면에 뜨는 판정**만 본다.
     */
    await page.goto(
      verdictUrl({ d: weeksFromToday(14), m: DISTANCE.HALF, t: T, f: [0, 21097.5, 6600], g: [0, 6330], w: 4, k: 40 }),
    );
    expect(await readVerdict(page), '완충이 사라졌다 (§7.3)').toBe('도전적');
  });

  test('2-3 🔴 + 기록 목표 — 대안 기록과 완주 전환을 준다', async ({ page }) => {
    // 10K 60분 러너가 12주에 하프 1:20
    await page.goto(
      verdictUrl({ d: weeksFromToday(12), m: DISTANCE.HALF, t: T, f: [0, 10000, 3600], g: [0, 4800], w: 4, k: 30 }),
    );

    expect(await readVerdict(page)).toBe('비현실적');
    await expect(page.getByRole('heading', { name: '이 기간에 현실적인 목표' })).toBeVisible();
    await expect(page.getByRole('link', { name: /완주 목표로 바꾸기/ })).toBeVisible();
    await expect(page.getByRole('link', { name: '그래도 이 목표로 플랜 보기' })).toBeVisible();
  });

  test('2-4 🔴 + 완주 목표 — 대안 기록을 그리지 않는다', async ({ page }) => {
    // 주 10km 입문자가 5주에 하프 완주
    await page.goto(
      verdictUrl({ d: weeksFromToday(5), m: DISTANCE.HALF, t: T, f: [1, 420, 10], g: [1], w: 3, k: 10 }),
    );

    expect(await readVerdict(page)).toBe('비현실적');
    await expect(page.getByRole('heading', { name: '무엇을 바꿀 수 있나요' })).toBeVisible();
    await expect(page.getByRole('link', { name: '입력 바꿔서 다시 보기' })).toBeVisible();
    // "완주가 어렵다"고 말한 화면에서 기록을 권하면 모순이다
    await expect(page.getByRole('heading', { name: '이 기간에 현실적인 목표' })).toHaveCount(0);
    await expect(page.getByText('현실적으로 노려볼 기록')).toHaveCount(0);
  });

  test('2-5 풀코스 기간 미달 — 빠져나갈 수 없는 고리가 없다', async ({ page }) => {
    /*
     * 엔진이 §7.3 에서 기록 목표를 완주로 바꿔 버리는 케이스다.
     * 화면이 `req.input.goal` 을 보면 "완주로 전환했습니다"라고 말해 놓고
     * 바로 아래에서 대안 기록을 권하고, 그걸 누르면 같은 🔴 로 돌아온다.
     */
    await page.goto(
      verdictUrl({ d: weeksFromToday(7), m: DISTANCE.FULL, t: T, f: [0, 10000, 3600], g: [0, 10800], w: 4, k: 25 }),
    );

    expect(await readVerdict(page)).toBe('비현실적');
    await expect(page.getByText(/완주 목표로 전환했습니다/)).toBeVisible();

    // 전환했다고 말했으면 화면도 완주 동선이어야 한다
    await expect(page.getByText('현실적으로 노려볼 기록')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '이 기간에 현실적인 목표' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '입력 바꿔서 다시 보기' })).toBeVisible();
  });

  test('2-6 빠져나가는 길의 문구가 지금 목표를 가리킨다', async ({ page }) => {
    await page.goto(
      verdictUrl({ d: weeksFromToday(7), m: DISTANCE.FULL, t: T, f: [0, 10000, 3600], g: [0, 10800], w: 4, k: 25 }),
    );
    // 한때 "그래도 원래 목표로" 로 고정돼 있어 완주 전환 뒤 사실과 달랐다
    await expect(page.getByRole('link', { name: '그래도 완주 목표로 플랜 보기' })).toBeVisible();
    await expect(page.getByText(/원래 목표로/)).toHaveCount(0);
  });

  test('2-7 지구력이 되면 기간이 짧아도 🔴 이 아니다', async ({ page }) => {
    // 하프 1:25 러너 · 풀 6주 · 목표 3:20 — 달력만 보면 🔴 이던 케이스
    await page.goto(
      verdictUrl({ d: weeksFromToday(6), m: DISTANCE.FULL, t: T, f: [0, 21097.5, 5100], g: [0, 12000], w: 5, k: 70 }),
    );
    expect(await readVerdict(page), '달력 규칙이 실력을 덮어쓰고 있다').not.toBe('비현실적');
  });

  test('2-8 속도만 빠르고 거리를 못 뛰면 🟢 을 주지 않는다', async ({ page }) => {
    // 10K 는 빠른데 주 10km — 풀코스를 견딜 몸이 아니다 (§7.3 지구력 게이트)
    await page.goto(
      verdictUrl({ d: weeksFromToday(20), m: DISTANCE.FULL, t: T, f: [0, 10000, 2280], g: [0, 11400], w: 4, k: 10 }),
    );
    expect(await readVerdict(page)).toBe('비현실적');
  });

  test('2-9 더 쉬운 완주 목표가 기록 목표보다 나쁜 판정을 받지 않는다', async ({ page }) => {
    const base = { d: weeksFromToday(5), m: DISTANCE.HALF, t: T, f: [0, 10000, 2700] as [0, number, number], w: 4, k: 35 };
    const rank = { 안정권: 0, 도전적: 1, 비현실적: 2 } as const;

    await page.goto(verdictUrl({ ...base, g: [0, 6300] }));
    const timeVerdict = await readVerdict(page);

    await page.goto(verdictUrl({ ...base, g: [1] }));
    const finishVerdict = await readVerdict(page);

    expect(
      rank[finishVerdict],
      `완주(${finishVerdict})가 기록 목표(${timeVerdict})보다 나쁘게 판정됐다`,
    ).toBeLessThanOrEqual(rank[timeVerdict]);
  });

  test('2-10 🔴 에서도 빠져나가는 길이 버튼 모양으로 보인다', async ({ page }) => {
    await page.goto(
      verdictUrl({ d: weeksFromToday(12), m: DISTANCE.HALF, t: T, f: [0, 10000, 3600], g: [0, 4800], w: 4, k: 30 }),
    );

    const escape = page.getByRole('link', { name: '그래도 이 목표로 플랜 보기' });
    const box = await escape.boundingBox();
    // 밑줄 텍스트 하나가 아니라 누를 수 있는 것으로 읽혀야 한다
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByText('플랜은 만들어지지만 권장하지 않습니다')).toBeVisible();

    await escape.click();
    await expect(page).toHaveURL(/\/plan\/result\?p=/);
  });

  test('대안 기록을 고르면 목표가 실제로 바뀐다', async ({ page }) => {
    await page.goto(
      verdictUrl({ d: weeksFromToday(12), m: DISTANCE.HALF, t: T, f: [0, 10000, 3600], g: [0, 4800], w: 4, k: 30 }),
    );
    const before = page.url();

    await page.locator('main').getByText(/도전적으로 잡으면|현실적으로 노려볼 기록/).first().click();
    await expect(page).not.toHaveURL(before);
    // 고른 대안이 제 몫을 해서 판정이 나아져야 한다
    expect(await readVerdict(page)).not.toBe('비현실적');
  });
});
