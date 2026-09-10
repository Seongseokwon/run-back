/**
 * 계측 이벤트 정의 — PRD §15 측정 계획.
 *
 * 이 파일은 **순수 타입/상수**다. 전송은 `analytics.ts` 가 한다.
 * 이벤트 이름과 속성을 한 곳에 못 박아 두는 이유: 이름이 화면마다 조금씩 달라지면
 * 대시보드에서 같은 행동이 여러 줄로 갈라진다. 그러면 코호트가 깨진다.
 *
 * ## 무엇을 보내지 않는가
 *
 * **사용자 식별자를 보내지 않는다.** GA4 의 `user_id` 를 쓰면 우리 내부 id 가
 * 구글로 넘어간다 — §9.4 수집 최소화와 어긋나고 국외 이전 항목이 하나 더 는다.
 * '게스트 vs 로그인 재방문 곡선'(§15 대시보드 2순위)은 `logged_in` 불리언 하나로 충분하다.
 *
 * **플랜 입력값 원본을 보내지 않는다.** 목표 기록·주간 거리는 그 사람의 훈련 정보다.
 * 판정에 필요한 만큼만 구간화해서 보낸다 (거리 종목, 주차 수, 판정 결과).
 */

/** PRD §15 의 이벤트 이름. 여기 없는 이름을 쓰지 않는다 */
export const EVENTS = {
  planStart: 'plan_start',
  fitnessInput: 'fitness_input',
  verdictShown: 'verdict_shown',
  goalAdjusted: 'goal_adjusted',
  planGenerated: 'plan_generated',
  planSaved: 'plan_saved',
  planRevisit: 'plan_revisit',
  weekChecked: 'week_checked',
  loginPrompted: 'login_prompted',
  loginCompleted: 'login_completed',
  loginDismissed: 'login_dismissed',
  planMigrated: 'plan_migrated',
  accountDeleted: 'account_deleted',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** GA4 는 중첩 객체를 받지 않는다. 평평한 값만 */
export type EventParams = Record<string, string | number | boolean | undefined>;

/** 거리를 종목 이름으로. 원본 미터를 그대로 보내면 대시보드에서 묶이지 않는다 */
export function distanceLabel(distanceM: number): string {
  if (distanceM === 5000) return '5k';
  if (distanceM === 10000) return '10k';
  if (distanceM === 21097.5) return 'half';
  if (distanceM === 42195) return 'full';
  return 'other';
}

/**
 * 경과일을 구간으로. §15 대시보드 1순위가 D+1/D+3/D+7/D+14 코호트라
 * 그 경계에 맞춰 자른다. 날짜 원본을 보내면 구간을 대시보드에서 다시 만들어야 한다.
 */
export function elapsedBucket(days: number): string {
  if (days <= 0) return 'd0';
  if (days === 1) return 'd1';
  if (days <= 3) return 'd2_3';
  if (days <= 7) return 'd4_7';
  if (days <= 14) return 'd8_14';
  if (days <= 30) return 'd15_30';
  return 'd31_plus';
}
