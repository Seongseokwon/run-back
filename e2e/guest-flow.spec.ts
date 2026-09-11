import { expect, test } from '@playwright/test';
import {
  DISTANCE,
  VERDICT_BADGE,
  passFitnessStep,
  passRaceStep,
  resultUrl,
  todayKst,
  weeksFromToday,
} from './helpers';

/**
 * QA 시트 §1 — 게스트 흐름.
 *
 * **이 제품의 주 동선이다** (PRD §9.2). 로그인 벽을 앞에 세우면 핵심 지표가 죽는다는
 * 판단 위에 서 있는 화면들이라, 여기가 깨지면 나머지는 볼 필요가 없다.
 *
 * 모든 테스트가 쿠키 없는 상태에서 시작한다 — 로그인 상태로 확인하면
 * 게스트에게만 보이는 것(링크 복사·로그인 유도)을 못 본다.
 */

test.describe('§1 게스트 흐름', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('1-1·1-2 대회를 검색해 고르고 종목을 선택한다 (F-01)', async ({ page }) => {
    await page.goto('/plan/new');
    await page.getByLabel('대회 검색').fill('서울');

    const rows = page.locator('li button');
    await expect(rows.first()).toBeVisible();
    // 검색어가 이름이나 지역에 실제로 걸려 있어야 한다
    for (const text of await rows.allTextContents()) {
      expect(text).toMatch(/서울/);
    }

    await rows.first().click();
    await expect(page.getByText('어느 종목에 나가시나요?')).toBeVisible();

    // 그 대회가 실제로 여는 종목만 뜬다
    const distances = page.getByRole('button', { name: /^(5K|10K|하프|풀코스)$/ });
    const count = await distances.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(4);

    // 종목까지 골라야 다음으로 간다
    const next = page.getByRole('button', { name: '다음' });
    await expect(next).toBeDisabled();
    await distances.first().click();
    await expect(next).toBeEnabled();
  });

  test('1-3 대회를 고르지 않고 날짜만 넣어도 진행된다 (F-01 폴백)', async ({ page }) => {
    await page.goto('/plan/new');
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();

    await page.locator('input[type="date"]').fill(weeksFromToday(12));
    // 대회를 안 골랐으면 4종목이 전부 열린다
    await expect(page.getByRole('button', { name: /^(5K|10K|하프|풀코스)$/ })).toHaveCount(4);

    await page.getByRole('button', { name: '하프', exact: true }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.getByText('지금 실력이 어느 정도인가요?')).toBeVisible();
  });

  test('1-4 과거 날짜로는 진행할 수 없다', async ({ page }) => {
    await page.goto('/plan/new');
    await page.locator('input[type="date"]').fill('2020-01-01');

    const distances = page.getByRole('button', { name: /^(5K|10K|하프|풀코스)$/ });
    if ((await distances.count()) > 0) await distances.first().click();
    // 역산할 기간이 없는 날짜다
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  test('1-5 실력 입력 3경로가 전부 다음 단계로 간다 (F-02)', async ({ page }) => {
    const paths: { choice: RegExp; fill: () => Promise<void> }[] = [
      {
        choice: /최근 대회 기록이 있어요/,
        fill: async () => {
          await page.getByRole('radio', { name: '10K', exact: true }).click();
          await page.getByLabel('기록', { exact: true }).fill('50:00');
        },
      },
      {
        choice: /편하게 뛰는 페이스를 알아요/,
        fill: async () => {
          await page.getByLabel('편하게 뛸 때 페이스').fill('6:00');
          await page.getByLabel('요즘 주간 거리').fill('30');
        },
      },
      {
        choice: /잘 모르겠어요/,
        fill: async () => {
          await page.getByLabel('쉬지 않고 몇 분 정도 뛸 수 있나요?').fill('20');
        },
      },
    ];

    for (const path of paths) {
      await passRaceStep(page);
      await page.getByRole('radio', { name: path.choice }).click();
      await path.fill();

      const next = page.getByRole('button', { name: '다음' });
      await expect(next, `${path.choice} 에서 다음이 잠겨 있다`).toBeEnabled();
      await next.click();
      await expect(page.getByText('목표와 훈련 가능 일수')).toBeVisible();
    }
  });

  test('1-6·1-7 기록 입력 형식을 관대하게 받고 빈 값은 막는다', async ({ page }) => {
    await passRaceStep(page);
    await page.getByRole('radio', { name: /최근 대회 기록이 있어요/ }).click();
    await page.getByRole('radio', { name: '10K', exact: true }).click();

    const time = page.getByLabel('기록', { exact: true });
    const next = page.getByRole('button', { name: '다음' });

    // 사용자는 콜론을 빼고 치기도 하고 시간까지 넣기도 한다. 입력에서 사람을 이기지 않는다
    for (const value of ['5000', '50:00', '1:50:00']) {
      await time.fill(value);
      await expect(next, `${value} 를 해석하지 못했다`).toBeEnabled();
    }

    await time.fill('');
    await expect(next).toBeDisabled();
  });

  test('1-8~1-10 3스텝을 끝까지 걸어 판정과 결과에 도달한다 (F-03~F-06)', async ({ page }) => {
    await passRaceStep(page, { weeks: 14, distance: '하프' });
    await passFitnessStep(page);

    await page.getByRole('radio', { name: '기록이 목표' }).click();
    await page.getByLabel('목표 기록').fill('1:55:00');
    await page.getByRole('button', { name: '주 4일' }).click();
    await page.getByRole('button', { name: '플랜 만들기' }).click();

    // 판정 — 배지와 근거 문장이 함께 (F-04)
    await expect(page).toHaveURL(/\/plan\/verdict\?p=/);
    await expect(page.getByText(VERDICT_BADGE).first()).toBeVisible();
    await expect(page.locator('ul li').first()).not.toBeEmpty();

    // 결과 (F-05·F-06)
    await page.getByRole('link', { name: /플랜 보기|플랜으로 시작하기/ }).first().click();
    await expect(page).toHaveURL(/\/plan\/result\?p=/);
    // '11주차'와 겹치지 않게 앞에서 끊는다
    await expect(page.getByRole('button', { name: /^1주차/ })).toBeVisible();
  });

  test('1-11 페이스표에 5개 존이 범위로 나온다 (F-07)', async ({ page }) => {
    await page.goto(
      resultUrl({
        d: weeksFromToday(20),
        m: DISTANCE.HALF,
        t: todayKst(),
        f: [0, 10000, 3000],
        g: [0, 6900],
        w: 4,
        k: 30,
      }),
    );

    for (const zone of ['E', 'M', 'T', 'I', 'R']) {
      await expect(page.getByRole('rowheader', { name: new RegExp(`^${zone} ·`) })).toBeVisible();
    }
    // 근거 없는 정밀도를 주지 않는다 — 값은 범위다 (§7.2)
    await expect(page.getByText(/\d+:\d{2}~\d+:\d{2}/).first()).toBeVisible();
  });

  test('1-12 입문자 입력이면 E·M 두 개만 보인다 (O4)', async ({ page }) => {
    await page.goto(
      resultUrl({ d: weeksFromToday(20), m: DISTANCE.HALF, t: todayKst(), f: [2, 20], g: [1], w: 3 }),
    );

    await expect(page.getByRole('rowheader', { name: /^E ·/ })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: /^M ·/ })).toBeVisible();
    for (const zone of ['T', 'I', 'R']) {
      await expect(page.getByRole('rowheader', { name: new RegExp(`^${zone} ·`) })).toHaveCount(0);
    }
  });

  test('1-13 링크만으로 같은 플랜이 복원된다 (F-08)', async ({ page, context }) => {
    const url = resultUrl({
      d: weeksFromToday(16),
      m: DISTANCE.FULL,
      t: todayKst(),
      f: [0, 21097.5, 6900],
      g: [0, 14400],
      w: 5,
      k: 45,
    });

    await page.goto(url);
    const first = await page.locator('main').innerText();
    expect(first.length).toBeGreaterThan(200);

    // 쿠키·저장소가 전부 빈 새 창에서도 같아야 한다 — URL 이 곧 상태다
    const fresh = await context.browser()!.newContext();
    const other = await fresh.newPage();
    await other.goto(new URL(url, page.url()).toString());
    expect(await other.locator('main').innerText()).toBe(first);
    await fresh.close();
  });

  test('1-14 깨진 URL 로는 플랜을 만들지 않는다', async ({ page }) => {
    await page.goto('/plan/result?p=eyJkIjoiMjAyNw');
    await expect(page.getByText('플랜 정보를 읽을 수 없습니다')).toBeVisible();
    await expect(page.getByRole('link', { name: '플랜 만들기' }).first()).toBeVisible();
  });

  test('1-15 안전 고지가 결과 화면에 있다 (F-10)', async ({ page }) => {
    await page.goto(
      resultUrl({ d: weeksFromToday(12), m: DISTANCE.HALF, t: todayKst(), f: [0, 10000, 3000], g: [1], w: 4, k: 30 }),
    );
    await expect(page.getByText(/의학적 조언이 아닙니다/).first()).toBeVisible();
  });

  test('1-16 캘린더 내보내기가 휴식일 없는 .ics 를 준다 (F-11)', async ({ page, request }) => {
    await page.goto(
      resultUrl({
        d: weeksFromToday(12),
        m: DISTANCE.HALF,
        t: todayKst(),
        f: [0, 10000, 3000],
        g: [0, 6900],
        w: 4,
        k: 30,
      }),
    );

    const href = await page.getByRole('link', { name: /캘린더에 훈련 일정 추가/ }).getAttribute('href');
    expect(href).toBeTruthy();

    const res = await request.get(new URL(href!, page.url()).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/calendar');
    // 개인 훈련 일정이다. 공용 캐시에 남으면 안 된다
    expect(res.headers()['cache-control']).toContain('no-store');

    const ics = await res.text();
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).not.toContain('휴식');
    // 남의 캘린더에 알림을 심지 않는다
    expect(ics).not.toContain('BEGIN:VALARM');
  });

  test('1-17 같은 플랜을 두 번 받아도 UID 가 같다 (일정 중복 방지)', async ({ page, request }) => {
    await page.goto(
      resultUrl({
        d: weeksFromToday(12),
        m: DISTANCE.HALF,
        t: todayKst(),
        f: [0, 10000, 3000],
        g: [0, 6900],
        w: 4,
        k: 30,
      }),
    );
    const href = new URL(
      (await page.getByRole('link', { name: /캘린더에 훈련 일정 추가/ }).getAttribute('href'))!,
      page.url(),
    ).toString();

    const uids = async (): Promise<string[]> =>
      (await (await request.get(href)).text()).split('\r\n').filter((l) => l.startsWith('UID:'));

    const first = await uids();
    expect(first.length).toBeGreaterThan(0);
    expect(await uids()).toEqual(first);
  });

  test('1-18 클램프가 걸리면 화면이 알린다 (§7.10)', async ({ page }) => {
    // 주 5km 에서 풀코스 — 볼륨 곡선이 ACWR 1.30 에 반드시 걸린다
    await page.goto(
      resultUrl({ d: weeksFromToday(30), m: DISTANCE.FULL, t: todayKst(), f: [1, 420, 5], g: [1], w: 4, k: 5 }),
    );

    // 조용히 줄이지 않는다 (§4.7) — notices 든 주차 배지든 하나로는 반드시 보여야 한다
    const told = await page.getByText(/안전|조정|줄였|천천히|늘리지|권장/).count();
    expect(told, '플랜이 약해졌는데 화면이 아무 말도 하지 않는다').toBeGreaterThan(0);
  });
});
