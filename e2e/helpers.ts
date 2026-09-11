import { expect, type Page } from '@playwright/test';

/**
 * QA 시트를 자동화할 때 쓰는 공용 조각.
 *
 * ⚠️ 여기서 **플랜을 계산하지 않는다.** 기대값을 테스트가 직접 계산하면
 * 엔진의 버그를 그대로 베껴 쓰게 된다. 엔진 결과의 정합은 `npm test` 가 보고,
 * 여기서는 **화면이 그 결과를 제대로 보여 주는가**만 본다.
 */

/** 판정 화면·결과 화면으로 바로 가는 인코딩된 입력 (§4.2 URL 복원) */
export function encodePlan(packed: {
  d: string;
  m: number;
  t: string;
  f: [0, number, number] | [1, number, number] | [2, number];
  g: [0, number] | [1];
  w: 3 | 4 | 5 | 6;
  k?: number;
  r?: string;
}): string {
  return Buffer.from(JSON.stringify(packed))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

/** 오늘(KST). 플랜 입력의 `today` 는 '그날 기준 역산'이라 고정하지 않는다 */
export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 오늘로부터 n주 뒤 (대회일 만들기용) */
export function weeksFromToday(weeks: number): string {
  return new Date(Date.now() + 9 * 3600_000 + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}

export const DISTANCE = { '5K': 5000, '10K': 10000, HALF: 21097.5, FULL: 42195 } as const;

export function verdictUrl(packed: Parameters<typeof encodePlan>[0]): string {
  return `/plan/verdict?p=${encodePlan(packed)}`;
}

export function resultUrl(packed: Parameters<typeof encodePlan>[0]): string {
  return `/plan/result?p=${encodePlan(packed)}`;
}

/**
 * 화면에 뜬 판정 배지 (§10.4). 색이 아니라 **글자**로 읽는다 (WCAG 1.4.1).
 *
 * ⚠️ `[🟢🟡🔴]` 같은 문자 클래스를 쓰지 말 것. 이모지는 서로게이트 쌍이라
 * `u` 플래그 없는 문자 클래스는 **반쪽 코드 유닛**으로 쪼개진다 — 아무것도 안 잡힌다.
 */
export const VERDICT_BADGE = /(🟢|🟡|🔴)\s(안정권|도전적|비현실적)/u;

export async function readVerdict(page: Page): Promise<'안정권' | '도전적' | '비현실적'> {
  const badge = page.getByText(VERDICT_BADGE).first();
  await expect(badge).toBeVisible();
  const text = (await badge.textContent()) ?? '';
  const match = /안정권|도전적|비현실적/.exec(text);
  if (!match) throw new Error(`판정 배지를 읽지 못했다: ${text}`);
  return match[0] as '안정권' | '도전적' | '비현실적';
}

/**
 * 이메일+비밀번호 로그인 (§9.3 예외 경로).
 * 카카오는 외부 동의 화면이라 E2E 에서 자동화하지 않는다.
 */
export async function signIn(page: Page, email: string, password: string, callbackUrl?: string): Promise<void> {
  await page.goto(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
  // 이메일 폼은 <details> 로 접혀 있다 — 카카오가 주 버튼이기 때문 (§10.7)
  const summary = page.locator('summary').first();
  if (await summary.isVisible()) await summary.click();
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  // '카카오로 로그인'·'이메일로 로그인'과 겹치지 않게 정확히 일치시킨다
  await page.getByRole('button', { name: '로그인', exact: true }).click();

  /*
   * 결과가 나올 때까지 기다린다 — **성공(이동)이든 실패(경고 문구)든 먼저 오는 쪽**.
   *
   * 이동만 기다리면 실패 경로에서 타임아웃을 통째로 소모한다(테스트가 그것 때문에 죽었다).
   * 반대로 안 기다리면 진행 중인 이동을 다음 `goto` 가 덮어써서 `net::ERR_ABORTED` 가 난다 —
   * 화면에서는 "로그인이 안 됐다"로 보이는데 실제로는 되던 중이었다.
   */
  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }).catch(() => {}),
    page.locator('form').getByRole('alert').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
  ]);
}

/** 세션 쿠키를 지운다. 게스트 경로는 반드시 이 상태에서 본다 (§9.2) */
export async function signOutViaCookies(page: Page): Promise<void> {
  await page.context().clearCookies();
}

/**
 * 위저드 1스텝(대회·종목)을 통과시킨다.
 *
 * 날짜만 넣어서는 넘어가지 않는다 — `step1Ready` 가 **종목까지** 요구한다.
 * 이 순서를 테스트마다 다시 쓰면 위저드가 바뀔 때 전부 고쳐야 한다.
 */
export async function passRaceStep(
  page: Page,
  opts: { weeks?: number; distance?: '5K' | '10K' | '하프' | '풀코스' } = {},
): Promise<void> {
  const { weeks = 12, distance = '하프' } = opts;
  await page.goto('/plan/new');
  await page.locator('input[type="date"]').fill(weeksFromToday(weeks));
  await page.getByRole('button', { name: distance, exact: true }).click();
  await page.getByRole('button', { name: '다음' }).click();
}

/** 위저드 2스텝(실력)을 '최근 대회 기록' 경로로 통과시킨다 */
export async function passFitnessStep(page: Page, distance = '10K', time = '50:00'): Promise<void> {
  await page.getByRole('radio', { name: new RegExp('최근 대회 기록이 있어요') }).click();
  await page.getByRole('radio', { name: distance, exact: true }).click();
  await page.getByLabel('기록', { exact: true }).fill(time);
  await page.getByRole('button', { name: '다음' }).click();
}
